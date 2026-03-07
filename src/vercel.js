const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { CONFIG_FILE_NAME, inspectVercelAuth, loadValidatedConfig } = require("./preflight");
const { OUTPUT_DIR_NAME } = require("./build");

const VERCEL_DIR_NAME = ".vercel";
const VERCEL_PROJECT_FILE_NAME = "project.json";

function getVercelProjectFilePath(baseDir = process.cwd()) {
  return path.join(baseDir, VERCEL_DIR_NAME, VERCEL_PROJECT_FILE_NAME);
}

function sanitizeVercelProjectLink(link) {
  if (!link || typeof link !== "object" || Array.isArray(link)) {
    throw new Error("Vercel project link must be a JSON object.");
  }

  const project = {};

  if (typeof link.projectId === "string" && link.projectId.trim().length > 0) {
    project.projectId = link.projectId.trim();
  }

  if (typeof link.orgId === "string" && link.orgId.trim().length > 0) {
    project.orgId = link.orgId.trim();
  }

  if (typeof link.projectName === "string" && link.projectName.trim().length > 0) {
    project.projectName = link.projectName.trim();
  }

  if (!project.projectId || !project.orgId) {
    throw new Error("Vercel project link must include non-empty projectId and orgId fields.");
  }

  return project;
}

async function loadVercelProjectLink(baseDir = process.cwd()) {
  const projectFilePath = getVercelProjectFilePath(baseDir);
  const raw = await fs.readFile(projectFilePath, "utf8");
  const parsed = JSON.parse(raw);

  return {
    project: sanitizeVercelProjectLink(parsed),
    projectFilePath
  };
}

async function saveVercelProjectLink(baseDir = process.cwd(), projectLink) {
  const project = sanitizeVercelProjectLink(projectLink);
  const projectFilePath = getVercelProjectFilePath(baseDir);

  await fs.mkdir(path.dirname(projectFilePath), { recursive: true });
  await fs.writeFile(projectFilePath, JSON.stringify(project, null, 2) + "\n", "utf8");

  return {
    project,
    projectFilePath
  };
}

async function inspectVercelProjectLink(baseDir = process.cwd()) {
  try {
    const loaded = await loadVercelProjectLink(baseDir);

    return {
      ok: true,
      linked: true,
      project: loaded.project,
      projectFilePath: loaded.projectFilePath
    };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {
        ok: false,
        kind: "missing",
        linked: false,
        projectFilePath: getVercelProjectFilePath(baseDir)
      };
    }

    if (error instanceof SyntaxError) {
      return {
        ok: false,
        kind: "invalid_json",
        linked: false,
        message: error.message,
        projectFilePath: getVercelProjectFilePath(baseDir)
      };
    }

    if (error instanceof Error) {
      return {
        ok: false,
        kind: "invalid",
        linked: false,
        message: error.message,
        projectFilePath: getVercelProjectFilePath(baseDir)
      };
    }

    throw error;
  }
}

async function syncVercelProjectLink(sourceBaseDir = process.cwd(), targetBaseDir) {
  const loaded = await loadVercelProjectLink(sourceBaseDir);
  return saveVercelProjectLink(targetBaseDir, loaded.project);
}

async function removeOptionalVercelProjectLink(baseDir = process.cwd()) {
  const projectFilePath = getVercelProjectFilePath(baseDir);
  const vercelDirPath = path.dirname(projectFilePath);

  try {
    await fs.unlink(projectFilePath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {
        removed: false,
        projectFilePath,
        vercelDirPath
      };
    }

    throw error;
  }

  try {
    await fs.rmdir(vercelDirPath);
  } catch (error) {
    if (
      error &&
      (error.code === "ENOENT" || error.code === "ENOTEMPTY" || error.code === "EEXIST")
    ) {
      return {
        removed: true,
        projectFilePath,
        vercelDirPath
      };
    }

    throw error;
  }

  return {
    removed: true,
    projectFilePath,
    vercelDirPath
  };
}

function parseVercelLinkArgs(args) {
  if (args.length === 0) {
    return {};
  }

  throw new Error("usage: opentree vercel link");
}

function parseVercelUnlinkArgs(args) {
  if (args.length === 0) {
    return {};
  }

  throw new Error("usage: opentree vercel unlink");
}

