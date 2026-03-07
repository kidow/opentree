const path = require("node:path");
const { spawn } = require("node:child_process");
const { OUTPUT_DIR_NAME, runBuild } = require("./build");
const { CONFIG_FILE_NAME, hasSiteUrl, inspectVercelAuth, loadValidatedConfig } = require("./preflight");
const { inspectVercelProjectLink, syncVercelProjectLink } = require("./vercel");

function parseUrlFromOutput(output) {
  const lines = String(output)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.find((line) => /^https?:\/\//.test(line)) ?? null;
}

function parseInspectUrl(stderrOutput) {
  const lines = String(stderrOutput).split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/Inspect:\s+(https?:\/\/\S+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function writeJsonReport(stdout, report) {
  stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function parseDeployArgs(args) {
  let mode = "preview";
  let modeWasExplicit = false;
  let json = false;

  for (const arg of args) {
    if (arg === "--cwd") {
      throw new Error("--cwd is managed by `opentree deploy`");
    }

    if (arg === "--json") {
      json = true;
      continue;
    }

    if (arg === "--prod" || arg === "--preview") {
      if (modeWasExplicit) {
        throw new Error("choose only one deploy mode: --prod or --preview");
      }

      mode = arg === "--prod" ? "prod" : "preview";
      modeWasExplicit = true;
      continue;
    }

    throw new Error(`unknown option: ${arg}`);
  }

  return {
    json,
    mode,
    vercelArgs: mode === "prod" ? ["--prod"] : []
  };
}

async function runDeploy(io, args = [], deps = {}) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const env = io.env ?? process.env;
  const spawnImpl = deps.spawn ?? spawn;
  const runBuildImpl = deps.runBuild ?? runBuild;
  const loadConfigImpl = deps.loadConfig;
  const inspectLinkImpl = deps.inspectVercelProjectLink ?? inspectVercelProjectLink;
  const syncLinkImpl = deps.syncVercelProjectLink ?? syncVercelProjectLink;
  const requestedJson = args.includes("--json");
  let options;
  let report = {
    cwd,
    deploymentUrl: null,
    inspectUrl: null,
    message: "",
    mode: "preview",
    ok: false,
    outputDir: path.join(cwd, OUTPUT_DIR_NAME),
    project: null,
    projectFilePath: null,
    stage: "args"
  };

  try {
    options = parseDeployArgs(args);
    report.mode = options.mode;
  } catch (error) {
    report.message = error.message;
    stderr.write(`[opentree] ${error.message}\n`);
    if (requestedJson) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  stderr.write("[opentree] preparing deploy bundle\n");
  stderr.write(`[opentree] deploy mode: ${options.mode}\n`);

  const deployConfigState = await loadValidatedConfig(cwd, loadConfigImpl);
  if (!deployConfigState.ok) {
    report.stage = "preflight";

    if (deployConfigState.kind === "missing") {
      report.message = `${CONFIG_FILE_NAME} was not found in ${cwd}`;
      stderr.write(`[opentree] ${CONFIG_FILE_NAME} was not found in ${cwd}\n`);
      stderr.write("[opentree] run `opentree init` first to create a starter config\n");
      if (options.json) {
        writeJsonReport(stdout, report);
      }
      return 1;
    }

    if (deployConfigState.kind === "invalid_json") {
      report.message = `${CONFIG_FILE_NAME} is not valid JSON`;
      stderr.write(`[opentree] ${CONFIG_FILE_NAME} is not valid JSON\n`);
      stderr.write(`[opentree] ${deployConfigState.message}\n`);
      if (options.json) {
        writeJsonReport(stdout, {
          ...report,
          details: [deployConfigState.message]
        });
      }
      return 1;
    }

    report.message = "deploy preflight failed because the config is invalid";
    stderr.write("[opentree] deploy preflight failed because the config is invalid\n");
    deployConfigState.errors.forEach((error) => {
      stderr.write(`- ${error}\n`);
    });
    if (options.json) {
      writeJsonReport(stdout, {
        ...report,
        details: deployConfigState.errors
      });
    }
    return 1;
  }

  if (!hasSiteUrl(deployConfigState.config)) {
    report.stage = "preflight";
    report.message = "deploy preflight failed because siteUrl is missing";
    stderr.write("[opentree] deploy preflight failed because siteUrl is missing\n");
    stderr.write("[opentree] run `opentree site set --url <your-production-url>` and try again\n");
    if (options.json) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  report.stage = "auth";
  stderr.write("[opentree] checking Vercel authentication\n");
  const vercelState = await inspectVercelAuth({
    cwd,
    env,
    spawnImpl
  });
  if (!vercelState.ok) {
    if (!vercelState.installed) {
      report.message = "Vercel CLI not found. Install it with `npm install -g vercel`";
      stderr.write("[opentree] Vercel CLI not found. Install it with `npm install -g vercel`\n");
      if (options.json) {
        writeJsonReport(stdout, report);
      }
      return 1;
    }

    if (vercelState.message) {
      stderr.write(`${vercelState.message}\n`);
    }
    report.message = "Vercel CLI is not logged in. Run `vercel login` and try again";
    stderr.write("[opentree] Vercel CLI is not logged in. Run `vercel login` and try again\n");
    if (options.json) {
      writeJsonReport(stdout, {
        ...report,
        details: vercelState.message ? [vercelState.message] : []
      });
    }
    return 1;
  }

  if (vercelState.username) {
    stderr.write(`[opentree] Vercel CLI authenticated as ${vercelState.username}\n`);
  }

  report.stage = "link";
  const linkState = await inspectLinkImpl(cwd);
  if (!linkState.ok) {
    report.message = "deploy preflight failed because this project is not linked to Vercel";
    stderr.write("[opentree] deploy preflight failed because this project is not linked to Vercel\n");
    stderr.write("[opentree] run `opentree vercel link` and try again\n");

    if (linkState.message) {
      stderr.write(`[opentree] ${linkState.message}\n`);
    }

    if (options.json) {
      writeJsonReport(stdout, {
        ...report,
        details: linkState.message ? [linkState.message] : []
      });
    }
    return 1;
  }

  report.project = linkState.project;
  report.projectFilePath = linkState.projectFilePath;
  report.stage = "build";
  const buildExitCode = await runBuildImpl({
    ...io,
    cwd,
    env,
    stdout: stderr,
    stderr
  });

  if (buildExitCode !== 0) {
    report.message = `build failed with exit code ${buildExitCode}`;
    if (options.json) {
      writeJsonReport(stdout, report);
    }
    return buildExitCode;
  }

  report.stage = "deploy";
  const linkedProject = await syncLinkImpl(cwd, report.outputDir);
  const vercelArgs = ["--cwd", report.outputDir, ...options.vercelArgs];

  stderr.write(`[opentree] deploying ${OUTPUT_DIR_NAME} with Vercel CLI\n`);
  stderr.write(
    `[opentree] synced Vercel project link to ${path.relative(cwd, linkedProject.projectFilePath)}\n`
  );

  return await new Promise((resolve, reject) => {
    let settled = false;
    let deploymentOutput = "";
    let deploymentStderr = "";

    const child = spawnImpl("vercel", vercelArgs, {
      cwd,
      env,
      stdio: ["inherit", "pipe", "pipe"]
    });

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        deploymentOutput += chunk;
        if (!options.json) {
          stdout.write(chunk);
        }
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        deploymentStderr += chunk;
        stderr.write(chunk);
      });
    }

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;

      if (error && error.code === "ENOENT") {
        report.message = "Vercel CLI not found. Install it with `npm install -g vercel`";
        stderr.write("[opentree] Vercel CLI not found. Install it with `npm install -g vercel`\n");
        if (options.json) {
          writeJsonReport(stdout, report);
        }
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

      report.deploymentUrl = parseUrlFromOutput(deploymentOutput);
      report.inspectUrl = parseInspectUrl(deploymentStderr);

      if (code === 0) {
        if (report.deploymentUrl) {
          stderr.write(`[opentree] deployment ready: ${report.deploymentUrl}\n`);
        }
        report.ok = true;
        report.message = report.deploymentUrl
          ? `deployment ready: ${report.deploymentUrl}`
          : "deployment completed";
        report.projectFilePath = linkedProject.projectFilePath;
        if (options.json) {
          writeJsonReport(stdout, report);
        }
        resolve(0);
        return;
      }

      report.message = `Vercel deploy failed with exit code ${code ?? 1}`;
      report.projectFilePath = linkedProject.projectFilePath;
      stderr.write(`[opentree] Vercel deploy failed with exit code ${code ?? 1}\n`);
      if (options.json) {
        writeJsonReport(stdout, report);
      }
      resolve(code ?? 1);
    });
  });
}

module.exports = {
  parseDeployArgs,
  runDeploy
};
