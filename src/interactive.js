const fs = require("node:fs/promises");
const path = require("node:path");
const readline = require("node:readline/promises");
const { stdin: defaultStdin } = require("node:process");
const { CONFIG_FILE_NAME, createDefaultConfig } = require("./init");
const { validateConfig } = require("./config");

async function createQuestionFn(stdin, stdout) {
  if (stdin.isTTY) {
    const rl = readline.createInterface({
      input: stdin,
      output: stdout
    });

    return {
      ask(prompt) {
        return rl.question(prompt);
      },
      close() {
        rl.close();
      }
    };
  }

  const chunks = [];
  for await (const chunk of stdin) {
    chunks.push(chunk);
  }

  const answers = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8").split(/\r?\n/);
  let answerIndex = 0;

  return {
    async ask(prompt) {
      stdout.write(prompt);
      const answer = answers[answerIndex] ?? "";
      answerIndex += 1;
      return answer;
    },
    close() {}
  };
}

async function runInteractive(io) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const stdin = io.stdin ?? defaultStdin;
  const configPath = path.join(cwd, CONFIG_FILE_NAME);

  try {
    await fs.access(configPath);
    stderr.write(`[opentree] ${CONFIG_FILE_NAME} already exists\n`);
    return 1;
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      throw error;
    }
  }

  const prompts = await createQuestionFn(stdin, stdout);

  try {
    const config = createDefaultConfig();
    config.profile.name = (await prompts.ask("Name: ")).trim() || config.profile.name;
    config.profile.bio = (await prompts.ask("Bio: ")).trim() || config.profile.bio;
    config.profile.avatarUrl = (await prompts.ask("Avatar URL (optional): ")).trim();
    config.siteUrl = (await prompts.ask("Site URL (optional): ")).trim();
    config.template = (await prompts.ask("Template (glass|terminal): ")).trim() || config.template;

    const firstTitle = (await prompts.ask("First link title: ")).trim() || "Website";
    const firstUrl = (await prompts.ask("First link URL: ")).trim() || "https://example.com";
    config.links = [{ title: firstTitle, url: firstUrl }];

    const errors = validateConfig(config);
    if (errors.length > 0) {
      stderr.write("[opentree] interactive setup produced an invalid config\n");
      errors.forEach((error) => stderr.write(`- ${error}\n`));
      return 1;
    }

    await fs.writeFile(configPath, JSON.stringify(config, null, 2) + "\n", {
      flag: "wx"
    });
    stdout.write(`[opentree] created ${CONFIG_FILE_NAME}\n`);
    return 0;
  } finally {
    prompts.close();
  }
}

module.exports = {
  runInteractive
};
