const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const { handleRequest } = require("../src/dev");

const cliPath = path.join(__dirname, "..", "bin", "opentree.js");
const configFilePath = "opentree.config.json";
const buildFilePath = path.join("dist", "index.html");

async function renderDevResponse(cwd, requestUrl = "/") {
  const response = {
    body: "",
    headers: null,
    statusCode: null,
    end(chunk = "") {
      this.body += chunk;
    },
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    }
  };

  await handleRequest(
    {
      method: "GET",
      url: requestUrl
    },
    response,
    cwd
  );

  return response;
}

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

test("build creates a static html page in dist", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-build-"));
  const initResult = spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const buildResult = spawnSync(process.execPath, [cliPath, "build"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const html = await fs.readFile(path.join(tempDir, buildFilePath), "utf8");

  assert.equal(initResult.status, 0);
  assert.equal(buildResult.status, 0);
  assert.match(buildResult.stdout, /\[opentree\] wrote dist\/index\.html/);
  assert.match(html, /<title>Your Name \| opentree<\/title>/);
  assert.match(html, /Add a short bio for your opentree page\./);
  assert.match(html, /https:\/\/github\.com\/your-handle/);
});

test("build fails when the config file is missing", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-build-missing-"));
  const result = spawnSync(process.execPath, [cliPath, "build"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[opentree\] opentree\.config\.json was not found/);
  assert.match(result.stderr, /run `opentree init` first/);
});

test("build fails when the config is invalid", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-build-invalid-"));
  await fs.writeFile(
    path.join(tempDir, configFilePath),
    JSON.stringify(
      {
        profile: {
          name: "Kidow",
          bio: "hello",
          avatarUrl: ""
        },
        links: [
          {
            title: "Broken",
            url: "mailto:test@example.com"
          }
        ],
        theme: {
          accentColor: "#166534",
          backgroundColor: "#f0fdf4",
          textColor: "#052e16"
        }
      },
      null,
      2
    ) + "\n"
  );

  const result = spawnSync(process.execPath, [cliPath, "build"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[opentree\] build aborted because the config is invalid/);
  assert.match(result.stderr, /links\[0\]\.url must be an http or https URL/);
});

test("dev serves the preview and reloads config changes without restart", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-dev-"));
  const initResult = spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  assert.equal(initResult.status, 0);

  const firstResponse = await renderDevResponse(tempDir);
  const firstHtml = firstResponse.body;

  assert.equal(firstResponse.statusCode, 200);
  assert.match(firstHtml, /Your Name/);

  const updatedConfig = {
    profile: {
      name: "Kidow",
      bio: "A rebuilt profile preview.",
      avatarUrl: ""
    },
    links: [
      {
        title: "Blog",
        url: "https://example.com/blog"
      }
    ],
    theme: {
      accentColor: "#14532d",
      backgroundColor: "#ecfdf5",
      textColor: "#052e16"
    }
  };

  await fs.writeFile(
    path.join(tempDir, configFilePath),
    JSON.stringify(updatedConfig, null, 2) + "\n"
  );

  const secondResponse = await renderDevResponse(tempDir);
  const secondHtml = secondResponse.body;

  assert.equal(secondResponse.statusCode, 200);
  assert.match(secondHtml, /Kidow/);
  assert.match(secondHtml, /A rebuilt profile preview\./);
  assert.match(secondHtml, /https:\/\/example\.com\/blog/);
});

test("dev fails fast when the config file is missing", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-dev-missing-"));
  const result = spawnSync(process.execPath, [cliPath, "dev"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[opentree\] cannot start dev server/);
  assert.match(result.stderr, /\[opentree\] opentree\.config\.json was not found/);
});

test("dev request returns a problem page when the config becomes invalid", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-dev-invalid-"));
  const initResult = spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  assert.equal(initResult.status, 0);

  await fs.writeFile(
    path.join(tempDir, configFilePath),
    JSON.stringify(
      {
        profile: {
          name: "Kidow",
          bio: "broken",
          avatarUrl: ""
        },
        links: [
          {
            title: "Broken",
            url: "mailto:test@example.com"
          }
        ],
        theme: {
          accentColor: "#166534",
          backgroundColor: "#f0fdf4",
          textColor: "#052e16"
        }
      },
      null,
      2
    ) + "\n"
  );

  const response = await renderDevResponse(tempDir);

  assert.equal(response.statusCode, 500);
  assert.match(response.body, /opentree\.config\.json has validation issues/);
  assert.match(response.body, /links\[0\]\.url must be an http or https URL/);
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
