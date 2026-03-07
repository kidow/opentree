#!/usr/bin/env node

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const repoRoot = path.join(__dirname, "..");
const cliPath = path.join(repoRoot, "bin", "opentree.js");

function runCli(args, cwd) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    const command = `node ${path.relative(cwd, cliPath)} ${args.join(" ")}`;
    throw new Error(
      [
        `[smoke] command failed: ${command}`,
        `[smoke] exit code: ${result.status}`,
        `[smoke] stdout:\n${result.stdout}`,
        `[smoke] stderr:\n${result.stderr}`
      ].join("\n")
    );
  }

  return result;
}

async function main() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-smoke-"));

  runCli(
    [
      "init",
      "--name",
      "Kidow",
      "--bio",
      "CLI smoke profile",
      "--site-url",
      "https://links.example.com",
      "--title",
      "Kidow Links",
      "--description",
      "Find my work across the internet."
    ],
    tempDir
  );

  runCli(
    ["link", "add", "--title", "Docs", "--url", "https://example.com/docs"],
    tempDir
  );
  runCli(
    ["theme", "set", "--accent-color", "#0f766e", "--background-color", "#f0fdfa"],
    tempDir
  );
  runCli(["validate"], tempDir);

  const configResult = runCli(["config", "show"], tempDir);
  const config = JSON.parse(configResult.stdout);

  assert.equal(config.profile.name, "Kidow");
  assert.equal(config.siteUrl, "https://links.example.com");
  assert.equal(config.metadata.title, "Kidow Links");
  assert.equal(config.links.length, 3);
  assert.equal(config.theme.accentColor, "#0f766e");

  const buildResult = runCli(["build"], tempDir);
  assert.match(buildResult.stdout, /\[opentree\] wrote dist\/index\.html/);
  assert.match(buildResult.stdout, /\[opentree\] wrote dist\/sitemap\.xml/);
  assert.match(buildResult.stdout, /\[opentree\] wrote dist\/robots\.txt/);

  const html = await fs.readFile(path.join(tempDir, "dist", "index.html"), "utf8");
  const sitemap = await fs.readFile(path.join(tempDir, "dist", "sitemap.xml"), "utf8");
  const robots = await fs.readFile(path.join(tempDir, "dist", "robots.txt"), "utf8");

  assert.match(html, /<title>Kidow Links<\/title>/);
  assert.match(html, /CLI smoke profile/);
  assert.match(html, /https:\/\/example\.com\/docs/);
  assert.match(html, /<meta property="og:url" content="https:\/\/links\.example\.com" \/>/);
  assert.match(sitemap, /<loc>https:\/\/links\.example\.com\/<\/loc>/);
  assert.match(robots, /Sitemap: https:\/\/links\.example\.com\/sitemap\.xml/);

  process.stdout.write("[smoke] CLI smoke test passed\n");
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
