const path = require("node:path");
const { spawn } = require("node:child_process");
const { OUTPUT_DIR_NAME, runBuild } = require("./build");
const { CONFIG_FILE_NAME, hasSiteUrl, inspectVercelAuth, loadValidatedConfig } = require("./preflight");

function hasManagedArg(args) {
  return args.includes("--cwd");
}

async function runDeploy(io, args = [], deps = {}) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const env = io.env ?? process.env;
  const spawnImpl = deps.spawn ?? spawn;
  const runBuildImpl = deps.runBuild ?? runBuild;
  const loadConfigImpl = deps.loadConfig;

  if (hasManagedArg(args)) {
    stderr.write("[opentree] --cwd is managed by `opentree deploy`\n");
    return 1;
  }

  stderr.write("[opentree] preparing deploy bundle\n");

  const deployConfigState = await loadValidatedConfig(cwd, loadConfigImpl);
  if (!deployConfigState.ok) {
    if (deployConfigState.kind === "missing") {
      stderr.write(`[opentree] ${CONFIG_FILE_NAME} was not found in ${cwd}\n`);
      stderr.write("[opentree] run `opentree init` first to create a starter config\n");
      return 1;
    }

    if (deployConfigState.kind === "invalid_json") {
      stderr.write(`[opentree] ${CONFIG_FILE_NAME} is not valid JSON\n`);
      stderr.write(`[opentree] ${deployConfigState.message}\n`);
      return 1;
    }

    stderr.write("[opentree] deploy preflight failed because the config is invalid\n");
    deployConfigState.errors.forEach((error) => {
      stderr.write(`- ${error}\n`);
    });
    return 1;
  }

  if (!hasSiteUrl(deployConfigState.config)) {
    stderr.write("[opentree] deploy preflight failed because siteUrl is missing\n");
    stderr.write("[opentree] run `opentree site set --url <your-production-url>` and try again\n");
    return 1;
  }

  stderr.write("[opentree] checking Vercel authentication\n");
  const vercelState = await inspectVercelAuth({
    cwd,
    env,
    spawnImpl
  });
  if (!vercelState.ok) {
    if (!vercelState.installed) {
      stderr.write("[opentree] Vercel CLI not found. Install it with `npm install -g vercel`\n");
      return 1;
    }

    if (vercelState.message) {
      stderr.write(`${vercelState.message}\n`);
    }
    stderr.write("[opentree] Vercel CLI is not logged in. Run `vercel login` and try again\n");
    return 1;
  }

  if (vercelState.username) {
    stderr.write(`[opentree] Vercel CLI authenticated as ${vercelState.username}\n`);
  }

  const buildExitCode = await runBuildImpl({
    ...io,
    cwd,
    env,
    stdout: stderr,
    stderr
  });

  if (buildExitCode !== 0) {
    return buildExitCode;
  }

  const outputDir = path.join(cwd, OUTPUT_DIR_NAME);
  const vercelArgs = ["--cwd", outputDir, ...args];

  stderr.write(`[opentree] deploying ${OUTPUT_DIR_NAME} with Vercel CLI\n`);

  return await new Promise((resolve, reject) => {
    let settled = false;
    let deploymentUrl = "";

    const child = spawnImpl("vercel", vercelArgs, {
      cwd,
      env,
      stdio: ["inherit", "pipe", "pipe"]
    });

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        deploymentUrl += chunk;
        stdout.write(chunk);
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr.write(chunk);
      });
    }

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;

      if (error && error.code === "ENOENT") {
        stderr.write("[opentree] Vercel CLI not found. Install it with `npm install -g vercel`\n");
        resolve(1);
        return;
      }

      reject(error);
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;

      if (code === 0) {
        const normalizedUrl = deploymentUrl.trim();
        if (normalizedUrl) {
          stderr.write(`[opentree] deployment ready: ${normalizedUrl}\n`);
        }
        resolve(0);
        return;
      }

      stderr.write(`[opentree] Vercel deploy failed with exit code ${code ?? 1}\n`);
      resolve(code ?? 1);
    });
  });
}

module.exports = {
  runDeploy
};
