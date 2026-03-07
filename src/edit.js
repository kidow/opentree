const path = require("node:path");
const { CONFIG_FILE_NAME } = require("./init");
const { loadConfig, saveConfig, validateConfig } = require("./config");

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function parseInteger(value, label) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${label} must be a positive integer.`);
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

function parseProfileArgs(args) {
  const updates = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = args[index + 1];

    if (arg === "--name") {
      if (nextValue === undefined) {
        throw new Error("missing value for --name");
      }

      updates.name = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--bio") {
      if (nextValue === undefined) {
        throw new Error("missing value for --bio");
      }

      updates.bio = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--avatar-url") {
      if (nextValue === undefined) {
        throw new Error("missing value for --avatar-url");
      }

      updates.avatarUrl = nextValue;
      index += 1;
      continue;
    }

    throw new Error(`unknown option: ${arg}`);
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("provide at least one of --name, --bio, or --avatar-url");
  }

  return updates;
}

function parseLinkAddArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = args[index + 1];

    if (arg === "--title") {
      if (nextValue === undefined) {
        throw new Error("missing value for --title");
      }

      options.title = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--url") {
      if (nextValue === undefined) {
        throw new Error("missing value for --url");
      }

      options.url = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--index") {
      if (nextValue === undefined) {
        throw new Error("missing value for --index");
      }

      options.index = parseInteger(nextValue, "--index");
      index += 1;
      continue;
    }

    throw new Error(`unknown option: ${arg}`);
  }

  if (options.title === undefined) {
    throw new Error("missing required option --title");
  }

  if (options.url === undefined) {
    throw new Error("missing required option --url");
  }

  return options;
}

function parseLinkRemoveArgs(args) {
  if (args.length === 0) {
    throw new Error("missing required option --index");
  }

  if (args.length !== 2 || args[0] !== "--index") {
    throw new Error("usage: opentree link remove --index <number>");
  }

  return {
    index: parseInteger(args[1], "--index")
  };
}

function parseLinkUpdateArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = args[index + 1];

    if (arg === "--index") {
      if (nextValue === undefined) {
        throw new Error("missing value for --index");
      }

      options.index = parseInteger(nextValue, "--index");
      index += 1;
      continue;
    }

    if (arg === "--title") {
      if (nextValue === undefined) {
        throw new Error("missing value for --title");
      }

      options.title = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--url") {
      if (nextValue === undefined) {
        throw new Error("missing value for --url");
      }

      options.url = nextValue;
      index += 1;
      continue;
    }

    throw new Error(`unknown option: ${arg}`);
  }

  if (options.index === undefined) {
    throw new Error("missing required option --index");
  }

  if (options.title === undefined && options.url === undefined) {
    throw new Error("provide at least one of --title or --url");
  }

  return options;
}

function parseLinkMoveArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = args[index + 1];

    if (arg === "--from") {
      if (nextValue === undefined) {
        throw new Error("missing value for --from");
      }

      options.from = parseInteger(nextValue, "--from");
      index += 1;
      continue;
    }

    if (arg === "--to") {
      if (nextValue === undefined) {
        throw new Error("missing value for --to");
      }

      options.to = parseInteger(nextValue, "--to");
      index += 1;
      continue;
    }

    throw new Error(`unknown option: ${arg}`);
  }

  if (options.from === undefined) {
    throw new Error("missing required option --from");
  }

  if (options.to === undefined) {
    throw new Error("missing required option --to");
  }

  return options;
}

function parseThemeArgs(args) {
  const updates = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = args[index + 1];

    if (arg === "--accent-color") {
      if (nextValue === undefined) {
        throw new Error("missing value for --accent-color");
      }

      updates.accentColor = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--background-color") {
      if (nextValue === undefined) {
        throw new Error("missing value for --background-color");
      }

      updates.backgroundColor = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--text-color") {
      if (nextValue === undefined) {
        throw new Error("missing value for --text-color");
      }

      updates.textColor = nextValue;
      index += 1;
      continue;
    }

    throw new Error(`unknown option: ${arg}`);
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("provide at least one of --accent-color, --background-color, or --text-color");
  }

  return updates;
}

function parseSiteArgs(args) {
  if (args.length === 0) {
    throw new Error("missing required option --url");
  }

  if (args.length !== 2 || args[0] !== "--url") {
    throw new Error("usage: opentree site set --url <value>");
  }

  return {
    siteUrl: args[1]
  };
}

function parseMetaArgs(args) {
  const updates = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = args[index + 1];

    if (arg === "--title") {
      if (nextValue === undefined) {
        throw new Error("missing value for --title");
      }

      updates.title = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--description") {
      if (nextValue === undefined) {
        throw new Error("missing value for --description");
      }

      updates.description = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--og-image-url") {
      if (nextValue === undefined) {
        throw new Error("missing value for --og-image-url");
      }

      updates.ogImageUrl = nextValue;
      index += 1;
      continue;
    }

    throw new Error(`unknown option: ${arg}`);
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("provide at least one of --title, --description, or --og-image-url");
  }

  return updates;
}

function writeJsonReport(stdout, report) {
  stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function extractJsonFlag(args) {
  const filteredArgs = [];
  let json = false;

  args.forEach((arg) => {
    if (arg === "--json") {
      json = true;
      return;
    }

    filteredArgs.push(arg);
  });

  return {
    args: filteredArgs,
    json
  };
}

function createEditReport(cwd, command) {
  return {
    command,
    config: null,
    configPath: path.join(cwd, CONFIG_FILE_NAME),
    cwd,
    issues: [],
    message: "",
    ok: false,
    result: null,
    stage: "args"
  };
}

async function loadEditableConfigState(cwd = process.cwd(), loadConfigImpl = loadConfig) {
  try {
    return {
      ok: true,
      ...(await loadConfigImpl(cwd))
    };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {
        ok: false,
        kind: "missing",
        cwd
      };
    }

    if (error instanceof SyntaxError) {
      return {
        ok: false,
        kind: "invalid_json",
        cwd,
        message: error.message
      };
    }

    throw error;
  }
}

function writeLoadEditableConfigError(io, state) {
  const cwd = state.cwd ?? io.cwd ?? process.cwd();

  if (state.kind === "missing") {
    io.stderr.write(`[opentree] ${CONFIG_FILE_NAME} was not found in ${cwd}\n`);
    io.stderr.write("[opentree] run `opentree init` first to create a starter config\n");
    return;
  }

  if (state.kind === "invalid_json") {
    io.stderr.write(`[opentree] ${CONFIG_FILE_NAME} is not valid JSON\n`);
    io.stderr.write(`[opentree] ${state.message}\n`);
  }
}

async function loadEditableConfig(io) {
  const state = await loadEditableConfigState(io.cwd ?? process.cwd());

  if (!state.ok) {
    writeLoadEditableConfigError(io, state);
    return null;
  }

  return state;
}

function reportInvalidConfig(io, actionLabel, errors) {
  io.stderr.write(`[opentree] ${actionLabel} aborted because the config would be invalid\n`);
  errors.forEach((error) => {
    io.stderr.write(`- ${error}\n`);
  });
}

function emitEditFailure(io, report, json, message, issues = []) {
  report.message = message;
  report.issues = issues;

  if (json) {
    writeJsonReport(io.stdout ?? process.stdout, report);
  }

  return 1;
}

function emitEditSuccess(io, report, json, message, result, savedConfig) {
  report.ok = true;
  report.stage = "save";
  report.message = message;
  report.result = result;
  report.config = savedConfig.config;
  report.configPath = savedConfig.configPath;

  if (json) {
    writeJsonReport(io.stdout ?? process.stdout, report);
    return 0;
  }

  io.stdout.write(`[opentree] ${message}\n`);
  return 0;
}

function readLinks(config) {
  return Array.isArray(config.links) ? [...config.links] : [];
}

async function runProfileCommand(io, args = []) {
  const requestedJson = args.includes("--json");
  const [subcommand, ...restArgs] = args;
  const cwd = io.cwd ?? process.cwd();
  const report = createEditReport(cwd, "profile set");

  if (subcommand !== "set") {
    const message =
      "usage: opentree profile set [--name <value>] [--bio <value>] [--avatar-url <value>]";
    io.stderr.write(`[opentree] ${message}\n`);
    return emitEditFailure(io, report, requestedJson, message);
  }

  const { args: filteredArgs, json } = extractJsonFlag(restArgs);
  let updates;
  try {
    updates = parseProfileArgs(filteredArgs);
  } catch (error) {
    io.stderr.write(`[opentree] ${error.message}\n`);
    return emitEditFailure(io, report, json, error.message);
  }

  report.stage = "load";
  const loadedConfig = await loadEditableConfigState(cwd);
  if (!loadedConfig.ok) {
    writeLoadEditableConfigError(io, loadedConfig);
    const issues = loadedConfig.message ? [loadedConfig.message] : [];
    const message =
      loadedConfig.kind === "missing"
        ? `${CONFIG_FILE_NAME} was not found in ${cwd}`
        : `${CONFIG_FILE_NAME} is not valid JSON`;
    return emitEditFailure(io, report, json, message, issues);
  }

  const nextConfig = {
    ...loadedConfig.config,
    profile: {
      ...(isObject(loadedConfig.config.profile) ? loadedConfig.config.profile : {}),
      ...updates
    }
  };
  const errors = validateConfig(nextConfig);

  if (errors.length > 0) {
    report.stage = "validate";
    reportInvalidConfig(io, "profile update", errors);
    return emitEditFailure(io, report, json, "profile update aborted because the config would be invalid", errors);
  }

  const savedConfig = await saveConfig(cwd, nextConfig);

  return emitEditSuccess(
    io,
    report,
    json,
    `updated profile fields: ${Object.keys(updates).join(", ")}`,
    {
      fields: Object.keys(updates),
      profile: savedConfig.config.profile
    },
    savedConfig
  );
}

async function runLinkCommand(io, args = []) {
  const requestedJson = args.includes("--json");
  const [subcommand, ...restArgs] = args;
  const cwd = io.cwd ?? process.cwd();

  if (subcommand === "list") {
    const loadedConfig = await loadEditableConfig(io);
    if (!loadedConfig) {
      return 1;
    }

    const links = readLinks(loadedConfig.config);

    if (links.length === 0) {
      io.stdout.write("[opentree] no links found\n");
      return 0;
    }

    links.forEach((link, index) => {
      const title = isObject(link) && typeof link.title === "string" ? link.title : "(untitled)";
      const url = isObject(link) && typeof link.url === "string" ? link.url : "(missing url)";
      io.stdout.write(`${index + 1}. ${title} -> ${url}\n`);
    });
    return 0;
  }

  if (!subcommand) {
    const message =
      "usage: opentree link add --title <value> --url <value> [--index <number>]";
    io.stderr.write(`[opentree] ${message}\n`);
    io.stderr.write("[opentree]        opentree link list\n");
    io.stderr.write("[opentree]        opentree link update --index <number> [--title <value>] [--url <value>]\n");
    io.stderr.write("[opentree]        opentree link move --from <number> --to <number>\n");
    io.stderr.write("[opentree]        opentree link remove --index <number>\n");
    return emitEditFailure(io, createEditReport(cwd, "link"), requestedJson, message);
  }

  const report = createEditReport(cwd, `link ${subcommand}`);
  const { args: filteredArgs, json } = extractJsonFlag(restArgs);

  if (subcommand === "add") {
    let options;
    try {
      options = parseLinkAddArgs(filteredArgs);
    } catch (error) {
      io.stderr.write(`[opentree] ${error.message}\n`);
      return emitEditFailure(io, report, json, error.message);
    }

    report.stage = "load";
    const loadedConfig = await loadEditableConfigState(cwd);
    if (!loadedConfig.ok) {
      writeLoadEditableConfigError(io, loadedConfig);
      const issues = loadedConfig.message ? [loadedConfig.message] : [];
      const message =
        loadedConfig.kind === "missing"
          ? `${CONFIG_FILE_NAME} was not found in ${cwd}`
          : `${CONFIG_FILE_NAME} is not valid JSON`;
      return emitEditFailure(io, report, json, message, issues);
    }

    const links = readLinks(loadedConfig.config);
    const insertIndex = options.index === undefined ? links.length : options.index - 1;

    if (insertIndex < 0 || insertIndex > links.length) {
      const message = `--index must be between 1 and ${links.length + 1}`;
      io.stderr.write(`[opentree] ${message}\n`);
      return emitEditFailure(io, report, json, message);
    }

    links.splice(insertIndex, 0, {
      title: options.title,
      url: options.url
    });

    const nextConfig = {
      ...loadedConfig.config,
      links
    };
    const errors = validateConfig(nextConfig);

    if (errors.length > 0) {
      report.stage = "validate";
      reportInvalidConfig(io, "link add", errors);
      return emitEditFailure(io, report, json, "link add aborted because the config would be invalid", errors);
    }

    const savedConfig = await saveConfig(cwd, nextConfig);

    return emitEditSuccess(
      io,
      report,
      json,
      `added link #${insertIndex + 1}: ${options.title}`,
      {
        index: insertIndex + 1,
        link: savedConfig.config.links[insertIndex],
        linksCount: savedConfig.config.links.length
      },
      savedConfig
    );
  }

  if (subcommand === "update") {
    let options;
    try {
      options = parseLinkUpdateArgs(filteredArgs);
    } catch (error) {
      io.stderr.write(`[opentree] ${error.message}\n`);
      return emitEditFailure(io, report, json, error.message);
    }

    report.stage = "load";
    const loadedConfig = await loadEditableConfigState(cwd);
    if (!loadedConfig.ok) {
      writeLoadEditableConfigError(io, loadedConfig);
      const issues = loadedConfig.message ? [loadedConfig.message] : [];
      const message =
        loadedConfig.kind === "missing"
          ? `${CONFIG_FILE_NAME} was not found in ${cwd}`
          : `${CONFIG_FILE_NAME} is not valid JSON`;
      return emitEditFailure(io, report, json, message, issues);
    }

    const links = readLinks(loadedConfig.config);

    if (options.index > links.length) {
      const message = `--index must be between 1 and ${links.length}`;
      io.stderr.write(`[opentree] ${message}\n`);
      return emitEditFailure(io, report, json, message);
    }

    const currentLink = links[options.index - 1];
    if (!isObject(currentLink)) {
      const message = `link #${options.index} is not editable`;
      io.stderr.write(`[opentree] ${message}\n`);
      return emitEditFailure(io, report, json, message);
    }

    links[options.index - 1] = {
      ...currentLink,
      ...(options.title === undefined ? {} : { title: options.title }),
      ...(options.url === undefined ? {} : { url: options.url })
    };

    const nextConfig = {
      ...loadedConfig.config,
      links
    };
    const errors = validateConfig(nextConfig);

    if (errors.length > 0) {
      report.stage = "validate";
      reportInvalidConfig(io, "link update", errors);
      return emitEditFailure(io, report, json, "link update aborted because the config would be invalid", errors);
    }

    const savedConfig = await saveConfig(cwd, nextConfig);

    return emitEditSuccess(
      io,
      report,
      json,
      `updated link #${options.index}`,
      {
        fields: [
          ...(options.title === undefined ? [] : ["title"]),
          ...(options.url === undefined ? [] : ["url"])
        ],
        index: options.index,
        link: savedConfig.config.links[options.index - 1],
        linksCount: savedConfig.config.links.length
      },
      savedConfig
    );
  }

  if (subcommand === "move") {
    let options;
    try {
      options = parseLinkMoveArgs(filteredArgs);
    } catch (error) {
      io.stderr.write(`[opentree] ${error.message}\n`);
      return emitEditFailure(io, report, json, error.message);
    }

    report.stage = "load";
    const loadedConfig = await loadEditableConfigState(cwd);
    if (!loadedConfig.ok) {
      writeLoadEditableConfigError(io, loadedConfig);
      const issues = loadedConfig.message ? [loadedConfig.message] : [];
      const message =
        loadedConfig.kind === "missing"
          ? `${CONFIG_FILE_NAME} was not found in ${cwd}`
          : `${CONFIG_FILE_NAME} is not valid JSON`;
      return emitEditFailure(io, report, json, message, issues);
    }

    const links = readLinks(loadedConfig.config);

    if (links.length === 0) {
      const message = "there are no links to move";
      io.stderr.write(`[opentree] ${message}\n`);
      return emitEditFailure(io, report, json, message);
    }

    if (options.from > links.length) {
      const message = `--from must be between 1 and ${links.length}`;
      io.stderr.write(`[opentree] ${message}\n`);
      return emitEditFailure(io, report, json, message);
    }

    if (options.to > links.length) {
      const message = `--to must be between 1 and ${links.length}`;
      io.stderr.write(`[opentree] ${message}\n`);
      return emitEditFailure(io, report, json, message);
    }

    const [movedLink] = links.splice(options.from - 1, 1);
    links.splice(options.to - 1, 0, movedLink);

    const nextConfig = {
      ...loadedConfig.config,
      links
    };
    const errors = validateConfig(nextConfig);

    if (errors.length > 0) {
      report.stage = "validate";
      reportInvalidConfig(io, "link move", errors);
      return emitEditFailure(io, report, json, "link move aborted because the config would be invalid", errors);
    }

    const savedConfig = await saveConfig(cwd, nextConfig);

    return emitEditSuccess(
      io,
      report,
      json,
      `moved link from #${options.from} to #${options.to}`,
      {
        from: options.from,
        to: options.to,
        link: movedLink,
        linksCount: savedConfig.config.links.length
      },
      savedConfig
    );
  }

  if (subcommand === "remove") {
    let options;
    try {
      options = parseLinkRemoveArgs(filteredArgs);
    } catch (error) {
      io.stderr.write(`[opentree] ${error.message}\n`);
      return emitEditFailure(io, report, json, error.message);
    }

    report.stage = "load";
    const loadedConfig = await loadEditableConfigState(cwd);
    if (!loadedConfig.ok) {
      writeLoadEditableConfigError(io, loadedConfig);
      const issues = loadedConfig.message ? [loadedConfig.message] : [];
      const message =
        loadedConfig.kind === "missing"
          ? `${CONFIG_FILE_NAME} was not found in ${cwd}`
          : `${CONFIG_FILE_NAME} is not valid JSON`;
      return emitEditFailure(io, report, json, message, issues);
    }

    const links = readLinks(loadedConfig.config);

    if (links.length === 0) {
      const message = "there are no links to remove";
      io.stderr.write(`[opentree] ${message}\n`);
      return emitEditFailure(io, report, json, message);
    }

    if (options.index > links.length) {
      const message = `--index must be between 1 and ${links.length}`;
      io.stderr.write(`[opentree] ${message}\n`);
      return emitEditFailure(io, report, json, message);
    }

    if (links.length === 1) {
      const message = "cannot remove the last link because at least one link is required";
      io.stderr.write(`[opentree] ${message}\n`);
      return emitEditFailure(io, report, json, message);
    }

    const [removedLink] = links.splice(options.index - 1, 1);
    const nextConfig = {
      ...loadedConfig.config,
      links
    };
    const errors = validateConfig(nextConfig);

    if (errors.length > 0) {
      report.stage = "validate";
      reportInvalidConfig(io, "link remove", errors);
      return emitEditFailure(io, report, json, "link remove aborted because the config would be invalid", errors);
    }

    const savedConfig = await saveConfig(cwd, nextConfig);

    return emitEditSuccess(
      io,
      report,
      json,
      `removed link #${options.index}: ${removedLink.title}`,
      {
        index: options.index,
        link: removedLink,
        linksCount: savedConfig.config.links.length
      },
      savedConfig
    );
  }

  const message = "usage: opentree link add --title <value> --url <value> [--index <number>]";
  io.stderr.write(`[opentree] ${message}\n`);
  io.stderr.write("[opentree]        opentree link list\n");
  io.stderr.write("[opentree]        opentree link update --index <number> [--title <value>] [--url <value>]\n");
  io.stderr.write("[opentree]        opentree link move --from <number> --to <number>\n");
  io.stderr.write("[opentree]        opentree link remove --index <number>\n");
  return emitEditFailure(io, report, json, message);
}

