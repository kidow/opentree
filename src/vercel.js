const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { CONFIG_FILE_NAME, inspectVercelAuth, loadValidatedConfig } = require("./preflight");
const { OUTPUT_DIR_NAME } = require("./build");
const {
  createDiagnosticCheck,
  createDiagnosticReport,
  renderDiagnosticTextReport
} = require("./diagnostics");

const VERCEL_DIR_NAME = ".vercel";
const VERCEL_PROJECT_FILE_NAME = "project.json";

function writeJsonReport(stdout, report) {
  stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function createVercelReport(cwd, command) {
  return {
    command,
    cwd,
    issues: [],
    message: "",
    ok: false,
    projectFilePath: getVercelProjectFilePath(cwd),
    result: null,
    stage: "args"
  };
}

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
  let json = false;

  for (const arg of args) {
    if (arg === "--json") {
      json = true;
      continue;
    }

    throw new Error("usage: opentree vercel link [--json]");
  }

  return { json };
}

function parseVercelUnlinkArgs(args) {
  let json = false;

  for (const arg of args) {
    if (arg === "--json") {
      json = true;
      continue;
    }

    throw new Error("usage: opentree vercel unlink [--json]");
  }

  return { json };
}

function parseVercelStatusArgs(args) {
  let json = false;

  for (const arg of args) {
    if (arg === "--json") {
      json = true;
      continue;
    }

    throw new Error("usage: opentree vercel status [--json]");
  }

  return { json };
}

