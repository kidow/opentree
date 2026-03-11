const packageJson = require("../package.json");
const { runBuild } = require("./build");
const { runCompletionCommand } = require("./completion");
const { runDoctor } = require("./doctor");
const { runDev } = require("./dev");
const { runDeploy } = require("./deploy");
const { runLinkCommand, runMetaCommand, runProfileCommand, runSiteCommand, runThemeCommand } = require("./edit");
const { runImportCommand } = require("./import");
const { runInteractive } = require("./interactive");
const { runConfigCommand } = require("./show");
const { runInit } = require("./init");
const { runSchemaCommand } = require("./introspect");
const { runPromptCommand } = require("./prompt");
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
    "  init           Create a starter opentree.config.json (--json, --dry-run supported)",
    "  interactive    Create a config through terminal prompts",
    "  build          Generate the site into dist/ or --output <dir> (--json, --dry-run supported)",
    "  dev            Start a local preview server (--json supported)",
    "  deploy         Build and deploy with --preview or --prod (--json, --dry-run supported)",
    "  doctor         Check config, siteUrl, and Vercel readiness (--json supported)",
    "  validate       Validate opentree.config.json (--json supported)",
    "  import         Import links from a JSON file (--json, --dry-run supported)",
    "  schema         Print runtime CLI command schemas (--json supported)",
    "  prompt         Apply deterministic natural-language config edits (--json, --dry-run supported)",
    "  config show    Print the current config (--json|--pretty supported)",
    "  profile set    Update profile fields (--json, --dry-run supported)",
    "  site set       Update siteUrl (--json, --dry-run supported)",
    "  meta set       Update metadata fields (--json, --dry-run supported)",
    "  theme set      Update theme colors (--json, --dry-run supported)",
    "  link add       Add a link entry (--json, --dry-run supported)",
    "  link list      Show link indexes and values (--json supported)",
    "  link move      Move a link entry by index (--json, --dry-run supported)",
    "  link preset    Add a link from a preset destination (--json, --dry-run supported)",
    "  link remove    Remove a link entry by index (--json, --dry-run supported)",
    "  link update    Update a link entry by index (--json, --dry-run supported)",
    "  vercel link    Link the project root to a reusable Vercel project (--json, --dry-run supported)",
    "  vercel status  Inspect local Vercel link and CLI auth state (--json supported)",
    "  vercel unlink  Remove local reusable Vercel project linkage (--json, --dry-run supported)",
    "  completion     Print shell completion for bash or zsh (--json supported)",
    "  help           Show this message",
    "",
    "Options:",
    "  -h, --help      Show help",
    "  -v, --version   Show version",
    "",
    "Quick Start:",
    "  opentree init --name \"Kidow\" --bio \"CLI-first profile\"",
    "  opentree link add --title \"Docs\" --url \"https://example.com/docs\"",
    "  opentree link preset --name github --handle kidow",
    "  opentree build",
    "  opentree dev",
    "",
    "Common Tasks:",
    "  Guided setup:    opentree interactive",
    "  Edit profile:    opentree profile set --name \"Kidow\" --bio \"Shipping links\"",
    "  Set site URL:    opentree site set --url \"https://links.example.com\"",
    "  Import links:    opentree import links --file ./links.json --replace",
    "  Prompt edit:     opentree prompt \"set my bio to Shipping links\"",
    "  Diagnose setup:  opentree doctor",
    "  Deploy live:     opentree deploy --prod",
    "  Install shell completion:  opentree completion zsh"
  ].join("\n");
}

async function run(argv = process.argv.slice(2), io = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const context = { ...io, stdout, stderr };
  const [command] = argv;
  const requestedJson = argv.includes("--json");

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

  if (command === "interactive") {
    return runInteractive(context, argv.slice(1));
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

  if (command === "import") {
    return runImportCommand(context, argv.slice(1));
  }

  if (command === "prompt") {
    return runPromptCommand(context, argv.slice(1));
  }

  if (command === "schema") {
    return runSchemaCommand(context, argv.slice(1));
  }

  if (command === "completion") {
    return runCompletionCommand(context, argv.slice(1));
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
    return runValidate(context, argv.slice(1));
  }

  if (command === "vercel") {
    return runVercelCommand(context, argv.slice(1));
  }

  const message = `unknown command: ${command}`;
  stderr.write(`[opentree] ${message}\n`);
  stderr.write("Run `opentree --help` to see available commands.\n");
  if (requestedJson) {
    stdout.write(
      `${JSON.stringify(
        {
          command,
          issues: [message],
          message,
          ok: false,
          result: null,
          stage: "args"
        },
        null,
        2
      )}\n`
    );
  }
  return 1;
}

module.exports = {
  run
};
