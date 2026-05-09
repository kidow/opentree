const { CLICK_TRACKING_VALUES, LINK_PRESETS, SOCIAL_CARD_STYLE_VALUES, TEMPLATE_VALUES } = require("./catalog");

const JSON_FLAG = {
  description: "Return a structured JSON report.",
  name: "--json",
  type: "boolean"
};

const DRY_RUN_FLAG = {
  description: "Validate and preview the result without writing files or invoking remote side effects.",
  name: "--dry-run",
  type: "boolean"
};

const CLI_COMMAND_SCHEMAS = [
  {
    flags: [
      { description: "Override the profile name in the starter config.", name: "--name", required: false, type: "string" },
      { description: "Override the profile bio in the starter config.", name: "--bio", required: false, type: "string" },
      { description: "Override the avatar URL in the starter config.", name: "--avatar-url", required: false, type: "string" },
      { description: "Override the production site URL in the starter config.", name: "--site-url", required: false, type: "string" },
      { description: "Override the metadata title in the starter config.", name: "--title", required: false, type: "string" },
      { description: "Override the metadata description in the starter config.", name: "--description", required: false, type: "string" },
      { description: "Override the Open Graph image URL in the starter config.", name: "--og-image-url", required: false, type: "string" },
      { description: "Choose the starter template.", enum: TEMPLATE_VALUES, name: "--template", required: false, type: "string" },
      DRY_RUN_FLAG,
      JSON_FLAG
    ],
    name: "init",
    summary: "Create a starter opentree.config.json."
  },
  {
    flags: [JSON_FLAG],
    name: "validate",
    summary: "Validate opentree.config.json."
  },
  {
    flags: [
      { description: "Write the generated site into a subdirectory of the current working directory.", name: "--output", required: false, type: "path" },
      DRY_RUN_FLAG,
      JSON_FLAG
    ],
    name: "build",
    summary: "Generate the static site."
  },
  {
    flags: [JSON_FLAG],
    name: "dev",
    summary: "Start the local preview server."
  },
  {
    flags: [
      { description: "Deploy to production instead of preview.", name: "--prod", required: false, type: "boolean" },
      { description: "Force preview mode explicitly.", name: "--preview", required: false, type: "boolean" },
      DRY_RUN_FLAG,
      JSON_FLAG
    ],
    name: "deploy",
    summary: "Build and deploy with Vercel."
  },
  {
    flags: [JSON_FLAG],
    name: "doctor",
    summary: "Check config, siteUrl, and Vercel readiness."
  },
  {
    flags: [
      { description: "Read imported links from a JSON file inside the current working directory.", name: "--file", required: true, type: "path" },
      { description: "Replace existing links instead of appending.", name: "--replace", required: false, type: "boolean" },
      DRY_RUN_FLAG,
      JSON_FLAG
    ],
    name: "import links",
    summary: "Import links from a JSON file."
  },
  {
    flags: [
      {
        description: "Apply deterministic supported prompt edits.",
        name: "<instruction>",
        required: true,
        type: "string"
      },
      DRY_RUN_FLAG,
      JSON_FLAG
    ],
    name: "prompt",
    summary: "Apply deterministic natural-language config edits."
  },
  {
    flags: [
      { description: "Print the wrapped JSON contract instead of formatted config JSON.", name: "--json", required: false, type: "boolean" },
      { description: "Print prettified config JSON.", name: "--pretty", required: false, type: "boolean" }
    ],
    name: "config show",
    summary: "Print the current config."
  },
  {
    flags: [
      { description: "Update profile.name.", name: "--name", required: false, type: "string" },
      { description: "Update profile.bio.", name: "--bio", required: false, type: "string" },
      { description: "Update profile.avatarUrl.", name: "--avatar-url", required: false, type: "string" },
      DRY_RUN_FLAG,
      JSON_FLAG
    ],
    name: "profile set",
    summary: "Update profile fields."
  },
  {
    flags: [
      { description: "Update siteUrl.", name: "--url", required: false, type: "string" },
      { description: "Update analytics.clickTracking.", enum: CLICK_TRACKING_VALUES, name: "--analytics", required: false, type: "string" },
      DRY_RUN_FLAG,
      JSON_FLAG
    ],
    name: "site set",
    summary: "Update site fields."
  },
  {
    flags: [
      { description: "Update metadata.title.", name: "--title", required: false, type: "string" },
      { description: "Update metadata.description.", name: "--description", required: false, type: "string" },
      { description: "Update metadata.ogImageUrl.", name: "--og-image-url", required: false, type: "string" },
      { description: "Update metadata.socialCard.eyebrow.", name: "--card-eyebrow", required: false, type: "string" },
      { description: "Update metadata.socialCard.style.", enum: SOCIAL_CARD_STYLE_VALUES, name: "--card-style", required: false, type: "string" },
      { description: "Set metadata.socialCard.showQrCode to true.", name: "--show-qr-code", required: false, type: "boolean" },
      DRY_RUN_FLAG,
      JSON_FLAG
    ],
    name: "meta set",
    summary: "Update metadata fields."
  },
  {
    flags: [
      { description: "Update theme.accentColor.", name: "--accent-color", required: false, type: "string" },
      { description: "Update theme.backgroundColor.", name: "--background-color", required: false, type: "string" },
      { description: "Update theme.textColor.", name: "--text-color", required: false, type: "string" },
      DRY_RUN_FLAG,
      JSON_FLAG
    ],
    name: "theme set",
    summary: "Update theme colors."
  },
  {
    flags: [
      { description: "Title for the new link.", name: "--title", required: true, type: "string" },
      { description: "Destination URL for the new link.", name: "--url", required: true, type: "string" },
      { description: "Optional 1-based insert position.", name: "--index", required: false, type: "integer" },
      DRY_RUN_FLAG,
      JSON_FLAG
    ],
    name: "link add",
    summary: "Add a link entry."
  },
  {
    flags: [JSON_FLAG],
    name: "link list",
    summary: "List links with 1-based indexes."
  },
  {
    flags: [
      { description: "1-based source position.", name: "--from", required: true, type: "integer" },
      { description: "1-based destination position.", name: "--to", required: true, type: "integer" },
      DRY_RUN_FLAG,
      JSON_FLAG
    ],
    name: "link move",
    summary: "Move a link entry."
  },
  {
    flags: [
      { description: "Preset destination name.", enum: Object.keys(LINK_PRESETS), name: "--name", required: true, type: "string" },
      { description: "Handle used to build the preset URL.", name: "--handle", required: true, type: "string" },
      DRY_RUN_FLAG,
      JSON_FLAG
    ],
    name: "link preset",
    summary: "Add a link from a preset destination."
  },
  {
    flags: [
      { description: "1-based link index to remove.", name: "--index", required: true, type: "integer" },
      DRY_RUN_FLAG,
      JSON_FLAG
    ],
    name: "link remove",
    summary: "Remove a link entry."
  },
  {
    flags: [
      { description: "1-based link index to update.", name: "--index", required: true, type: "integer" },
      { description: "Replacement title.", name: "--title", required: false, type: "string" },
      { description: "Replacement URL.", name: "--url", required: false, type: "string" },
      DRY_RUN_FLAG,
      JSON_FLAG
    ],
    name: "link update",
    summary: "Update a link entry."
  },
  {
    flags: [
      DRY_RUN_FLAG,
      JSON_FLAG
    ],
    name: "vercel link",
    summary: "Link the project root to a reusable Vercel project."
  },
  {
    flags: [JSON_FLAG],
    name: "vercel status",
    summary: "Inspect local Vercel linkage and auth state."
  },
  {
    flags: [
      DRY_RUN_FLAG,
      JSON_FLAG
    ],
    name: "vercel unlink",
    summary: "Remove local Vercel linkage."
  },
  {
    flags: [
      { description: "Target shell.", enum: ["bash", "zsh"], name: "<shell>", required: true, type: "string" },
      JSON_FLAG
    ],
    name: "completion",
    summary: "Print shell completion scripts."
  }
];