async function runThemeCommand(io, args = []) {
  const requestedJson = args.includes("--json");
  const [subcommand, ...restArgs] = args;
  const cwd = io.cwd ?? process.cwd();
  const report = createEditReport(cwd, "theme set");

  if (subcommand !== "set") {
    const message =
      "usage: opentree theme set [--accent-color <hex>] [--background-color <hex>] [--text-color <hex>]";
    io.stderr.write(`[opentree] ${message}\n`);
    return emitEditFailure(io, report, requestedJson, message);
  }

  const { args: filteredArgs, json } = extractJsonFlag(restArgs);
  let updates;
  try {
    updates = parseThemeArgs(filteredArgs);
  } catch (error) {
    io.stderr.write(`[opentree] ${error.message}\n`);
    return emitEditFailure(io, report, json, error.message);
  }

  report.stage = "load";
  const loadedConfig = await loadEditableConfigState(cwd);
  if (!loadedConfig.ok) {
    writeLoadEditableConfigError(io, loadedConfig);
    const issues = loadedConfig.message ? [loadedConfig.message] : [];
    const message =
      loadedConfig.kind === "missing"
        ? `${CONFIG_FILE_NAME} was not found in ${cwd}`
        : `${CONFIG_FILE_NAME} is not valid JSON`;
    return emitEditFailure(io, report, json, message, issues);
  }

  const nextConfig = {
    ...loadedConfig.config,
    theme: {
      ...(isObject(loadedConfig.config.theme) ? loadedConfig.config.theme : {}),
      ...updates
    }
  };
  const errors = validateConfig(nextConfig);

  if (errors.length > 0) {
    report.stage = "validate";
    reportInvalidConfig(io, "theme update", errors);
    return emitEditFailure(io, report, json, "theme update aborted because the config would be invalid", errors);
  }

  const savedConfig = await saveConfig(cwd, nextConfig);

  return emitEditSuccess(
    io,
    report,
    json,
    `updated theme fields: ${Object.keys(updates).join(", ")}`,
    {
      fields: Object.keys(updates),
      theme: savedConfig.config.theme
    },
    savedConfig
  );
}

