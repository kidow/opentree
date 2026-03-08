const { loadConfig, saveConfig, validateConfig } = require("./config");
const { LINK_PRESETS, TEMPLATE_VALUES } = require("./catalog");
const { CONFIG_FILE_NAME } = require("./init");

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
  const instruction = args.join(" ").trim();

  if (!instruction) {
    stderr.write("[opentree] usage: opentree prompt <instruction>\n");
    return 1;
  }

  let loadedConfig;
  try {
    loadedConfig = await loadConfig(cwd);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      stderr.write(`[opentree] ${CONFIG_FILE_NAME} was not found in ${cwd}\n`);
      return 1;
    }

    throw error;
  }

  const nextConfig = structuredClone(loadedConfig.config);
  const changed = applyPromptInstruction(nextConfig, instruction);

  if (!changed) {
    stderr.write("[opentree] no supported edits were found in the instruction\n");
    return 1;
  }

  const errors = validateConfig(nextConfig);
  if (errors.length > 0) {
    stderr.write("[opentree] prompt edit aborted because the config would be invalid\n");
    errors.forEach((error) => stderr.write(`- ${error}\n`));
    return 1;
  }

  await saveConfig(cwd, nextConfig);
  stdout.write("[opentree] applied prompt edits\n");
  return 0;
}

module.exports = {
  runPromptCommand
};
