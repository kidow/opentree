const fs = require("node:fs/promises");
const path = require("node:path");
const { loadConfig, saveConfig, validateConfig } = require("./config");
const { CONFIG_FILE_NAME } = require("./init");
const { resolveSandboxedPath } = require("./path-security");

function writeJsonReport(stdout, report) {
  stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function createImportReport(cwd) {
  return {
    command: "import links",
    config: null,
    configPath: path.join(cwd, CONFIG_FILE_NAME),
    cwd,
    dryRun: false,
    issues: [],
    message: "",
    ok: false,
    result: null,
    stage: "args"
  };
}

function parseImportArgs(args) {
  const options = {
    dryRun: false,
    replace: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = args[index + 1];

    if (arg === "--file") {
      if (nextValue === undefined) {
        throw new Error("missing value for --file");
      }

      options.file = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--replace") {
      options.replace = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    throw new Error(`unknown option: ${arg}`);
  }

  if (!options.file) {
    throw new Error("missing required option --file");
  }

  return options;
}

function normalizeImportedLinks(parsed) {
  const candidate = Array.isArray(parsed) ? parsed : parsed?.links;

  if (!Array.isArray(candidate)) {
    throw new Error("import file must be a JSON array or an object with a links array");
  }

  return candidate.map((link, index) => {
    if (!link || typeof link !== "object" || Array.isArray(link)) {
      throw new Error(`imported link #${index + 1} must be an object`);
    }

    return {
      title: link.title,
      url: link.url
    };
  });
}

async function runImportCommand(io, args = []) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const [subcommand, ...restArgs] = args;
  const requestedJson = args.includes("--json");
  const report = createImportReport(cwd);

  if (subcommand !== "links") {
    const message = "usage: opentree import links --file <path> [--replace] [--json]";
    stderr.write(`[opentree] ${message}\n`);
    if (requestedJson) {
      report.message = message;
      report.issues = [message];
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  let options;
  try {
    options = parseImportArgs(restArgs);
  } catch (error) {
    stderr.write(`[opentree] ${error.message}\n`);
    if (requestedJson) {
      report.message = error.message;
      report.issues = [error.message];
      writeJsonReport(stdout, report);
    }
    return 1;
  }
  report.dryRun = options.dryRun;
  let importFileCandidate = options.file;
  if (path.isAbsolute(importFileCandidate)) {
    try {
      importFileCandidate = await fs.realpath(importFileCandidate);
    } catch (error) {
      if (!error || error.code !== "ENOENT") {
        throw error;
      }
    }
  }
  let importFilePath;
  try {
    importFilePath = resolveSandboxedPath(cwd, importFileCandidate, "--file");
  } catch (error) {
    stderr.write(`[opentree] ${error.message}\n`);
    if (options.json) {
      report.message = error.message;
      report.issues = [error.message];
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  report.stage = "load";
  let loadedConfig;
  try {
    loadedConfig = await loadConfig(cwd);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      const message = `${CONFIG_FILE_NAME} was not found in ${cwd}`;
      stderr.write(`[opentree] ${message}\n`);
      stderr.write("[opentree] run `opentree init` first to create a starter config\n");
      if (options.json) {
        report.message = message;
        report.issues = [message];
        writeJsonReport(stdout, report);
      }
      return 1;
    }

    throw error;
  }

  let importedLinks;
  try {
    const raw = await fs.readFile(importFilePath, "utf8");
    importedLinks = normalizeImportedLinks(JSON.parse(raw));
  } catch (error) {
    const message = error instanceof SyntaxError ? "import file is not valid JSON" : error.message;
    stderr.write(`[opentree] ${message}\n`);
    if (options.json) {
      report.message = message;
      report.issues = [message];
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  const nextConfig = {
    ...loadedConfig.config,
    links: options.replace ? importedLinks : [...(loadedConfig.config.links ?? []), ...importedLinks]
  };
  const errors = validateConfig(nextConfig);

  if (errors.length > 0) {
    report.stage = "validate";
    stderr.write("[opentree] import links aborted because the config would be invalid\n");
    errors.forEach((error) => stderr.write(`- ${error}\n`));
    if (options.json) {
      report.message = "import links aborted because the config would be invalid";
      report.issues = errors;
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  if (options.dryRun) {
    report.ok = true;
    report.stage = "dry-run";
    report.message = `dry run: would import ${importedLinks.length} link(s)`;
    report.result = {
      dryRun: true,
      importedCount: importedLinks.length,
      links: nextConfig.links,
      linksCount: nextConfig.links.length,
      replace: options.replace
    };
    report.config = nextConfig;
    report.configPath = loadedConfig.configPath;

    if (options.json) {
      writeJsonReport(stdout, report);
      return 0;
    }

    stdout.write(`[opentree] ${report.message}\n`);
    return 0;
  }

  const savedConfig = await saveConfig(cwd, nextConfig);
  report.ok = true;
  report.stage = "save";
  report.message = `imported ${importedLinks.length} link(s)`;
  report.result = {
    importedCount: importedLinks.length,
    links: savedConfig.config.links,
    linksCount: savedConfig.config.links.length,
    replace: options.replace
  };
  report.config = savedConfig.config;
  report.configPath = savedConfig.configPath;

  if (options.json) {
    writeJsonReport(stdout, report);
    return 0;
  }

  stdout.write(`[opentree] ${report.message}\n`);
  return 0;
}

module.exports = {
  runImportCommand
};
