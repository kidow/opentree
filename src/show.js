const { CONFIG_FILE_NAME } = require("./init");
const { loadConfig } = require("./config");

async function loadReadableConfig(io) {
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

async function runConfigCommand(io, args = []) {
  const [subcommand] = args;

  if (subcommand !== "show") {
    io.stderr.write("[opentree] usage: opentree config show\n");
    return 1;
  }

  const loadedConfig = await loadReadableConfig(io);
  if (!loadedConfig) {
    return 1;
  }

  io.stdout.write(`${JSON.stringify(loadedConfig.config, null, 2)}\n`);
  return 0;
}

module.exports = {
  loadReadableConfig,
  runConfigCommand
};
