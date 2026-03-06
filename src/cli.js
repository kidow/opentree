const packageJson = require("../package.json");

function buildHelpText() {
  return [
    "opentree CLI",
    "",
    "Usage:",
    "  opentree <command>",
    "",
    "Commands:",
    "  init      Run the bootstrap placeholder flow",
    "  help      Show this message",
    "",
    "Options:",
    "  -h, --help      Show help",
    "  -v, --version   Show version"
  ].join("\n");
}

function runInit(io) {
  const cwd = io.cwd ?? process.cwd();

  io.stdout.write("[opentree] init command received\n");
  io.stdout.write(`[opentree] target directory: ${cwd}\n`);
  io.stdout.write("[opentree] bootstrap scaffold is not implemented yet\n");

  return 0;
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

  stderr.write(`[opentree] unknown command: ${command}\n`);
  stderr.write("Run `opentree --help` to see available commands.\n");
  return 1;
}

module.exports = {
  run
};