async function runVercelLink(io, args = [], deps = {}) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const env = io.env ?? process.env;
  const requestedJson = args.includes("--json");
  const report = createVercelReport(cwd, "vercel link");
  const spawnImpl = deps.spawn ?? spawn;
  const loadConfigImpl = deps.loadConfig;
  const inspectAuthImpl = deps.inspectVercelAuth ?? inspectVercelAuth;
  const inspectLinkImpl = deps.inspectVercelProjectLink ?? inspectVercelProjectLink;
  const saveLinkImpl = deps.saveVercelProjectLink ?? saveVercelProjectLink;
  let options;

  try {
    options = parseVercelLinkArgs(args);
  } catch (error) {
    report.message = error.message;
    stderr.write(`[opentree] ${error.message}\n`);
    if (requestedJson) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  const { json } = options;
  const statusOut = json ? stderr : stdout;
  const configState = await loadValidatedConfig(cwd, loadConfigImpl);
  if (!configState.ok) {
    report.stage = "load";

    if (configState.kind === "missing") {
      report.message = `${CONFIG_FILE_NAME} was not found in ${cwd}`;
      stderr.write(`[opentree] ${CONFIG_FILE_NAME} was not found in ${cwd}\n`);
      stderr.write("[opentree] run `opentree init` first to create a starter config\n");
      if (json) {
        writeJsonReport(stdout, report);
      }
      return 1;
    }

    if (configState.kind === "invalid_json") {
      report.message = `${CONFIG_FILE_NAME} is not valid JSON`;
      report.issues = [configState.message];
      stderr.write(`[opentree] ${CONFIG_FILE_NAME} is not valid JSON\n`);
      stderr.write(`[opentree] ${configState.message}\n`);
      if (json) {
        writeJsonReport(stdout, report);
      }
      return 1;
    }

    report.stage = "validate";
    report.message = "cannot link this project because the config is invalid";
    report.issues = configState.errors;
    stderr.write("[opentree] cannot link this project because the config is invalid\n");
    configState.errors.forEach((error) => {
      stderr.write(`- ${error}\n`);
    });
    if (json) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  report.stage = "auth";
  stderr.write("[opentree] checking Vercel authentication\n");
  const vercelState = await inspectAuthImpl({
    cwd,
    env,
    spawnImpl
  });

  if (!vercelState.ok) {
    if (!vercelState.installed) {
      report.message = "Vercel CLI not found. Install it with `npm install -g vercel`";
      stderr.write("[opentree] Vercel CLI not found. Install it with `npm install -g vercel`\n");
      if (json) {
        writeJsonReport(stdout, report);
      }
      return 1;
    }

    if (vercelState.message) {
      report.issues = [vercelState.message];
      stderr.write(`${vercelState.message}\n`);
    }

    report.message = "Vercel CLI is not logged in. Run `vercel login` and try again";
    stderr.write("[opentree] Vercel CLI is not logged in. Run `vercel login` and try again\n");
    if (json) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  if (vercelState.username) {
    stderr.write(`[opentree] Vercel CLI authenticated as ${vercelState.username}\n`);
  }

  report.stage = "link";
  stderr.write("[opentree] linking project root with Vercel CLI\n");

  const exitCode = await new Promise((resolve, reject) => {
    let settled = false;
    const child = spawnImpl("vercel", ["link"], {
      cwd,
      env,
      stdio: json ? ["inherit", "pipe", "pipe"] : "inherit"
    });

    if (json) {
      if (child.stdout) {
        child.stdout.pipe(stderr, { end: false });
      }

      if (child.stderr) {
        child.stderr.pipe(stderr, { end: false });
      }
    }

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;

      if (error && error.code === "ENOENT") {
        report.message = "Vercel CLI not found. Install it with `npm install -g vercel`";
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
    report.message = `Vercel link failed with exit code ${exitCode}`;
    stderr.write(`[opentree] Vercel link failed with exit code ${exitCode}\n`);
    if (json) {
      writeJsonReport(stdout, report);
    }
    return exitCode;
  }

  report.stage = "inspect";
  const linkState = await inspectLinkImpl(cwd);
  if (!linkState.ok) {
    report.message = "Vercel link completed, but no reusable project link was found";
    report.issues = linkState.message ? [linkState.message] : [];
    stderr.write("[opentree] Vercel link completed, but no reusable project link was found\n");
    stderr.write("[opentree] expected `.vercel/project.json` to be created in the project root\n");

    if (linkState.message) {
      stderr.write(`[opentree] ${linkState.message}\n`);
    }

    if (json) {
      writeJsonReport(stdout, report);
    }

    return 1;
  }

  report.stage = "save";
  const savedLink = await saveLinkImpl(cwd, linkState.project);
  report.ok = true;
  report.message = `stored Vercel project link at ${path.relative(cwd, savedLink.projectFilePath)}`;
  report.projectFilePath = savedLink.projectFilePath;
  report.result = {
    linked: true,
    project: savedLink.project,
    projectFilePath: savedLink.projectFilePath
  };

  statusOut.write(
    `[opentree] stored Vercel project link at ${path.relative(cwd, savedLink.projectFilePath)}\n`
  );

  if (savedLink.project.projectName) {
    statusOut.write(`[opentree] linked project: ${savedLink.project.projectName}\n`);
  }

  if (json) {
    writeJsonReport(stdout, report);
  }

  return 0;
}

async function runVercelUnlink(io, args = [], deps = {}) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const requestedJson = args.includes("--json");
  const report = createVercelReport(cwd, "vercel unlink");
  const removeLinkImpl = deps.removeVercelProjectLink ?? removeOptionalVercelProjectLink;
  const pathsToClean = [cwd, path.join(cwd, OUTPUT_DIR_NAME)];
  let options;

  try {
    options = parseVercelUnlinkArgs(args);
  } catch (error) {
    report.message = error.message;
    stderr.write(`[opentree] ${error.message}\n`);
    if (requestedJson) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  const { json } = options;
  const statusOut = json ? stderr : stdout;
  report.stage = "remove";
  const removalResults = await Promise.all(pathsToClean.map((targetDir) => removeLinkImpl(targetDir)));
  const removedResults = removalResults.filter((result) => result.removed);

  if (removedResults.length === 0) {
    report.ok = true;
    report.message = "no local Vercel project link was found";
    report.result = {
      removedCount: 0,
      removedPaths: []
    };
    statusOut.write("[opentree] no local Vercel project link was found\n");
    if (json) {
      writeJsonReport(stdout, report);
    }
    return 0;
  }

  removedResults.forEach((result) => {
    statusOut.write(
      `[opentree] removed ${path.relative(cwd, result.projectFilePath) || VERCEL_PROJECT_FILE_NAME}\n`
    );
  });
  statusOut.write("[opentree] local Vercel project linkage cleared\n");
  report.ok = true;
  report.message = "local Vercel project linkage cleared";
  report.result = {
    removedCount: removedResults.length,
    removedPaths: removedResults.map((result) => result.projectFilePath)
  };
  if (json) {
    writeJsonReport(stdout, report);
  }

  return 0;
}

async function collectVercelStatus(cwd, env, deps = {}) {
  const spawnImpl = deps.spawn ?? spawn;
  const inspectAuthImpl = deps.inspectVercelAuth ?? inspectVercelAuth;
  const inspectLinkImpl = deps.inspectVercelProjectLink ?? inspectVercelProjectLink;
  const checks = [];

  const vercelState = await inspectAuthImpl({
    cwd,
    env,
    spawnImpl
  });

  const result = {
    auth: {
      authenticated: false,
      checked: false,
      installed: false,
      username: ""
    },
    cli: {
      installed: false
    },
    link: {
      kind: "missing",
      linked: false,
      project: null,
      projectFilePath: getVercelProjectFilePath(cwd)
    }
  };

  if (!vercelState.installed) {
    checks.push(
      createDiagnosticCheck("vercel", "fail", "CLI is not installed", [
        "install it with `npm install -g vercel`"
      ])
    );
    checks.push(
      createDiagnosticCheck(
        "vercel auth",
        "skip",
        "could not be checked because the Vercel CLI is unavailable"
      )
    );
  } else {
    result.cli.installed = true;
    result.auth.installed = true;
    result.auth.checked = true;
    checks.push(createDiagnosticCheck("vercel", "pass", "CLI is installed"));

    if (vercelState.authenticated) {
      result.auth.authenticated = true;
      result.auth.username = vercelState.username ?? "";
      const username = vercelState.username ? ` as ${vercelState.username}` : "";
      checks.push(createDiagnosticCheck("vercel auth", "pass", `logged in${username}`));
    } else {
      result.auth.authenticated = false;
      checks.push(
        createDiagnosticCheck(
          "vercel auth",
          "fail",
          "CLI is not logged in",
          [
            ...(vercelState.message ? [vercelState.message] : []),
            "run `vercel login`"
          ]
        )
      );
    }
  }

  const linkState = await inspectLinkImpl(cwd);
  result.link.projectFilePath = linkState.projectFilePath ?? result.link.projectFilePath;

  if (linkState.ok) {
    result.link.kind = "linked";
    result.link.linked = true;
    result.link.project = linkState.project;
    const linkedProject = linkState.project.projectName
      ? `${linkState.project.projectName} (${linkState.project.projectId})`
      : linkState.project.projectId;
    checks.push(
      createDiagnosticCheck(
        "vercel link",
        "pass",
        `project root is linked to ${linkedProject}`
      )
    );
  } else {
    result.link.kind = linkState.kind ?? "missing";
    result.link.linked = false;
    result.link.project = null;
    const hints = ["run `opentree vercel link` to create a reusable root-level project link"];

    if (linkState.kind === "invalid_json" || linkState.kind === "invalid") {
      checks.push(
        createDiagnosticCheck(
          "vercel link",
          "fail",
          "root Vercel project link is invalid",
          hints,
          linkState.message ? [linkState.message] : []
        )
      );
    } else {
      checks.push(
        createDiagnosticCheck(
          "vercel link",
          "fail",
          "root Vercel project link was not found",
          hints
        )
      );
    }
  }

  return {
    checks,
    result
  };
}

async function createVercelStatusReport(cwd, env, deps = {}) {
  const status = await collectVercelStatus(cwd, env, deps);
  return createDiagnosticReport("vercel status", cwd, status.checks, status.result);
}

async function runVercelStatus(io, args = [], deps = {}) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const env = io.env ?? process.env;
  const requestedJson = args.includes("--json");
  let options;

  try {
    options = parseVercelStatusArgs(args);
  } catch (error) {
    stderr.write(`[opentree] ${error.message}\n`);
    if (requestedJson) {
      writeJsonReport(stdout, {
        ...createVercelReport(cwd, "vercel status"),
        issues: [error.message],
        message: error.message
      });
    }
    return 1;
  }

  const report = await createVercelStatusReport(cwd, env, deps);

  if (options.json) {
    writeJsonReport(stdout, report);
  } else {
    renderDiagnosticTextReport(stdout, "vercel status", report);
  }

  return report.ok ? 0 : 1;
}

async function runVercelCommand(io, args = [], deps = {}) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const [subcommand, ...rest] = args;
  const requestedJson = args.includes("--json");

  if (subcommand === "link") {
    return runVercelLink(io, rest, deps);
  }

  if (subcommand === "unlink") {
    return runVercelUnlink(io, rest, deps);
  }

  if (subcommand === "status") {
    return runVercelStatus(io, rest, deps);
  }

  stderr.write("[opentree] usage: opentree vercel <link|unlink|status>\n");
  if (requestedJson) {
    writeJsonReport(stdout, {
      ...createVercelReport(cwd, "vercel"),
      issues: ["usage: opentree vercel <link|unlink|status>"],
      message: "usage: opentree vercel <link|unlink|status>"
    });
  }
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
  runVercelStatus,
  runVercelUnlink,
  sanitizeVercelProjectLink,
  saveVercelProjectLink,
  syncVercelProjectLink,
  collectVercelStatus,
  createVercelStatusReport
};
