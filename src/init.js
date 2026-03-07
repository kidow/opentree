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
    }
  };
}

async function runInit(io) {
  const cwd = io.cwd ?? process.cwd();
  const configPath = path.join(cwd, CONFIG_FILE_NAME);
  const config = createDefaultConfig();

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
  runInit
};
