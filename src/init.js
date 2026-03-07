const fs = require("node:fs/promises");
const path = require("node:path");

const CONFIG_FILE_NAME = "opentree.config.json";

function createDefaultConfig() {
  return {
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
    siteUrl: "",
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
  const overrides = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = args[index + 1];

    if (arg === "--name") {
      if (nextValue === undefined) {
        throw new Error("missing value for --name");
      }

      overrides.name = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--bio") {
      if (nextValue === undefined) {
        throw new Error("missing value for --bio");
      }

      overrides.bio = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--avatar-url") {
      if (nextValue === undefined) {
        throw new Error("missing value for --avatar-url");
      }

      overrides.avatarUrl = nextValue;
      index += 1;
      continue;
    }

    throw new Error(`unknown option: ${arg}`);
  }

  if (overrides.name !== undefined && overrides.name.trim().length === 0) {
    throw new Error("--name must be a non-empty string");
  }

  if (
    overrides.avatarUrl !== undefined &&
    overrides.avatarUrl !== "" &&
    !isValidUrl(overrides.avatarUrl)
  ) {
    throw new Error("--avatar-url must be an http or https URL");
  }

  return overrides;
}

async function runInit(io, args = []) {
  const cwd = io.cwd ?? process.cwd();
  const configPath = path.join(cwd, CONFIG_FILE_NAME);
  let overrides;

  try {
    overrides = parseInitArgs(args);
  } catch (error) {
    io.stderr.write(`[opentree] ${error.message}\n`);
    return 1;
  }

  const config = createDefaultConfig();
  config.profile = {
    ...config.profile,
    ...overrides
  };

  io.stdout.write("[opentree] init command received\n");
  io.stdout.write(`[opentree] target directory: ${cwd}\n`);

  try {
    await fs.writeFile(`${configPath}`, JSON.stringify(config, null, 2) + "\n", {
      flag: "wx"
    });
  } catch (error) {
    if (error && error.code === "EEXIST") {
      io.stderr.write(`[opentree] ${CONFIG_FILE_NAME} already exists\n`);
      io.stderr.write("[opentree] init aborted to avoid overwriting your config\n");
      return 1;
    }

    throw error;
  }

  io.stdout.write(`[opentree] created ${CONFIG_FILE_NAME}\n`);
  io.stdout.write("[opentree] edit the generated config and continue with the next commands\n");

  return 0;
}

module.exports = {
  CONFIG_FILE_NAME,
  createDefaultConfig,
  parseInitArgs,
  runInit
};
