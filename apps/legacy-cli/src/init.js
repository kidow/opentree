const fs = require("node:fs/promises");
const path = require("node:path");
const { TEMPLATE_VALUES } = require("./catalog");
const { CONFIG_SCHEMA_VERSION } = require("./schema");

const CONFIG_FILE_NAME = "opentree.config.json";

function writeJsonReport(stdout, report) {
  stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function createInitReport(cwd) {
  return {
    command: "init",
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

function createDefaultConfig() {
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    profile: {
      name: "Your Name",
      bio: "Add a short bio for your opentree page.",
      avatarUrl: ""
    },
    links: [
      {
        title: "GitHub",
        url: "https://github.com/your-handle"
      },
      {
        title: "Website",
        url: "https://example.com"
      }
    ],
    theme: {
      accentColor: "#166534",
      backgroundColor: "#f0fdf4",
      textColor: "#052e16"
    },
    template: "glass",
    siteUrl: "",
    analytics: {
      clickTracking: "off"
    },
    metadata: {
      title: "",
      description: "",
      ogImageUrl: ""
    }
  };
}

function isValidUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function parseInitArgs(args) {
  const overrides = {
    metadata: {},
    profile: {}
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = args[index + 1];

    if (arg === "--name") {
      if (nextValue === undefined) {
        throw new Error("missing value for --name");
      }

      overrides.profile.name = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--bio") {
      if (nextValue === undefined) {
        throw new Error("missing value for --bio");
      }

      overrides.profile.bio = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--avatar-url") {
      if (nextValue === undefined) {
        throw new Error("missing value for --avatar-url");
      }

      overrides.profile.avatarUrl = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--site-url") {
      if (nextValue === undefined) {
        throw new Error("missing value for --site-url");
      }

      overrides.siteUrl = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--title") {
      if (nextValue === undefined) {
        throw new Error("missing value for --title");
      }

      overrides.metadata.title = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--description") {
      if (nextValue === undefined) {
        throw new Error("missing value for --description");
      }

      overrides.metadata.description = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--og-image-url") {
      if (nextValue === undefined) {
        throw new Error("missing value for --og-image-url");
      }

      overrides.metadata.ogImageUrl = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--template") {
      if (nextValue === undefined) {
        throw new Error("missing value for --template");
      }

      overrides.template = nextValue;
      index += 1;
      continue;
    }

    throw new Error(`unknown option: ${arg}`);
  }

  if (
    overrides.profile.name !== undefined &&
    overrides.profile.name.trim().length === 0
  ) {
    throw new Error("--name must be a non-empty string");
  }

  if (
    overrides.profile.avatarUrl !== undefined &&
    overrides.profile.avatarUrl !== "" &&
    !isValidUrl(overrides.profile.avatarUrl)
  ) {
    throw new Error("--avatar-url must be an http or https URL");
  }

  if (
    overrides.siteUrl !== undefined &&
    overrides.siteUrl !== "" &&
    !isValidUrl(overrides.siteUrl)
  ) {
    throw new Error("--site-url must be an http or https URL");
  }

  if (
    overrides.metadata.ogImageUrl !== undefined &&
    overrides.metadata.ogImageUrl !== "" &&
    !isValidUrl(overrides.metadata.ogImageUrl)
  ) {
    throw new Error("--og-image-url must be an http or https URL");
  }

  if (
    overrides.template !== undefined &&
    !TEMPLATE_VALUES.includes(overrides.template)
  ) {
    throw new Error(`--template must be one of: ${TEMPLATE_VALUES.join(", ")}`);
  }

  return overrides;
}

function parseInitCommandArgs(args) {
  const filteredArgs = [];
  let dryRun = false;
  let json = false;

  args.forEach((arg) => {
    if (arg === "--json") {
      json = true;
      return;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      return;
    }

    filteredArgs.push(arg);
  });

  return {
    dryRun,
    json,
    overrides: parseInitArgs(filteredArgs)
  };
}

async function runInit(io, args = []) {
  const cwd = io.cwd ?? process.cwd();
  const configPath = path.join(cwd, CONFIG_FILE_NAME);
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const requestedJson = args.includes("--json");
  const report = createInitReport(cwd);
  let options;

  try {
    options = parseInitCommandArgs(args);
  } catch (error) {
    report.message = error.message;
    stderr.write(`[opentree] ${error.message}\n`);
    if (requestedJson) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  const { dryRun, json, overrides } = options;
  const config = createDefaultConfig();
  config.profile = {
    ...config.profile,
    ...overrides.profile
  };
  config.template = overrides.template ?? config.template;
  config.siteUrl = overrides.siteUrl ?? config.siteUrl;
  config.metadata = {
    ...config.metadata,
    ...overrides.metadata
  };

  if (!json) {
    stdout.write("[opentree] init command received\n");
    stdout.write(`[opentree] target directory: ${cwd}\n`);
  }

  try {
    await fs.access(configPath);
    throw Object.assign(new Error(`${CONFIG_FILE_NAME} already exists`), { code: "EEXIST" });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      // fall through to create or preview the file
    } else {
      report.stage = "write";

      if (error && error.code === "EEXIST") {
        report.message = `init aborted because ${CONFIG_FILE_NAME} already exists`;
        report.issues = [`${CONFIG_FILE_NAME} already exists`];
        stderr.write(`[opentree] ${CONFIG_FILE_NAME} already exists\n`);
        stderr.write("[opentree] init aborted to avoid overwriting your config\n");
        if (json) {
          writeJsonReport(stdout, report);
        }
        return 1;
      }

      throw error;
    }
  }

  if (dryRun) {
    report.stage = "write";
    report.ok = true;
    report.dryRun = true;
    report.stage = "dry-run";
    report.message = `dry run: would create ${CONFIG_FILE_NAME}`;
    report.config = config;
    report.result = {
      created: false,
      dryRun: true
    };

    if (json) {
      writeJsonReport(stdout, report);
      return 0;
    }

    stdout.write(`[opentree] dry run: would create ${CONFIG_FILE_NAME}\n`);
    return 0;
  }

  await fs.writeFile(`${configPath}`, JSON.stringify(config, null, 2) + "\n", {
    flag: "wx"
  });

  report.ok = true;
  report.stage = "write";
  report.message = `created ${CONFIG_FILE_NAME}`;
  report.config = config;
  report.result = {
    created: true
  };

  if (json) {
    writeJsonReport(stdout, report);
    return 0;
  }

  stdout.write(`[opentree] created ${CONFIG_FILE_NAME}\n`);
  stdout.write("[opentree] edit the generated config and continue with the next commands\n");

  return 0;
}

module.exports = {
  CONFIG_FILE_NAME,
  createDefaultConfig,
  createInitReport,
  parseInitArgs,
  parseInitCommandArgs,
  runInit
};