async function runVercelLink(io, args = [], deps = {}) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const env = io.env ?? process.env;
  const spawnImpl = deps.spawn ?? spawn;
  const loadConfigImpl = deps.loadConfig;
  const inspectAuthImpl = deps.inspectVercelAuth ?? inspectVercelAuth;
  const inspectLinkImpl = deps.inspectVercelProjectLink ?? inspectVercelProjectLink;
  const saveLinkImpl = deps.saveVercelProjectLink ?? saveVercelProjectLink;

  try {
    parseVercelLinkArgs(args);
  } catch (error) {
    stderr.write(`[opentree] ${error.message}\n`);
    return 1;
  }

  const configState = await loadValidatedConfig(cwd, loadConfigImpl);
  if (!configState.ok) {
    if (configState.kind === "missing") {
      stderr.write(`[opentree] ${CONFIG_FILE_NAME} was not found in ${cwd}\n`);
      stderr.write("[opentree] run `opentree init` first to create a starter config\n");
      return 1;
    }

    if (configState.kind === "invalid_json") {
      stderr.write(`[opentree] ${CONFIG_FILE_NAME} is not valid JSON\n`);
      stderr.write(`[opentree] ${configState.message}\n`);
      return 1;
    }

    stderr.write("[opentree] cannot link this project because the config is invalid\n");
    configState.errors.forEach((error) => {
      stderr.write(`- ${error}\n`);
    });
    return 1;
  }

  stderr.write("[opentree] checking Vercel authentication\n");
  const vercelState = await inspectAuthImpl({
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

  stderr.write("[opentree] linking project root with Vercel CLI\n");

  const exitCode = await new Promise((resolve, reject) => {
    let settled = false;
    const child = spawnImpl("vercel", ["link"], {
      cwd,
      env,
      stdio: "inherit"
    });

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
      resolve(code ?? 1);
    });
  });

  if (exitCode !== 0) {
    stderr.write(`[opentree] Vercel link failed with exit code ${exitCode}\n`);
    return exitCode;
  }

  const linkState = await inspectLinkImpl(cwd);
  if (!linkState.ok) {
    stderr.write("[opentree] Vercel link completed, but no reusable project link was found\n");
    stderr.write("[opentree] expected `.vercel/project.json` to be created in the project root\n");

    if (linkState.message) {
      stderr.write(`[opentree] ${linkState.message}\n`);
    }

    return 1;
  }

  const savedLink = await saveLinkImpl(cwd, linkState.project);
  stdout.write(
    `[opentree] stored Vercel project link at ${path.relative(cwd, savedLink.projectFilePath)}\n`
  );

  if (savedLink.project.projectName) {
    stdout.write(`[opentree] linked project: ${savedLink.project.projectName}\n`);
  }

  return 0;
}

async function runVercelUnlink(io, args = [], deps = {}) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const removeLinkImpl = deps.removeVercelProjectLink ?? removeOptionalVercelProjectLink;
  const pathsToClean = [cwd, path.join(cwd, OUTPUT_DIR_NAME)];

  try {
    parseVercelUnlinkArgs(args);
  } catch (error) {
    stderr.write(`[opentree] ${error.message}\n`);
    return 1;
  }

  const removalResults = await Promise.all(pathsToClean.map((targetDir) => removeLinkImpl(targetDir)));
  const removedResults = removalResults.filter((result) => result.removed);

  if (removedResults.length === 0) {
    stdout.write("[opentree] no local Vercel project link was found\n");
    return 0;
  }

  removedResults.forEach((result) => {
    stdout.write(
      `[opentree] removed ${path.relative(cwd, result.projectFilePath) || VERCEL_PROJECT_FILE_NAME}\n`
    );
  });
  stdout.write("[opentree] local Vercel project linkage cleared\n");

  return 0;
}

async function runVercelCommand(io, args = [], deps = {}) {
  const stderr = io.stderr ?? process.stderr;
  const [subcommand, ...rest] = args;

  if (subcommand === "link") {
    return runVercelLink(io, rest, deps);
  }

  if (subcommand === "unlink") {
    return runVercelUnlink(io, rest, deps);
  }

  stderr.write("[opentree] usage: opentree vercel <link|unlink>\n");
  return 1;
}

module.exports = {
  VERCEL_DIR_NAME,
  VERCEL_PROJECT_FILE_NAME,
  getVercelProjectFilePath,
  inspectVercelProjectLink,
  loadVercelProjectLink,
  removeOptionalVercelProjectLink,
  runVercelCommand,
  runVercelLink,
  runVercelUnlink,
  sanitizeVercelProjectLink,
  saveVercelProjectLink,
  syncVercelProjectLink
};
