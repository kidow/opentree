const { spawn } = require("node:child_process");
const { CONFIG_FILE_NAME, hasSiteUrl, inspectVercelAuth, loadValidatedConfig } = require("./preflight");

function writeCheck(stdout, status, label, message) {
  stdout.write(`[${status}] ${label}: ${message}\n`);
}

async function runDoctor(io, args = [], deps = {}) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const env = io.env ?? process.env;
  const loadConfigImpl = deps.loadConfig;
  const spawnImpl = deps.spawn ?? spawn;
  let failureCount = 0;

  if (args.length > 0) {
    stderr.write("[opentree] usage: opentree doctor\n");
    return 1;
  }

  stdout.write("[opentree] doctor report\n");

  const configState = await loadValidatedConfig(cwd, loadConfigImpl);
  let configForSiteCheck = null;

  if (configState.ok) {
    writeCheck(stdout, "pass", "config", `${CONFIG_FILE_NAME} is valid`);
    configForSiteCheck = configState.config;
  } else if (configState.kind === "missing") {
    failureCount += 1;
    writeCheck(stdout, "fail", "config", `${CONFIG_FILE_NAME} was not found in ${cwd}`);
    stdout.write("  hint: run `opentree init` first to create a starter config\n");
  } else if (configState.kind === "invalid_json") {
    failureCount += 1;
    writeCheck(stdout, "fail", "config", `${CONFIG_FILE_NAME} is not valid JSON`);
    stdout.write(`  hint: ${configState.message}\n`);
  } else {
    failureCount += 1;
    configForSiteCheck = configState.config ?? null;
    writeCheck(stdout, "fail", "config", `${CONFIG_FILE_NAME} has validation issues`);
    configState.errors.forEach((error) => {
      stdout.write(`  - ${error}\n`);
    });
  }

  if (configForSiteCheck) {
    if (hasSiteUrl(configForSiteCheck)) {
      writeCheck(stdout, "pass", "siteUrl", `configured as ${configForSiteCheck.siteUrl}`);
    } else {
      failureCount += 1;
      writeCheck(stdout, "fail", "siteUrl", "missing from opentree.config.json");
      stdout.write("  hint: run `opentree site set --url <your-production-url>`\n");
    }
  } else {
    writeCheck(stdout, "skip", "siteUrl", "could not be checked because the config is unavailable");
  }

  const vercelState = await inspectVercelAuth({
    cwd,
    env,
    spawnImpl
  });

  if (!vercelState.installed) {
    failureCount += 1;
    writeCheck(stdout, "fail", "vercel", "CLI is not installed");
    stdout.write("  hint: install it with `npm install -g vercel`\n");
    writeCheck(stdout, "skip", "vercel auth", "could not be checked because the Vercel CLI is unavailable");
  } else {
    writeCheck(stdout, "pass", "vercel", "CLI is installed");

    if (vercelState.authenticated) {
      const username = vercelState.username ? ` as ${vercelState.username}` : "";
      writeCheck(stdout, "pass", "vercel auth", `logged in${username}`);
    } else {
      failureCount += 1;
      writeCheck(stdout, "fail", "vercel auth", "CLI is not logged in");
      if (vercelState.message) {
        stdout.write(`  hint: ${vercelState.message}\n`);
      }
      stdout.write("  hint: run `vercel login`\n");
    }
  }

  if (failureCount === 0) {
    stdout.write("[opentree] doctor found no issues\n");
    return 0;
  }

  stdout.write(`[opentree] doctor found ${failureCount} issue(s)\n`);
  return 1;
}

module.exports = {
  runDoctor
};
