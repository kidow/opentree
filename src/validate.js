const { CONFIG_FILE_NAME } = require("./init");
const { loadConfig, validateConfig } = require("./config");

async function runValidate(io) {
  const cwd = io.cwd ?? process.cwd();

  io.stdout.write(`[opentree] validating ${CONFIG_FILE_NAME}\n`);

  let loadedConfig;
  try {
    loadedConfig = await loadConfig(cwd);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      io.stderr.write(`[opentree] ${CONFIG_FILE_NAME} was not found in ${cwd}\n`);
      io.stderr.write("[opentree] run `opentree init` first to create a starter config\n");
      return 1;
    }

    if (error instanceof SyntaxError) {
      io.stderr.write(`[opentree] ${CONFIG_FILE_NAME} is not valid JSON\n`);
      io.stderr.write(`[opentree] ${error.message}\n`);
      return 1;
    }

    throw error;
  }

  const errors = validateConfig(loadedConfig.config);

  if (errors.length > 0) {
    io.stderr.write(`[opentree] found ${errors.length} validation issue(s)\n`);
    errors.forEach((error) => {
      io.stderr.write(`- ${error}\n`);
    });
    return 1;
  }

  io.stdout.write(`[opentree] ${CONFIG_FILE_NAME} is valid\n`);
  return 0;
}

module.exports = {
  runValidate
};
