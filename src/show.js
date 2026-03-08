const { CONFIG_FILE_NAME } = require("./init");
const { loadConfig } = require("./config");

function writeJsonReport(stdout, report) {
  stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

async function loadReadableConfig(io) {
  const cwd = io.cwd ?? process.cwd();

  try {
    const loadedConfig = await loadConfig(cwd);
    return {
      ok: true,
      config: loadedConfig.config,
      configPath: loadedConfig.configPath
    };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {
        ok: false,
        issues: [
          `${CONFIG_FILE_NAME} was not found in ${cwd}`,
          "run `opentree init` first to create a starter config"
        ],
        message: `${CONFIG_FILE_NAME} was not found in ${cwd}`
      };
    }

    if (error instanceof SyntaxError) {
      return {
        ok: false,
        issues: [error.message],
        message: `${CONFIG_FILE_NAME} is not valid JSON`
      };
    }

    throw error;
  }
}

async function runConfigCommand(io, args = []) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const [subcommand, ...rest] = args;
  const requestedJson = args.includes("--json");
  const report = {
    command: "config show",
    configPath: `${cwd}/${CONFIG_FILE_NAME}`,
    cwd,
    issues: [],
    message: "",
    ok: false,
    result: null,
    stage: "args"
  };

  if (subcommand !== "show") {
    report.message = "usage: opentree config show [--json|--pretty]";
    report.issues = [report.message];
    stderr.write("[opentree] usage: opentree config show [--json|--pretty]\n");
    if (requestedJson) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  let format = "pretty";

  for (const arg of rest) {
    if (arg === "--pretty") {
      format = "pretty";
      continue;
    }

    if (arg === "--json") {
      format = "json";
      continue;
    }

    report.message = `unknown option: ${arg}`;
    report.issues = [report.message];
    stderr.write(`[opentree] unknown option: ${arg}\n`);
    stderr.write("[opentree] usage: opentree config show [--json|--pretty]\n");
    if (requestedJson) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  const loadedConfig = await loadReadableConfig(io);
  if (!loadedConfig.ok) {
    report.stage = "load";
    report.message = loadedConfig.message;
    report.issues = loadedConfig.issues;
    stderr.write(`[opentree] ${loadedConfig.message}\n`);
    loadedConfig.issues
      .filter((issue) => issue !== loadedConfig.message)
      .forEach((issue) => stderr.write(`[opentree] ${issue}\n`));
    if (requestedJson) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  const spacing = format === "pretty" ? 2 : 0;
  if (format === "json") {
    report.stage = "load";
    report.ok = true;
    report.configPath = loadedConfig.configPath;
    report.message = `loaded ${CONFIG_FILE_NAME}`;
    report.result = {
      config: loadedConfig.config
    };
    writeJsonReport(stdout, report);
    return 0;
  }

  stdout.write(`${JSON.stringify(loadedConfig.config, null, spacing)}\n`);
  return 0;
}

module.exports = {
  loadReadableConfig,
  runConfigCommand
};
