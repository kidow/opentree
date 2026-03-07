const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const cliPath = path.join(__dirname, "..", "bin", "opentree.js");
const configFilePath = "opentree.config.json";

test("init creates starter config in the current directory", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-init-"));
  const result = spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const configContents = await fs.readFile(path.join(tempDir, configFilePath), "utf8");
  const config = JSON.parse(configContents);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[opentree\] init command received/);
  assert.match(result.stdout, /\[opentree\] created opentree\.config\.json/);
  assert.equal(config.profile.name, "Your Name");
  assert.equal(config.links.length, 2);
  assert.equal(config.theme.accentColor, "#166534");
});

test("init fails when config already exists", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-init-existing-"));
  await fs.writeFile(
    path.join(tempDir, configFilePath),
    JSON.stringify({ profile: { name: "Existing" } }, null, 2) + "\n"
  );

  const result = spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[opentree\] opentree\.config\.json already exists/);
  assert.match(result.stderr, /avoid overwriting your config/);
});

test("validate passes for the starter config", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-validate-"));

  const initResult = spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const validateResult = spawnSync(process.execPath, [cliPath, "validate"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  assert.equal(initResult.status, 0);
  assert.equal(validateResult.status, 0);
  assert.match(validateResult.stdout, /\[opentree\] opentree\.config\.json is valid/);
});

test("validate fails when the config file is missing", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-validate-missing-"));
  const result = spawnSync(process.execPath, [cliPath, "validate"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[opentree\] opentree\.config\.json was not found/);
  assert.match(result.stderr, /run `opentree init` first/);
});

test("validate reports schema errors for malformed config", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-validate-invalid-"));
  await fs.writeFile(
    path.join(tempDir, configFilePath),
    JSON.stringify(
      {
        profile: {
          name: "",
          bio: 12,
          avatarUrl: "ftp://example.com/avatar.png"
        },
        links: [],
        theme: {
          accentColor: "green",
          backgroundColor: "#fff",
          textColor: "#052e16"
        }
      },
      null,
      2
    ) + "\n"
  );

  const result = spawnSync(process.execPath, [cliPath, "validate"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[opentree\] found 6 validation issue\(s\)/);
  assert.match(result.stderr, /profile\.name must be a non-empty string/);
  assert.match(result.stderr, /profile\.bio must be a string/);
  assert.match(result.stderr, /profile\.avatarUrl must be an http or https URL/);
  assert.match(result.stderr, /links must be a non-empty array/);
  assert.match(result.stderr, /theme\.accentColor must be a hex color/);
  assert.match(result.stderr, /theme\.backgroundColor must be a hex color/);
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
