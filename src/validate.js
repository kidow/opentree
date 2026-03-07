const { CONFIG_FILE_NAME } = require("./init");
const { loadConfig, validateConfig } = require("./config");

function writeJsonReport(stdout, report) {
  stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function parseValidateArgs(args) {
  if (args.length === 0) {
    return { json: false };
  }

  if (args.length === 1 && args[0] === "--json") {
    return { json: true };
  }

  throw new Error("usage: opentree validate [--json]");
}

async function runValidate(io, args = []) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const requestedJson = args.includes("--json");
  let options;
  const report = {
    configPath: `${cwd}/${CONFIG_FILE_NAME}`,
    cwd,
    issueCount: 0,
    issues: [],
    message: "",
    ok: false,
    stage: "args"
  };

  try {
    options = parseValidateArgs(args);
  } catch (error) {
    report.message = error.message;
    stderr.write(`[opentree] ${error.message}\n`);
    if (requestedJson) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  const validateStdout = options.json ? stderr : stdout;

  validateStdout.write(`[opentree] validating ${CONFIG_FILE_NAME}\n`);

  let loadedConfig;
  try {
    loadedConfig = await loadConfig(cwd);
  } catch (error) {
    report.stage = "load";

    if (error && error.code === "ENOENT") {
      report.message = `${CONFIG_FILE_NAME} was not found in ${cwd}`;
      stderr.write(`[opentree] ${CONFIG_FILE_NAME} was not found in ${cwd}\n`);
      stderr.write("[opentree] run `opentree init` first to create a starter config\n");
      if (options.json) {
        writeJsonReport(stdout, report);
      }
      return 1;
    }

    if (error instanceof SyntaxError) {
      report.message = `${CONFIG_FILE_NAME} is not valid JSON`;
      report.issues = [error.message];
      report.issueCount = 1;
      stderr.write(`[opentree] ${CONFIG_FILE_NAME} is not valid JSON\n`);
      stderr.write(`[opentree] ${error.message}\n`);
      if (options.json) {
        writeJsonReport(stdout, report);
      }
      return 1;
    }

    throw error;
  }

  report.configPath = loadedConfig.configPath;
  report.stage = "validate";
  const errors = validateConfig(loadedConfig.config);
  report.issues = errors;
  report.issueCount = errors.length;

  if (errors.length > 0) {
    report.message = `found ${errors.length} validation issue(s)`;
    stderr.write(`[opentree] found ${errors.length} validation issue(s)\n`);
    errors.forEach((error) => {
      stderr.write(`- ${error}\n`);
    });
    if (options.json) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  report.ok = true;
  report.message = `${CONFIG_FILE_NAME} is valid`;
  validateStdout.write(`[opentree] ${CONFIG_FILE_NAME} is valid\n`);
  if (options.json) {
    writeJsonReport(stdout, report);
  }
  return 0;
}

module.exports = {
  parseValidateArgs,
  runValidate
};
