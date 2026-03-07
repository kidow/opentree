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

async function loadEditableConfig(io) {
  const cwd = io.cwd ?? process.cwd();

  try {
    return await loadConfig(cwd);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      io.stderr.write(`[opentree] ${CONFIG_FILE_NAME} was not found in ${cwd}\n`);
      io.stderr.write("[opentree] run `opentree init` first to create a starter config\n");
      return null;
    }

    if (error instanceof SyntaxError) {
      io.stderr.write(`[opentree] ${CONFIG_FILE_NAME} is not valid JSON\n`);
      io.stderr.write(`[opentree] ${error.message}\n`);
      return null;
    }

    throw error;
  }
}

function reportInvalidConfig(io, actionLabel, errors) {
  io.stderr.write(`[opentree] ${actionLabel} aborted because the config would be invalid\n`);
  errors.forEach((error) => {
    io.stderr.write(`- ${error}\n`);
  });
}

function readLinks(config) {
  return Array.isArray(config.links) ? [...config.links] : [];
}

async function runProfileCommand(io, args = []) {
  const [subcommand, ...restArgs] = args;

  if (subcommand !== "set") {
    io.stderr.write("[opentree] usage: opentree profile set [--name <value>] [--bio <value>] [--avatar-url <value>]\n");
    return 1;
  }

  let updates;
  try {
    updates = parseProfileArgs(restArgs);
  } catch (error) {
    io.stderr.write(`[opentree] ${error.message}\n`);
    return 1;
  }

  const loadedConfig = await loadEditableConfig(io);
  if (!loadedConfig) {
    return 1;
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
    reportInvalidConfig(io, "profile update", errors);
    return 1;
  }

  await saveConfig(io.cwd ?? process.cwd(), nextConfig);

  io.stdout.write(`[opentree] updated profile fields: ${Object.keys(updates).join(", ")}\n`);
  return 0;
}

