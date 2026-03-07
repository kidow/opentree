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

    const links = Array.isArray(loadedConfig.config.links)
      ? [...loadedConfig.config.links]
      : [];
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

    const links = Array.isArray(loadedConfig.config.links)
      ? [...loadedConfig.config.links]
      : [];

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
  io.stderr.write("[opentree]        opentree link remove --index <number>\n");
  return 1;
}

module.exports = {
  runLinkCommand,
  runProfileCommand
};
