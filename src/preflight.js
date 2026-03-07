const { spawn } = require("node:child_process");
const { loadConfig, validateConfig } = require("./config");
const { CONFIG_FILE_NAME } = require("./init");

function hasSiteUrl(config) {
  return typeof config?.siteUrl === "string" && config.siteUrl.trim().length > 0;
}

async function loadValidatedConfig(cwd = process.cwd(), loadConfigImpl = loadConfig) {
  let loadedConfig;

  try {
    loadedConfig = await loadConfigImpl(cwd);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {
        ok: false,
        kind: "missing",
        cwd
      };
    }

    if (error instanceof SyntaxError) {
      return {
        ok: false,
        kind: "invalid_json",
        message: error.message
      };
    }

    throw error;
  }

  const errors = validateConfig(loadedConfig.config);
  if (errors.length > 0) {
    return {
      ok: false,
      kind: "invalid",
      config: loadedConfig.config,
      errors
    };
  }

  return {
    ok: true,
    config: loadedConfig.config
  };
}

async function runCapturedCommand(
  spawnImpl = spawn,
  command,
  args,
  options
) {
  return await new Promise((resolve) => {
    let settled = false;
    let stdout = "";
    let stderr = "";

    const child = spawnImpl(command, args, options);

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
    }

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve({ error, stderr, stdout });
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve({ code: code ?? 1, stderr, stdout });
    });
  });
}

async function inspectVercelAuth({
  cwd = process.cwd(),
  env = process.env,
  spawnImpl = spawn
} = {}) {
  const result = await runCapturedCommand(spawnImpl, "vercel", ["whoami"], {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.error) {
    if (result.error.code === "ENOENT") {
      return {
        ok: false,
        installed: false,
        authenticated: false,
        kind: "missing_cli"
      };
    }

    throw result.error;
  }

  if (result.code !== 0) {
    return {
      ok: false,
      installed: true,
      authenticated: false,
      kind: "not_logged_in",
      message: result.stderr.trim()
    };
  }

  return {
    ok: true,
    installed: true,
    authenticated: true,
    username: result.stdout.trim()
  };
}

module.exports = {
  CONFIG_FILE_NAME,
  hasSiteUrl,
  inspectVercelAuth,
  loadValidatedConfig
};