async function runLinkCommand(io, args = []) {
  const [subcommand, ...restArgs] = args;

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

  if (subcommand === "add") {
    let options;
    try {
      options = parseLinkAddArgs(restArgs);
    } catch (error) {
      io.stderr.write(`[opentree] ${error.message}\n`);
      return 1;
    }

    const loadedConfig = await loadEditableConfig(io);
    if (!loadedConfig) {
      return 1;
    }

    const links = readLinks(loadedConfig.config);
    const insertIndex = options.index === undefined ? links.length : options.index - 1;

    if (insertIndex < 0 || insertIndex > links.length) {
      io.stderr.write(`[opentree] --index must be between 1 and ${links.length + 1}\n`);
      return 1;
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
      reportInvalidConfig(io, "link add", errors);
      return 1;
    }

    await saveConfig(io.cwd ?? process.cwd(), nextConfig);

    io.stdout.write(`[opentree] added link #${insertIndex + 1}: ${options.title}\n`);
    return 0;
  }

  if (subcommand === "update") {
    let options;
    try {
      options = parseLinkUpdateArgs(restArgs);
    } catch (error) {
      io.stderr.write(`[opentree] ${error.message}\n`);
      return 1;
    }

    const loadedConfig = await loadEditableConfig(io);
    if (!loadedConfig) {
      return 1;
    }

    const links = readLinks(loadedConfig.config);

    if (options.index > links.length) {
      io.stderr.write(`[opentree] --index must be between 1 and ${links.length}\n`);
      return 1;
    }

    const currentLink = links[options.index - 1];
    if (!isObject(currentLink)) {
      io.stderr.write(`[opentree] link #${options.index} is not editable\n`);
      return 1;
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
      reportInvalidConfig(io, "link update", errors);
      return 1;
    }

    await saveConfig(io.cwd ?? process.cwd(), nextConfig);

    io.stdout.write(`[opentree] updated link #${options.index}\n`);
    return 0;
  }

  if (subcommand === "move") {
    let options;
    try {
      options = parseLinkMoveArgs(restArgs);
    } catch (error) {
      io.stderr.write(`[opentree] ${error.message}\n`);
      return 1;
    }

    const loadedConfig = await loadEditableConfig(io);
    if (!loadedConfig) {
      return 1;
    }

    const links = readLinks(loadedConfig.config);

    if (links.length === 0) {
      io.stderr.write("[opentree] there are no links to move\n");
      return 1;
    }

    if (options.from > links.length) {
      io.stderr.write(`[opentree] --from must be between 1 and ${links.length}\n`);
      return 1;
    }

    if (options.to > links.length) {
      io.stderr.write(`[opentree] --to must be between 1 and ${links.length}\n`);
      return 1;
    }

    const [movedLink] = links.splice(options.from - 1, 1);
    links.splice(options.to - 1, 0, movedLink);

    const nextConfig = {
      ...loadedConfig.config,
      links
    };
    const errors = validateConfig(nextConfig);

    if (errors.length > 0) {
      reportInvalidConfig(io, "link move", errors);
      return 1;
    }

    await saveConfig(io.cwd ?? process.cwd(), nextConfig);

    io.stdout.write(`[opentree] moved link from #${options.from} to #${options.to}\n`);
    return 0;
  }

  if (subcommand === "remove") {
    let options;
    try {
      options = parseLinkRemoveArgs(restArgs);
    } catch (error) {
      io.stderr.write(`[opentree] ${error.message}\n`);
      return 1;
    }

    const loadedConfig = await loadEditableConfig(io);
    if (!loadedConfig) {
      return 1;
    }

    const links = readLinks(loadedConfig.config);

    if (links.length === 0) {
      io.stderr.write("[opentree] there are no links to remove\n");
      return 1;
    }

    if (options.index > links.length) {
      io.stderr.write(`[opentree] --index must be between 1 and ${links.length}\n`);
      return 1;
    }

    if (links.length === 1) {
      io.stderr.write("[opentree] cannot remove the last link because at least one link is required\n");
      return 1;
    }

    const [removedLink] = links.splice(options.index - 1, 1);
    const nextConfig = {
      ...loadedConfig.config,
      links
    };
    const errors = validateConfig(nextConfig);

    if (errors.length > 0) {
      reportInvalidConfig(io, "link remove", errors);
      return 1;
    }

    await saveConfig(io.cwd ?? process.cwd(), nextConfig);

    io.stdout.write(`[opentree] removed link #${options.index}: ${removedLink.title}\n`);
    return 0;
  }

  io.stderr.write("[opentree] usage: opentree link add --title <value> --url <value> [--index <number>]\n");
  io.stderr.write("[opentree]        opentree link list\n");
  io.stderr.write("[opentree]        opentree link update --index <number> [--title <value>] [--url <value>]\n");
  io.stderr.write("[opentree]        opentree link move --from <number> --to <number>\n");
  io.stderr.write("[opentree]        opentree link remove --index <number>\n");
  return 1;
}

async function runThemeCommand(io, args = []) {
  const [subcommand, ...restArgs] = args;

  if (subcommand !== "set") {
    io.stderr.write("[opentree] usage: opentree theme set [--accent-color <hex>] [--background-color <hex>] [--text-color <hex>]\n");
    return 1;
  }

  let updates;
  try {
    updates = parseThemeArgs(restArgs);
  } catch (error) {
    io.stderr.write(`[opentree] ${error.message}\n`);
    return 1;
  }

  const loadedConfig = await loadEditableConfig(io);
  if (!loadedConfig) {
    return 1;
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
    reportInvalidConfig(io, "theme update", errors);
    return 1;
  }

  await saveConfig(io.cwd ?? process.cwd(), nextConfig);

  io.stdout.write(`[opentree] updated theme fields: ${Object.keys(updates).join(", ")}\n`);
  return 0;
}

module.exports = {
  runLinkCommand,
  runProfileCommand,
  runThemeCommand
};
