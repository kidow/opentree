const { spawn } = require("node:child_process");
const { CONFIG_FILE_NAME, hasSiteUrl, inspectVercelAuth, loadValidatedConfig } = require("./preflight");
const {
  createDiagnosticCheck,
  createDiagnosticReport,
  renderDiagnosticTextReport
} = require("./diagnostics");
const { collectVercelStatus } = require("./vercel");

function parseDoctorArgs(args) {
  if (args.length === 0) {
    return { json: false };
  }

  if (args.length === 1 && args[0] === "--json") {
    return { json: true };
  }

  throw new Error("usage: opentree doctor [--json]");
}

async function createDoctorReport(cwd, env, deps = {}) {
  const loadConfigImpl = deps.loadConfig;
  const checks = [];
  const result = {
    config: {
      kind: "missing",
      ok: false
    },
    siteUrl: {
      configured: false,
      value: ""
    },
    vercel: null
  };

  const configState = await loadValidatedConfig(cwd, loadConfigImpl);
  let configForSiteCheck = null;

  if (configState.ok) {
    result.config = {
      kind: "valid",
      ok: true
    };
    checks.push(createDiagnosticCheck("config", "pass", `${CONFIG_FILE_NAME} is valid`));
    configForSiteCheck = configState.config;
  } else if (configState.kind === "missing") {
    checks.push(
      createDiagnosticCheck("config", "fail", `${CONFIG_FILE_NAME} was not found in ${cwd}`, [
        "run `opentree init` first to create a starter config"
      ])
    );
  } else if (configState.kind === "invalid_json") {
    result.config = {
      kind: "invalid_json",
      ok: false
    };
    checks.push(
      createDiagnosticCheck("config", "fail", `${CONFIG_FILE_NAME} is not valid JSON`, [
        configState.message
      ])
    );
  } else {
    result.config = {
      kind: "invalid",
      ok: false
    };
    configForSiteCheck = configState.config ?? null;
    checks.push(
      createDiagnosticCheck(
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
      result.siteUrl = {
        configured: true,
        value: configForSiteCheck.siteUrl
      };
      checks.push(
        createDiagnosticCheck("siteUrl", "pass", `configured as ${configForSiteCheck.siteUrl}`)
      );
    } else {
      checks.push(
        createDiagnosticCheck("siteUrl", "fail", "missing from opentree.config.json", [
          "run `opentree site set --url <your-production-url>`"
        ])
      );
    }
  } else {
    checks.push(
      createDiagnosticCheck(
        "siteUrl",
        "skip",
        "could not be checked because the config is unavailable"
      )
    );
  }

  const vercelStatus = await collectVercelStatus(cwd, env, {
    spawn: deps.spawn ?? spawn,
    inspectVercelAuth: deps.inspectVercelAuth ?? inspectVercelAuth,
    inspectVercelProjectLink: deps.inspectVercelProjectLink
  });

  result.vercel = vercelStatus.result;
  checks.push(...vercelStatus.checks);

  return createDiagnosticReport("doctor", cwd, checks, result);
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
    renderDiagnosticTextReport(stdout, "doctor report", report);
  }

  return report.ok ? 0 : 1;
}

module.exports = {
  createDoctorReport,
  runDoctor
};