async function runSiteCommand(io, args = []) {
  const requestedJson = args.includes("--json");
  const [subcommand, ...restArgs] = args;
  const cwd = io.cwd ?? process.cwd();
  const report = createEditReport(cwd, "site set");

  if (subcommand !== "set") {
    const message = "usage: opentree site set --url <value>";
    io.stderr.write(`[opentree] ${message}\n`);
    return emitEditFailure(io, report, requestedJson, message);
  }

  const { args: filteredArgs, json } = extractJsonFlag(restArgs);
  let updates;
  try {
    updates = parseSiteArgs(filteredArgs);
  } catch (error) {
    io.stderr.write(`[opentree] ${error.message}\n`);
    return emitEditFailure(io, report, json, error.message);
  }

  report.stage = "load";
  const loadedConfig = await loadEditableConfigState(cwd);
  if (!loadedConfig.ok) {
    writeLoadEditableConfigError(io, loadedConfig);
    const issues = loadedConfig.message ? [loadedConfig.message] : [];
    const message =
      loadedConfig.kind === "missing"
        ? `${CONFIG_FILE_NAME} was not found in ${cwd}`
        : `${CONFIG_FILE_NAME} is not valid JSON`;
    return emitEditFailure(io, report, json, message, issues);
  }

  const nextConfig = {
    ...loadedConfig.config,
    ...updates
  };
  const errors = validateConfig(nextConfig);

  if (errors.length > 0) {
    report.stage = "validate";
    reportInvalidConfig(io, "site update", errors);
    return emitEditFailure(io, report, json, "site update aborted because the config would be invalid", errors);
  }

  const savedConfig = await saveConfig(cwd, nextConfig);

  return emitEditSuccess(
    io,
    report,
    json,
    "updated site fields: siteUrl",
    {
      fields: ["siteUrl"],
      site: {
        siteUrl: savedConfig.config.siteUrl
      }
    },
    savedConfig
  );
}

