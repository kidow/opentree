const packageJson = require("../package.json");
const { runBuild } = require("./build");
const { runDoctor } = require("./doctor");
const { runDev } = require("./dev");
const { runDeploy } = require("./deploy");
const { runLinkCommand, runMetaCommand, runProfileCommand, runSiteCommand, runThemeCommand } = require("./edit");
const { runConfigCommand } = require("./show");
const { runInit } = require("./init");
const { runValidate } = require("./validate");
const { runVercelCommand } = require("./vercel");

function buildHelpText() {
  return [
    "opentree CLI",
    "",
    "Usage:",
    "  opentree <command>",
    "",
    "Commands:",
    "  build     Generate a static site into dist/index.html (--output <dir> supported)",
    "  config show   Print the current opentree.config.json",
    "  deploy    Build and deploy with explicit --preview or --prod mode (--json supported)",
    "  doctor    Check config, siteUrl, and Vercel readiness (--json supported)",
    "  dev       Start a local preview server",
    "  init      Create a starter opentree.config.json",
    "  link add      Add a link entry to opentree.config.json",
    "  link list     Show link indexes and current values",
    "  link move     Move a link entry by index",
    "  link remove   Remove a link entry by index",
    "  link update   Update a link entry by index",
    "  meta set      Update metadata fields in opentree.config.json",
    "  profile set   Update profile fields in opentree.config.json",
    "  site set      Update site fields in opentree.config.json",
    "  theme set     Update theme fields in opentree.config.json",
    "  validate  Validate opentree.config.json",
    "  vercel link    Link the project root to a reusable Vercel project",
    "  vercel unlink  Remove local reusable Vercel project linkage",
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
    return runInit(context, argv.slice(1));
  }

  if (command === "build") {
    return runBuild(context, argv.slice(1));
  }

  if (command === "dev") {
    return runDev(context, argv.slice(1));
  }

  if (command === "deploy") {
    return runDeploy(context, argv.slice(1));
  }

  if (command === "doctor") {
    return runDoctor(context, argv.slice(1));
  }

  if (command === "config") {
    return runConfigCommand(context, argv.slice(1));
  }

  if (command === "profile") {
    return runProfileCommand(context, argv.slice(1));
  }

  if (command === "site") {
    return runSiteCommand(context, argv.slice(1));
  }

  if (command === "meta") {
    return runMetaCommand(context, argv.slice(1));
  }

  if (command === "link") {
    return runLinkCommand(context, argv.slice(1));
  }

  if (command === "theme") {
    return runThemeCommand(context, argv.slice(1));
  }

  if (command === "validate") {
    return runValidate(context);
  }

  if (command === "vercel") {
    return runVercelCommand(context, argv.slice(1));
  }

  stderr.write(`[opentree] unknown command: ${command}\n`);
  stderr.write("Run `opentree --help` to see available commands.\n");
  return 1;
}

module.exports = {
  run
};
