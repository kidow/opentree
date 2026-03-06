const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const cliPath = path.join(__dirname, "..", "bin", "opentree.js");

test("init prints bootstrap placeholder logs", () => {
  const result = spawnSync(process.execPath, [cliPath, "init"], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[opentree\] init command received/);
  assert.match(result.stdout, /\[opentree\] target directory:/);
  assert.match(result.stdout, /\[opentree\] bootstrap scaffold is not implemented yet/);
});

test("unknown commands fail with guidance", () => {
  const result = spawnSync(process.execPath, [cliPath, "unknown"], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[opentree\] unknown command: unknown/);
  assert.match(result.stderr, /opentree --help/);
});