async function runMetaCommand(io, args = []) {
  const requestedJson = args.includes("--json");
  const [subcommand, ...restArgs] = args;
  const cwd = io.cwd ?? process.cwd();
  const report = createEditReport(cwd, "meta set");

  if (subcommand !== "set") {
    const message =
      "usage: opentree meta set [--title <value>] [--description <value>] [--og-image-url <value>]";
    io.stderr.write(`[opentree] ${message}\n`);
    return emitEditFailure(io, report, requestedJson, message);
  }

  const { args: filteredArgs, json } = extractJsonFlag(restArgs);
  let updates;
  try {
    updates = parseMetaArgs(filteredArgs);
  } catch (error) {
    io.stderr.write(`[opentree] ${error.message}\n`);
    return emitEditFailure(io, report, json, error.message);
  }

  report.stage = "load";
  const loadedConfig = await loadEditableConfigState(cwd);
  if (!loadedConfig.ok) {
    writeLoadEditableConfigError(io, loadedConfig);
    const issues = loadedConfig.message ? [loadedConfig.message] : [];
    const message =
      loadedConfig.kind === "missing"
        ? `${CONFIG_FILE_NAME} was not found in ${cwd}`
        : `${CONFIG_FILE_NAME} is not valid JSON`;
    return emitEditFailure(io, report, json, message, issues);
  }

  const nextConfig = {
    ...loadedConfig.config,
    metadata: {
      ...(isObject(loadedConfig.config.metadata) ? loadedConfig.config.metadata : {}),
      ...updates
    }
  };
  const errors = validateConfig(nextConfig);

  if (errors.length > 0) {
    report.stage = "validate";
    reportInvalidConfig(io, "meta update", errors);
    return emitEditFailure(io, report, json, "meta update aborted because the config would be invalid", errors);
  }

  const savedConfig = await saveConfig(cwd, nextConfig);

  return emitEditSuccess(
    io,
    report,
    json,
    `updated metadata fields: ${Object.keys(updates).join(", ")}`,
    {
      fields: Object.keys(updates),
      metadata: savedConfig.config.metadata
    },
    savedConfig
  );
}

module.exports = {
  runLinkCommand,
  runMetaCommand,
  runProfileCommand,
  runSiteCommand,
  runThemeCommand
};
