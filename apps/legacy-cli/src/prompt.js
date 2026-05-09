const { loadConfig, saveConfig, validateConfig } = require("./config");
const { LINK_PRESETS, TEMPLATE_VALUES } = require("./catalog");
const { CONFIG_FILE_NAME } = require("./init");

function writeJsonReport(stdout, report) {
  stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function createPromptReport(cwd) {
  return {
    command: "prompt",
    configPath: `${cwd}/${CONFIG_FILE_NAME}`,
    cwd,
    dryRun: false,
    issues: [],
    message: "",
    ok: false,
    result: null,
    stage: "args"
  };
}

function applyPromptInstruction(config, instruction) {
  let changed = false;
  const text = instruction.trim();

  const nameMatch = text.match(/set my name to ([^]+?)(?= and |$)/i);
  if (nameMatch) {
    config.profile.name = nameMatch[1].trim();
    changed = true;
  }

  const bioMatch = text.match(/set my bio to ([^]+?)(?= and |$)/i);
  if (bioMatch) {
    config.profile.bio = bioMatch[1].trim();
    changed = true;
  }

  const templateMatch = text.match(/set template to (\w+)/i);
  if (templateMatch && TEMPLATE_VALUES.includes(templateMatch[1].trim())) {
    config.template = templateMatch[1].trim();
    changed = true;
  }

  const addLinkMatch = text.match(/add link ([^]+?) (https?:\/\/\S+)/i);
  if (addLinkMatch) {
    config.links.push({
      title: addLinkMatch[1].trim(),
      url: addLinkMatch[2].trim()
    });
    changed = true;
  }

  const presetMatch = text.match(/add (\w+) ([a-z0-9._-]+)/i);
  if (presetMatch && LINK_PRESETS[presetMatch[1].trim().toLowerCase()]) {
    const preset = LINK_PRESETS[presetMatch[1].trim().toLowerCase()];
    config.links.push({
      title: preset.title,
      url: preset.url(presetMatch[2].trim())
    });
    changed = true;
  }

  return changed;
}

async function runPromptCommand(io, args = []) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const requestedJson = args.includes("--json");
  const dryRun = args.includes("--dry-run");
  const instruction = args
    .filter((arg) => arg !== "--dry-run" && arg !== "--json")
    .join(" ")
    .trim();
  const report = createPromptReport(cwd);
  report.dryRun = dryRun;

  if (!instruction) {
    report.message = "usage: opentree prompt <instruction>";
    report.issues = [report.message];
    stderr.write("[opentree] usage: opentree prompt <instruction>\n");
    if (requestedJson) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  let loadedConfig;
  try {
    loadedConfig = await loadConfig(cwd);
  } catch (error) {
    report.stage = "load";
    if (error && error.code === "ENOENT") {
      report.message = `${CONFIG_FILE_NAME} was not found in ${cwd}`;
      report.issues = [report.message];
      stderr.write(`[opentree] ${CONFIG_FILE_NAME} was not found in ${cwd}\n`);
      if (requestedJson) {
        writeJsonReport(stdout, report);
      }
      return 1;
    }

    throw error;
  }
  report.configPath = loadedConfig.configPath;

  const nextConfig = structuredClone(loadedConfig.config);
  const changed = applyPromptInstruction(nextConfig, instruction);

  if (!changed) {
    report.stage = "validate";
    report.message = "no supported edits were found in the instruction";
    report.issues = [report.message];
    stderr.write("[opentree] no supported edits were found in the instruction\n");
    if (requestedJson) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  const errors = validateConfig(nextConfig);
  if (errors.length > 0) {
    report.stage = "validate";
    report.message = "prompt edit aborted because the config would be invalid";
    report.issues = errors;
    stderr.write("[opentree] prompt edit aborted because the config would be invalid\n");
    errors.forEach((error) => stderr.write(`- ${error}\n`));
    if (requestedJson) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  if (dryRun) {
    report.ok = true;
    report.stage = "dry-run";
    report.message = "dry run: would apply prompt edits";
    report.result = {
      config: nextConfig,
      dryRun: true
    };
    if (requestedJson) {
      writeJsonReport(stdout, report);
      return 0;
    }

    stdout.write("[opentree] dry run: would apply prompt edits\n");
    return 0;
  }

  await saveConfig(cwd, nextConfig);
  report.ok = true;
  report.stage = "save";
  report.message = "applied prompt edits";
  report.result = {
    config: nextConfig
  };
  if (requestedJson) {
    writeJsonReport(stdout, report);
    return 0;
  }

  stdout.write("[opentree] applied prompt edits\n");
  return 0;
}

module.exports = {
  runPromptCommand
};