const COMMAND_SCHEMA_MAP = new Map(
  CLI_COMMAND_SCHEMAS.map((schema) => [schema.name, schema])
);

function writeJsonReport(stdout, report) {
  stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function createSchemaReport() {
  return {
    command: "schema",
    issues: [],
    message: "",
    ok: false,
    result: null,
    stage: "args"
  };
}

function parseSchemaArgs(args) {
  const filteredArgs = [];
  let json = false;

  for (const arg of args) {
    if (arg === "--json") {
      json = true;
      continue;
    }

    filteredArgs.push(arg);
  }

  return {
    json,
    target: filteredArgs.join(" ").trim()
  };
}

function renderSchemaText(commandSchema) {
  if (!commandSchema) {
    return CLI_COMMAND_SCHEMAS.map((entry) => `${entry.name}: ${entry.summary}`).join("\n");
  }

  const flags = commandSchema.flags
    .map((flag) => {
      const typeSuffix = flag.type ? ` <${flag.type}>` : "";
      const enumSuffix = flag.enum ? ` [${flag.enum.join(", ")}]` : "";
      const requiredSuffix = flag.required ? " (required)" : "";
      return `- ${flag.name}${typeSuffix}${requiredSuffix}${enumSuffix}: ${flag.description}`;
    })
    .join("\n");

  return `${commandSchema.name}\n${commandSchema.summary}\n${flags}`;
}

async function runSchemaCommand(io, args = []) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const { json, target } = parseSchemaArgs(args);
  const report = createSchemaReport();

  if (!target) {
    report.ok = true;
    report.message = "loaded CLI command schemas";
    report.result = {
      commands: CLI_COMMAND_SCHEMAS
    };
    report.stage = "load";
    if (json) {
      writeJsonReport(stdout, report);
    } else {
      stdout.write(`${renderSchemaText()}\n`);
    }
    return 0;
  }

  const commandSchema = COMMAND_SCHEMA_MAP.get(target);
  if (!commandSchema) {
    report.message = `unknown command schema: ${target}`;
    report.issues = [report.message];
    stderr.write(`[opentree] ${report.message}\n`);
    if (json) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  report.ok = true;
  report.message = `loaded CLI schema for ${target}`;
  report.result = {
    command: commandSchema
  };
  report.stage = "load";
  if (json) {
    writeJsonReport(stdout, report);
  } else {
    stdout.write(`${renderSchemaText(commandSchema)}\n`);
  }
  return 0;
}

module.exports = {
  CLI_COMMAND_SCHEMAS,
  runSchemaCommand
};
