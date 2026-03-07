const { spawn } = require("node:child_process");
const { CONFIG_FILE_NAME, hasSiteUrl, inspectVercelAuth, loadValidatedConfig } = require("./preflight");
const { inspectVercelProjectLink } = require("./vercel");

function parseDoctorArgs(args) {
  if (args.length === 0) {
    return { json: false };
  }

  if (args.length === 1 && args[0] === "--json") {
    return { json: true };
  }

  throw new Error("usage: opentree doctor [--json]");
}

function createCheck(id, status, message, hints = [], details = []) {
  return {
    details,
    hints,
    id,
    message,
    status
  };
}

function renderTextReport(stdout, report) {
  stdout.write("[opentree] doctor report\n");

  report.checks.forEach((check) => {
    stdout.write(`[${check.status}] ${check.id}: ${check.message}\n`);
    check.hints.forEach((hint) => {
      stdout.write(`  hint: ${hint}\n`);
    });
    check.details.forEach((detail) => {
      stdout.write(`  - ${detail}\n`);
    });
  });

  stdout.write(`${report.summary}\n`);
}

async function createDoctorReport(cwd, env, deps = {}) {
  const loadConfigImpl = deps.loadConfig;
  const spawnImpl = deps.spawn ?? spawn;
  const inspectLinkImpl = deps.inspectVercelProjectLink ?? inspectVercelProjectLink;
  const checks = [];
  let failureCount = 0;

  const configState = await loadValidatedConfig(cwd, loadConfigImpl);
  let configForSiteCheck = null;

  if (configState.ok) {
    checks.push(createCheck("config", "pass", `${CONFIG_FILE_NAME} is valid`));
    configForSiteCheck = configState.config;
  } else if (configState.kind === "missing") {
    failureCount += 1;
    checks.push(
      createCheck("config", "fail", `${CONFIG_FILE_NAME} was not found in ${cwd}`, [
        "run `opentree init` first to create a starter config"
      ])
    );
  } else if (configState.kind === "invalid_json") {
    failureCount += 1;
    checks.push(
      createCheck("config", "fail", `${CONFIG_FILE_NAME} is not valid JSON`, [
        configState.message
      ])
    );
  } else {
    failureCount += 1;
    configForSiteCheck = configState.config ?? null;
    checks.push(
      createCheck(
        "config",
        "fail",
        `${CONFIG_FILE_NAME} has validation issues`,
        [],
        configState.errors
      )
    );
  }

  if (configForSiteCheck) {
    if (hasSiteUrl(configForSiteCheck)) {
      checks.push(
        createCheck("siteUrl", "pass", `configured as ${configForSiteCheck.siteUrl}`)
      );
    } else {
      failureCount += 1;
      checks.push(
        createCheck("siteUrl", "fail", "missing from opentree.config.json", [
          "run `opentree site set --url <your-production-url>`"
        ])
      );
    }
  } else {
    checks.push(
      createCheck(
        "siteUrl",
        "skip",
        "could not be checked because the config is unavailable"
      )
    );
  }

  const vercelState = await inspectVercelAuth({
    cwd,
    env,
    spawnImpl
  });

  if (!vercelState.installed) {
    failureCount += 1;
    checks.push(
      createCheck("vercel", "fail", "CLI is not installed", [
        "install it with `npm install -g vercel`"
      ])
    );
    checks.push(
      createCheck(
        "vercel auth",
        "skip",
        "could not be checked because the Vercel CLI is unavailable"
      )
    );
  } else {
    checks.push(createCheck("vercel", "pass", "CLI is installed"));

    if (vercelState.authenticated) {
      const username = vercelState.username ? ` as ${vercelState.username}` : "";
      checks.push(createCheck("vercel auth", "pass", `logged in${username}`));
    } else {
      failureCount += 1;
      checks.push(
        createCheck(
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
  if (linkState.ok) {
    const linkedProject = linkState.project.projectName
      ? `${linkState.project.projectName} (${linkState.project.projectId})`
      : linkState.project.projectId;
    checks.push(
      createCheck(
        "vercel link",
        "pass",
        `project root is linked to ${linkedProject}`
      )
    );
  } else {
    failureCount += 1;
    const hints = ["run `opentree vercel link` to create a reusable root-level project link"];

    if (linkState.kind === "invalid_json" || linkState.kind === "invalid") {
      checks.push(
        createCheck(
          "vercel link",
          "fail",
          "root Vercel project link is invalid",
          hints,
          linkState.message ? [linkState.message] : []
        )
      );
    } else {
      checks.push(
        createCheck(
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
    cwd,
    issueCount: failureCount,
    ok: failureCount === 0,
    summary:
      failureCount === 0
        ? "[opentree] doctor found no issues"
        : `[opentree] doctor found ${failureCount} issue(s)`
  };
}

async function runDoctor(io, args = [], deps = {}) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const env = io.env ?? process.env;
  let options;

  try {
    options = parseDoctorArgs(args);
  } catch (error) {
    stderr.write(`[opentree] ${error.message}\n`);
    return 1;
  }

  const report = await createDoctorReport(cwd, env, deps);

  if (options.json) {
    stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    renderTextReport(stdout, report);
  }

  return report.ok ? 0 : 1;
}

module.exports = {
  createDoctorReport,
  runDoctor
};
