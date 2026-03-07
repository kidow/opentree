const packageJson = require("../package.json");
const { runInit } = require("./init");
const { runValidate } = require("./validate");

function buildHelpText() {
  return [
    "opentree CLI",
    "",
    "Usage:",
    "  opentree <command>",
    "",
    "Commands:",
    "  init      Create a starter opentree.config.json",
    "  validate  Validate opentree.config.json",
    "  help      Show this message",
    "",
    "Options:",
    "  -h, --help      Show help",
    "  -v, --version   Show version"
  ].join("\n");
}

async function run(argv = process.argv.slice(2), io = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const context = { ...io, stdout, stderr };
  const [command] = argv;

  if (!command || command === "help" || command === "-h" || command === "--help") {
    stdout.write(`${buildHelpText()}\n`);
    return 0;
  }

  if (command === "-v" || command === "--version") {
    stdout.write(`${packageJson.version}\n`);
    return 0;
  }

  if (command === "init") {
    return runInit(context);
  }

  if (command === "validate") {
    return runValidate(context);
  }

  stderr.write(`[opentree] unknown command: ${command}\n`);
  stderr.write("Run `opentree --help` to see available commands.\n");
  return 1;
}

module.exports = {
  run
};
