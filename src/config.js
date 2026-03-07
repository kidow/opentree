const fs = require("node:fs/promises");
const path = require("node:path");
const { CONFIG_FILE_NAME } = require("./init");

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidHexColor(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
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

async function loadConfig(cwd = process.cwd()) {
  const configPath = path.join(cwd, CONFIG_FILE_NAME);
  const raw = await fs.readFile(configPath, "utf8");

  return {
    configPath,
    config: JSON.parse(raw)
  };
}

async function saveConfig(cwd = process.cwd(), config) {
  const configPath = path.join(cwd, CONFIG_FILE_NAME);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");

  return {
    configPath,
    config
  };
}

function validateConfig(config) {
  const errors = [];

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return ["Config must be a JSON object."];
  }

  if (!config.profile || typeof config.profile !== "object" || Array.isArray(config.profile)) {
    errors.push("profile must be an object.");
  } else {
    if (!isNonEmptyString(config.profile.name)) {
      errors.push("profile.name must be a non-empty string.");
    }

    if (typeof config.profile.bio !== "string") {
      errors.push("profile.bio must be a string.");
    }

    if (typeof config.profile.avatarUrl !== "string") {
      errors.push("profile.avatarUrl must be a string.");
    } else if (config.profile.avatarUrl !== "" && !isValidUrl(config.profile.avatarUrl)) {
      errors.push("profile.avatarUrl must be an http or https URL when provided.");
    }
  }

  if (!Array.isArray(config.links) || config.links.length === 0) {
    errors.push("links must be a non-empty array.");
  } else {
    config.links.forEach((link, index) => {
      if (!link || typeof link !== "object" || Array.isArray(link)) {
        errors.push(`links[${index}] must be an object.`);
        return;
      }

      if (!isNonEmptyString(link.title)) {
        errors.push(`links[${index}].title must be a non-empty string.`);
      }

      if (!isValidUrl(link.url)) {
        errors.push(`links[${index}].url must be an http or https URL.`);
      }
    });
  }

  if (!config.theme || typeof config.theme !== "object" || Array.isArray(config.theme)) {
    errors.push("theme must be an object.");
  } else {
    if (!isValidHexColor(config.theme.accentColor)) {
      errors.push("theme.accentColor must be a hex color like #166534.");
    }

    if (!isValidHexColor(config.theme.backgroundColor)) {
      errors.push("theme.backgroundColor must be a hex color like #f0fdf4.");
    }

    if (!isValidHexColor(config.theme.textColor)) {
      errors.push("theme.textColor must be a hex color like #052e16.");
    }
  }

  return errors;
}

module.exports = {
  loadConfig,
  saveConfig,
  validateConfig
};
