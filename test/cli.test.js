const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const { EventEmitter } = require("node:events");
const { PassThrough, Writable } = require("node:stream");
const { handleRequest, runDev } = require("../src/dev");
const { runDeploy } = require("../src/deploy");
const { runDoctor } = require("../src/doctor");
const { createDefaultConfig } = require("../src/init");
const { runVercelCommand } = require("../src/vercel");

const cliPath = path.join(__dirname, "..", "bin", "opentree.js");
const configFilePath = "opentree.config.json";
const buildFilePath = path.join("dist", "index.html");
const faviconFilePath = path.join("dist", "favicon.svg");
const ogImageFilePath = path.join("dist", "opengraph-image.svg");
const robotsFilePath = path.join("dist", "robots.txt");
const sitemapFilePath = path.join("dist", "sitemap.xml");
const rootVercelProjectFilePath = path.join(".vercel", "project.json");
const distVercelProjectFilePath = path.join("dist", ".vercel", "project.json");

class MemoryWritable extends Writable {
  constructor() {
    super();
    this.buffer = "";
  }

  _write(chunk, _encoding, callback) {
    this.buffer += chunk.toString();
    callback();
  }
}

function createFakeChildProcess({ stdout = "", stderr = "", exitCode = 0, error = null }) {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();

  process.nextTick(() => {
    if (error) {
      child.emit("error", error);
      return;
    }

    child.stdout.end(stdout);
    child.stderr.end(stderr);
    child.emit("close", exitCode);
  });

  return child;
}

function createFakeServer({ activePort = 43123 } = {}) {
  const server = new EventEmitter();
  server.listenCalls = [];
  server.closed = false;

  server.listen = (port, host, callback) => {
    server.listenCalls.push({ host, port });
    server.activePort = port === 0 ? activePort : port;
    process.nextTick(callback);
  };

  server.address = () => ({
    address: "127.0.0.1",
    family: "IPv4",
    port: server.activePort ?? activePort
  });

  server.close = (callback) => {
    server.closed = true;
    process.nextTick(() => {
      callback?.();
    });
  };

  return server;
}

function createConfig(overrides = {}) {
  const baseConfig = createDefaultConfig();

  return {
    ...baseConfig,
    ...overrides,
    profile: {
      ...baseConfig.profile,
      ...(overrides.profile ?? {})
    },
    links: overrides.links ?? baseConfig.links,
    theme: {
      ...baseConfig.theme,
      ...(overrides.theme ?? {})
    },
    metadata: {
      ...baseConfig.metadata,
      ...(overrides.metadata ?? {})
    }
  };
}

async function writeConfigFile(cwd, overrides = {}) {
  const config = createConfig(overrides);
  await fs.writeFile(path.join(cwd, configFilePath), JSON.stringify(config, null, 2) + "\n");
  return config;
}

async function writeVercelProjectFile(cwd, overrides = {}) {
  const project = {
    projectId: "prj_123",
    orgId: "team_456",
    projectName: "opentree",
    ...overrides
  };

  await fs.mkdir(path.join(cwd, ".vercel"), { recursive: true });
  await fs.writeFile(
    path.join(cwd, rootVercelProjectFilePath),
    JSON.stringify(project, null, 2) + "\n"
  );

  return project;
}

async function writeDistVercelProjectFile(cwd, overrides = {}) {
  const project = {
    projectId: "prj_123",
    orgId: "team_456",
    projectName: "opentree",
    ...overrides
  };

  await fs.mkdir(path.join(cwd, "dist", ".vercel"), { recursive: true });
  await fs.writeFile(
    path.join(cwd, distVercelProjectFilePath),
    JSON.stringify(project, null, 2) + "\n"
  );

  return project;
}

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
  assert.equal(config.schemaVersion, 1);
  assert.equal(config.siteUrl, "");
  assert.deepEqual(config.metadata, {
    title: "",
    description: "",
    ogImageUrl: ""
  });
});

test("init accepts profile and metadata overrides from flags", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-init-overrides-"));
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "init",
      "--name",
      "Kidow",
      "--bio",
      "CLI-native profile",
      "--avatar-url",
      "https://example.com/avatar.png",
      "--site-url",
      "https://links.example.com",
      "--title",
      "Kidow Links",
      "--description",
      "Find my work across the internet.",
      "--og-image-url",
      "https://cdn.example.com/og.png"
    ],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const config = JSON.parse(await fs.readFile(path.join(tempDir, configFilePath), "utf8"));

  assert.equal(result.status, 0);
  assert.equal(config.profile.name, "Kidow");
  assert.equal(config.profile.bio, "CLI-native profile");
  assert.equal(config.profile.avatarUrl, "https://example.com/avatar.png");
  assert.equal(config.siteUrl, "https://links.example.com");
  assert.deepEqual(config.metadata, {
    title: "Kidow Links",
    description: "Find my work across the internet.",
    ogImageUrl: "https://cdn.example.com/og.png"
  });
});

test("init supports structured json output", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-init-json-"));
  const expectedConfigPath = path.join(await fs.realpath(tempDir), configFilePath);
  const result = spawnSync(
    process.execPath,
    [cliPath, "init", "--name", "Kidow", "--json"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(report.ok, true);
  assert.equal(report.command, "init");
  assert.equal(report.stage, "write");
  assert.equal(report.message, "created opentree.config.json");
  assert.equal(report.result.created, true);
  assert.equal(report.config.profile.name, "Kidow");
  assert.equal(report.configPath, expectedConfigPath);
});

test("init rejects invalid metadata overrides", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-init-invalid-"));
  const result = spawnSync(
    process.execPath,
    [cliPath, "init", "--og-image-url", "ftp://example.com/og.png"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[opentree\] --og-image-url must be an http or https URL/);
});

test("init supports structured json output for argument failures", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-init-invalid-json-"));
  const result = spawnSync(
    process.execPath,
    [cliPath, "init", "--og-image-url", "ftp://example.com/og.png", "--json"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(report.ok, false);
  assert.equal(report.command, "init");
  assert.equal(report.stage, "args");
  assert.equal(report.message, "--og-image-url must be an http or https URL");
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

test("init supports structured json output when config already exists", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-init-existing-json-"));
  await fs.writeFile(
    path.join(tempDir, configFilePath),
    JSON.stringify({ profile: { name: "Existing" } }, null, 2) + "\n"
  );

  const result = spawnSync(process.execPath, [cliPath, "init", "--json"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(report.ok, false);
  assert.equal(report.command, "init");
  assert.equal(report.stage, "write");
  assert.equal(report.message, "init aborted because opentree.config.json already exists");
  assert.deepEqual(report.issues, ["opentree.config.json already exists"]);
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

test("validate supports structured json output for valid config", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-validate-json-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const expectedConfigPath = await fs.realpath(path.join(tempDir, configFilePath));

  const result = spawnSync(process.execPath, [cliPath, "validate", "--json"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(report.ok, true);
  assert.equal(report.command, "validate");
  assert.equal(report.stage, "validate");
  assert.equal(report.issueCount, 0);
  assert.deepEqual(report.issues, []);
  assert.deepEqual(report.result, {
    configPath: expectedConfigPath,
    valid: true
  });
  assert.match(report.message, /opentree\.config\.json is valid/);
  assert.match(result.stderr, /\[opentree\] validating opentree\.config\.json/);
  assert.match(result.stderr, /\[opentree\] opentree\.config\.json is valid/);
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

test("validate supports structured json output for invalid config", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-validate-json-invalid-"));
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

  const result = spawnSync(process.execPath, [cliPath, "validate", "--json"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(report.ok, false);
  assert.equal(report.command, "validate");
  assert.equal(report.stage, "validate");
  assert.equal(report.issueCount, 6);
  assert.match(report.message, /found 6 validation issue\(s\)/);
  assert.match(report.issues[0], /profile\.name must be a non-empty string/);
  assert.equal(report.result, null);
  assert.match(result.stderr, /\[opentree\] found 6 validation issue\(s\)/);
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

test("validate reports metadata errors for malformed site metadata", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-validate-meta-invalid-"));
  await fs.writeFile(
    path.join(tempDir, configFilePath),
    JSON.stringify(
      {
        profile: {
          name: "Kidow",
          bio: "Shipping links.",
          avatarUrl: ""
        },
        links: [
          {
            title: "GitHub",
            url: "https://github.com/kidow"
          }
        ],
        theme: {
          accentColor: "#166534",
          backgroundColor: "#f0fdf4",
          textColor: "#052e16"
        },
        siteUrl: "not-a-url",
        metadata: {
          title: 123,
          description: null,
          ogImageUrl: "ftp://example.com/og.png"
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
  assert.match(result.stderr, /\[opentree\] found 4 validation issue\(s\)/);
  assert.match(result.stderr, /siteUrl must be an http or https URL when provided/);
  assert.match(result.stderr, /metadata\.title must be a string/);
  assert.match(result.stderr, /metadata\.description must be a string/);
  assert.match(result.stderr, /metadata\.ogImageUrl must be an http or https URL when provided/);
});

test("validate rejects unsupported schema versions", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-validate-schema-version-"));
  await fs.writeFile(
    path.join(tempDir, configFilePath),
    JSON.stringify(
      {
        schemaVersion: 2,
        profile: {
          name: "Kidow",
          bio: "Shipping links.",
          avatarUrl: ""
        },
        links: [
          {
            title: "GitHub",
            url: "https://github.com/kidow"
          }
        ],
        theme: {
          accentColor: "#166534",
          backgroundColor: "#f0fdf4",
          textColor: "#052e16"
        },
        siteUrl: "",
        metadata: {
          title: "",
          description: "",
          ogImageUrl: ""
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
  assert.match(result.stderr, /schemaVersion must be 1 when provided/);
});

test("validate accepts legacy configs without schemaVersion", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-validate-schema-legacy-"));
  await fs.writeFile(
    path.join(tempDir, configFilePath),
    JSON.stringify(
      {
        profile: {
          name: "Kidow",
          bio: "Shipping links.",
          avatarUrl: ""
        },
        links: [
          {
            title: "GitHub",
            url: "https://github.com/kidow"
          }
        ],
        theme: {
          accentColor: "#166534",
          backgroundColor: "#f0fdf4",
          textColor: "#052e16"
        },
        siteUrl: "",
        metadata: {
          title: "",
          description: "",
          ogImageUrl: ""
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

  assert.equal(result.status, 0);
  assert.match(result.stdout, /opentree\.config\.json is valid/);
});

test("repository ships a JSON Schema for opentree config", async () => {
  const schemaPath = path.join(__dirname, "..", "opentree.schema.json");
  const schema = JSON.parse(await fs.readFile(schemaPath, "utf8"));

  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.title, "opentree config");
  assert.equal(schema.properties.schemaVersion.const, 1);
  assert.equal(schema.properties.profile.type, "object");
  assert.equal(schema.properties.links.type, "array");
});

test("repository documents the release workflow and versioning policy", async () => {
  const readme = await fs.readFile(path.join(__dirname, "..", "README.md"), "utf8");
  const releaseGuide = await fs.readFile(path.join(__dirname, "..", "RELEASING.md"), "utf8");

  assert.match(readme, /## Release Workflow/);
  assert.match(readme, /versioning rules/i);
  assert.match(releaseGuide, /npm publish/);
  assert.match(releaseGuide, /CHANGELOG\.md/);
  assert.match(releaseGuide, /v\d+\.\d+\.\d+/);
});

test("repository ships changelog and release automation files", async () => {
  const changelog = await fs.readFile(path.join(__dirname, "..", "CHANGELOG.md"), "utf8");
  const workflow = await fs.readFile(
    path.join(__dirname, "..", ".github", "workflows", "release.yml"),
    "utf8"
  );
  const pkg = JSON.parse(await fs.readFile(path.join(__dirname, "..", "package.json"), "utf8"));

  assert.match(changelog, /## Unreleased/);
  assert.match(changelog, /Initial release notes/);
  assert.match(workflow, /name: Release/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /npm publish/);
  assert.equal(pkg.scripts["release:check"], "npm test && npm run test:smoke");
  assert.equal(pkg.scripts.prepublishOnly, "npm run release:check");
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
  const favicon = await fs.readFile(path.join(tempDir, faviconFilePath), "utf8");
  await assert.rejects(fs.readFile(path.join(tempDir, sitemapFilePath), "utf8"), { code: "ENOENT" });
  await assert.rejects(fs.readFile(path.join(tempDir, robotsFilePath), "utf8"), { code: "ENOENT" });

  assert.equal(initResult.status, 0);
  assert.equal(buildResult.status, 0);
  assert.match(buildResult.stdout, /\[opentree\] wrote dist\/index\.html/);
  assert.match(buildResult.stdout, /\[opentree\] wrote dist\/favicon\.svg/);
  assert.match(html, /<title>Your Name \| opentree<\/title>/);
  assert.match(html, /<link rel="icon" href="\.\/favicon\.svg" type="image\/svg\+xml" \/>/);
  assert.match(html, /Add a short bio for your opentree page\./);
  assert.match(html, /<meta property="og:title" content="Your Name \| opentree" \/>/);
  assert.match(
    html,
    /<meta property="og:description" content="Add a short bio for your opentree page\." \/>/
  );
  assert.match(html, /<meta name="twitter:card" content="summary" \/>/);
  assert.match(html, /<main class="shell" id="content">/);
  assert.match(html, /<nav aria-label="Profile links">/);
  assert.match(html, /overflow-wrap: anywhere;/);
  assert.match(html, /\.link-card:focus-visible/);
  assert.match(favicon, /<svg/);
  assert.match(html, /https:\/\/github\.com\/your-handle/);
});

test("build supports a custom output directory", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-build-output-"));
  const outputDir = path.join("public", "site");
  spawnSync(process.execPath, [cliPath, "init", "--site-url", "https://links.example.com"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "build", "--output", outputDir],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const html = await fs.readFile(path.join(tempDir, outputDir, "index.html"), "utf8");
  const sitemap = await fs.readFile(path.join(tempDir, outputDir, "sitemap.xml"), "utf8");
  const robots = await fs.readFile(path.join(tempDir, outputDir, "robots.txt"), "utf8");

  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[opentree\] wrote public\/site\/index\.html/);
  assert.match(result.stdout, /\[opentree\] wrote public\/site\/sitemap\.xml/);
  assert.match(result.stdout, /\[opentree\] wrote public\/site\/robots\.txt/);
  assert.match(html, /<title>Your Name \| opentree<\/title>/);
  assert.match(sitemap, /<loc>https:\/\/links\.example\.com\/<\/loc>/);
  assert.match(robots, /Sitemap: https:\/\/links\.example\.com\/sitemap\.xml/);
  await assert.rejects(fs.readFile(path.join(tempDir, buildFilePath), "utf8"), { code: "ENOENT" });
});

test("build supports structured json output", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-build-json-"));
  const outputDir = path.join("public", "site");
  await writeConfigFile(tempDir, {
    profile: {
      name: "Kidow",
      bio: "Shipping links.",
      avatarUrl: "https://cdn.example.com/avatar.png"
    },
    siteUrl: "https://links.example.com",
    metadata: {
      title: "Kidow Links",
      description: "Find my work across the internet.",
      ogImageUrl: "https://cdn.example.com/og.png"
    }
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "build", "--json", "--output", outputDir],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );

  const report = JSON.parse(result.stdout);
  const resolvedOutputDir = await fs.realpath(path.join(tempDir, outputDir));
  const resolvedIndexHtml = await fs.realpath(path.join(tempDir, outputDir, "index.html"));
  const resolvedFavicon = await fs.realpath(path.join(tempDir, outputDir, "favicon.svg"));
  const resolvedOgImage = await fs.realpath(path.join(tempDir, outputDir, "opengraph-image.svg"));
  const resolvedSitemap = await fs.realpath(path.join(tempDir, outputDir, "sitemap.xml"));
  const resolvedRobots = await fs.realpath(path.join(tempDir, outputDir, "robots.txt"));

  assert.equal(result.status, 0);
  assert.equal(report.ok, true);
  assert.equal(report.command, "build");
  assert.equal(report.stage, "write");
  assert.deepEqual(report.issues, []);
  assert.equal(report.outputDir, resolvedOutputDir);
  assert.equal(report.files.favicon, resolvedFavicon);
  assert.equal(report.files.indexHtml, resolvedIndexHtml);
  assert.equal(report.files.ogImage, resolvedOgImage);
  assert.equal(report.files.sitemap, resolvedSitemap);
  assert.equal(report.files.robots, resolvedRobots);
  assert.equal(report.metadata.title, "Kidow Links");
  assert.equal(report.metadata.description, "Find my work across the internet.");
  assert.equal(report.metadata.siteUrl, "https://links.example.com");
  assert.equal(report.metadata.imageUrl, "https://cdn.example.com/og.png");
  assert.equal(report.metadata.twitterCard, "summary_large_image");
  assert.equal(report.result.outputDir, resolvedOutputDir);
  assert.equal(report.result.files.favicon, resolvedFavicon);
  assert.equal(report.result.files.indexHtml, resolvedIndexHtml);
  assert.equal(report.result.files.ogImage, resolvedOgImage);
  assert.match(result.stderr, /\[opentree\] building from opentree\.config\.json/);
  assert.match(result.stderr, /\[opentree\] wrote public\/site\/index\.html/);
});

test("build rejects unknown or incomplete output options", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-build-output-invalid-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const missingValueResult = spawnSync(
    process.execPath,
    [cliPath, "build", "--output"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const unknownOptionResult = spawnSync(
    process.execPath,
    [cliPath, "build", "--target", "public"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );

  assert.equal(missingValueResult.status, 1);
  assert.match(missingValueResult.stderr, /\[opentree\] missing value for --output/);
  assert.equal(unknownOptionResult.status, 1);
  assert.match(unknownOptionResult.stderr, /\[opentree\] unknown option: --target/);
});

test("build supports structured json output for argument failures", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-build-json-invalid-"));

  const result = spawnSync(
    process.execPath,
    [cliPath, "build", "--json", "--target", "public"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );

  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(report.ok, false);
  assert.equal(report.command, "build");
  assert.equal(report.stage, "args");
  assert.equal(report.message, "unknown option: --target");
  assert.deepEqual(report.issues, ["unknown option: --target"]);
  assert.equal(report.files.indexHtml, null);
  assert.equal(report.metadata, null);
  assert.equal(report.result, null);
  assert.match(result.stderr, /\[opentree\] unknown option: --target/);
});

test("build injects canonical and social image tags from metadata", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-build-meta-"));
  await fs.writeFile(
    path.join(tempDir, configFilePath),
    JSON.stringify(
      {
        profile: {
          name: "Kidow",
          bio: "Shipping links.",
          avatarUrl: "https://cdn.example.com/avatar.png"
        },
        links: [
          {
            title: "GitHub",
            url: "https://github.com/kidow"
          }
        ],
        theme: {
          accentColor: "#166534",
          backgroundColor: "#f0fdf4",
          textColor: "#052e16"
        },
        siteUrl: "https://links.example.com",
        metadata: {
          title: "Kidow Links",
          description: "Find my work across the internet.",
          ogImageUrl: "https://cdn.example.com/og.png"
        }
      },
      null,
      2
    ) + "\n"
  );

  const buildResult = spawnSync(process.execPath, [cliPath, "build"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const html = await fs.readFile(path.join(tempDir, buildFilePath), "utf8");
  const sitemap = await fs.readFile(path.join(tempDir, sitemapFilePath), "utf8");
  const robots = await fs.readFile(path.join(tempDir, robotsFilePath), "utf8");

  assert.equal(buildResult.status, 0);
  assert.match(buildResult.stdout, /\[opentree\] wrote dist\/sitemap\.xml/);
  assert.match(buildResult.stdout, /\[opentree\] wrote dist\/robots\.txt/);
  assert.match(html, /<title>Kidow Links<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/links\.example\.com" \/>/);
  assert.match(html, /<meta property="og:url" content="https:\/\/links\.example\.com" \/>/);
  assert.match(html, /<meta property="og:image" content="https:\/\/cdn\.example\.com\/og\.png" \/>/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image" \/>/);
  assert.match(html, /<meta name="twitter:title" content="Kidow Links" \/>/);
  assert.match(sitemap, /<loc>https:\/\/links\.example\.com\/<\/loc>/);
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap: https:\/\/links\.example\.com\/sitemap\.xml/);
  assert.match(
    html,
    /<meta name="twitter:description" content="Find my work across the internet\." \/>/
  );
});

test("build generates a default social image when siteUrl is configured", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-build-default-og-"));
  await writeConfigFile(tempDir, {
    profile: {
      name: "Kidow Studio",
      bio: "A very long bio that should still remain readable on smaller devices without breaking the layout or overflowing its card.",
      avatarUrl: ""
    },
    siteUrl: "https://links.example.com"
  });

  const buildResult = spawnSync(process.execPath, [cliPath, "build"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const html = await fs.readFile(path.join(tempDir, buildFilePath), "utf8");
  const ogImage = await fs.readFile(path.join(tempDir, ogImageFilePath), "utf8");

  assert.equal(buildResult.status, 0);
  assert.match(buildResult.stdout, /\[opentree\] wrote dist\/opengraph-image\.svg/);
  assert.match(html, /<meta property="og:image" content="https:\/\/links\.example\.com\/opengraph-image\.svg" \/>/);
  assert.match(html, /<meta name="twitter:image" content="https:\/\/links\.example\.com\/opengraph-image\.svg" \/>/);
  assert.match(html, /<meta property="og:image:alt" content="Kidow Studio profile image" \/>/);
  assert.match(ogImage, /Kidow Studio/);
});

test("build removes stale sitemap and robots outputs when siteUrl is empty", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-build-clean-"));
  await fs.mkdir(path.join(tempDir, "dist"), { recursive: true });
  await fs.writeFile(path.join(tempDir, sitemapFilePath), "<stale />\n");
  await fs.writeFile(path.join(tempDir, robotsFilePath), "stale\n");

  const initResult = spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const buildResult = spawnSync(process.execPath, [cliPath, "build"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  assert.equal(initResult.status, 0);
  assert.equal(buildResult.status, 0);
  await assert.rejects(fs.readFile(path.join(tempDir, sitemapFilePath), "utf8"), { code: "ENOENT" });
  await assert.rejects(fs.readFile(path.join(tempDir, robotsFilePath), "utf8"), { code: "ENOENT" });
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

test("profile set updates the profile fields in config", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-profile-set-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "profile", "set", "--name", "Kidow", "--bio", "Shipping links.", "--avatar-url", "https://example.com/avatar.png"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const config = JSON.parse(await fs.readFile(path.join(tempDir, configFilePath), "utf8"));

  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[opentree\] updated profile fields: name, bio, avatarUrl/);
  assert.equal(config.profile.name, "Kidow");
  assert.equal(config.profile.bio, "Shipping links.");
  assert.equal(config.profile.avatarUrl, "https://example.com/avatar.png");
});

test("profile set supports structured json output", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-profile-set-json-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const expectedConfigPath = path.join(await fs.realpath(tempDir), configFilePath);

  const result = spawnSync(
    process.execPath,
    [cliPath, "profile", "set", "--name", "Kidow", "--bio", "Shipping links.", "--json"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(report.ok, true);
  assert.equal(report.command, "profile set");
  assert.equal(report.message, "updated profile fields: name, bio");
  assert.deepEqual(report.result.fields, ["name", "bio"]);
  assert.equal(report.result.profile.name, "Kidow");
  assert.equal(report.result.profile.bio, "Shipping links.");
  assert.equal(report.config.profile.name, "Kidow");
  assert.equal(report.configPath, expectedConfigPath);
});

test("profile set rejects invalid updates", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-profile-invalid-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "profile", "set", "--avatar-url", "ftp://example.com/avatar.png"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[opentree\] profile update aborted because the config would be invalid/);
  assert.match(result.stderr, /profile\.avatarUrl must be an http or https URL/);
});

test("site set updates the site url", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-site-set-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "site", "set", "--url", "https://links.example.com"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const config = JSON.parse(await fs.readFile(path.join(tempDir, configFilePath), "utf8"));

  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[opentree\] updated site fields: siteUrl/);
  assert.equal(config.siteUrl, "https://links.example.com");
});

test("site set rejects invalid urls", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-site-invalid-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "site", "set", "--url", "ftp://links.example.com"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[opentree\] site update aborted because the config would be invalid/);
  assert.match(result.stderr, /siteUrl must be an http or https URL when provided/);
});

test("meta set updates metadata fields", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-meta-set-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "meta",
      "set",
      "--title",
      "Kidow Links",
      "--description",
      "Find my work across the internet.",
      "--og-image-url",
      "https://cdn.example.com/og.png"
    ],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const config = JSON.parse(await fs.readFile(path.join(tempDir, configFilePath), "utf8"));

  assert.equal(result.status, 0);
  assert.match(
    result.stdout,
    /\[opentree\] updated metadata fields: title, description, ogImageUrl/
  );
  assert.deepEqual(config.metadata, {
    title: "Kidow Links",
    description: "Find my work across the internet.",
    ogImageUrl: "https://cdn.example.com/og.png"
  });
});

test("meta set supports structured json output", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-meta-set-json-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "meta", "set", "--title", "Kidow Links", "--json"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(report.ok, true);
  assert.equal(report.command, "meta set");
  assert.deepEqual(report.result.fields, ["title"]);
  assert.equal(report.result.metadata.title, "Kidow Links");
  assert.equal(report.config.metadata.title, "Kidow Links");
});

test("meta set rejects invalid og image urls", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-meta-invalid-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "meta", "set", "--og-image-url", "ftp://cdn.example.com/og.png"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[opentree\] meta update aborted because the config would be invalid/);
  assert.match(result.stderr, /metadata\.ogImageUrl must be an http or https URL when provided/);
});

test("config show prints the current config json", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-config-show-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(process.execPath, [cliPath, "config", "show"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const parsed = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(parsed.profile.name, "Your Name");
  assert.equal(parsed.links.length, 2);
});

test("config show supports compact json output", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-config-show-json-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const expectedConfigPath = await fs.realpath(path.join(tempDir, configFilePath));

  const result = spawnSync(process.execPath, [cliPath, "config", "show", "--json"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(report.ok, true);
  assert.equal(report.command, "config show");
  assert.equal(report.stage, "load");
  assert.equal(report.configPath, expectedConfigPath);
  assert.deepEqual(report.issues, []);
  assert.equal(report.result.config.profile.name, "Your Name");
  assert.equal(report.result.config.links.length, 2);
});

test("config show supports explicit pretty output", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-config-show-pretty-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(process.execPath, [cliPath, "config", "show", "--pretty"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /\n  "profile": \{/);
  assert.match(result.stdout, /\n  "links": \[/);
});

test("config show rejects unknown options", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-config-show-invalid-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(process.execPath, [cliPath, "config", "show", "--yaml"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[opentree\] unknown option: --yaml/);
  assert.match(result.stderr, /usage: opentree config show \[--json\|--pretty\]/);
});

test("link add appends a new link", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-link-add-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "link", "add", "--title", "Docs", "--url", "https://example.com/docs"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const config = JSON.parse(await fs.readFile(path.join(tempDir, configFilePath), "utf8"));

  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[opentree\] added link #3: Docs/);
  assert.equal(config.links.length, 3);
  assert.equal(config.links[2].title, "Docs");
  assert.equal(config.links[2].url, "https://example.com/docs");
});

test("link add supports structured json output", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-link-add-json-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "link", "add", "--title", "Docs", "--url", "https://example.com/docs", "--json"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(report.ok, true);
  assert.equal(report.command, "link add");
  assert.equal(report.result.index, 3);
  assert.equal(report.result.link.title, "Docs");
  assert.equal(report.result.link.url, "https://example.com/docs");
  assert.equal(report.result.linksCount, 3);
  assert.equal(report.config.links[2].title, "Docs");
});

test("link list prints indexed links in their current order", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-link-list-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  spawnSync(
    process.execPath,
    [cliPath, "link", "add", "--title", "Docs", "--url", "https://example.com/docs"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  spawnSync(
    process.execPath,
    [cliPath, "link", "move", "--from", "3", "--to", "1"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );

  const result = spawnSync(process.execPath, [cliPath, "link", "list"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /^1\. Docs -> https:\/\/example\.com\/docs/m);
  assert.match(result.stdout, /^2\. GitHub -> https:\/\/github\.com\/your-handle/m);
  assert.match(result.stdout, /^3\. Website -> https:\/\/example\.com/m);
});

test("link list supports structured json output", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-link-list-json-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  spawnSync(
    process.execPath,
    [cliPath, "link", "add", "--title", "Docs", "--url", "https://example.com/docs"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  spawnSync(
    process.execPath,
    [cliPath, "link", "move", "--from", "3", "--to", "1"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );

  const result = spawnSync(process.execPath, [cliPath, "link", "list", "--json"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(report.ok, true);
  assert.equal(report.command, "link list");
  assert.equal(report.stage, "load");
  assert.equal(report.message, "listed 3 links");
  assert.equal(report.result.linksCount, 3);
  assert.deepEqual(report.result.links[0], {
    index: 1,
    title: "Docs",
    url: "https://example.com/docs"
  });
  assert.equal(report.config.links[0].title, "Docs");
});

test("link list supports structured json output for missing config", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-link-list-missing-json-"));
  const result = spawnSync(process.execPath, [cliPath, "link", "list", "--json"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(report.ok, false);
  assert.equal(report.command, "link list");
  assert.equal(report.stage, "load");
  assert.match(report.message, /opentree\.config\.json was not found/);
});

test("link list rejects unknown options", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-link-list-invalid-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(process.execPath, [cliPath, "link", "list", "--yaml"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[opentree\] usage: opentree link list \[--json\]/);
});

test("link add can insert at a 1-based index", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-link-insert-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "link", "add", "--title", "Blog", "--url", "https://example.com/blog", "--index", "1"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const config = JSON.parse(await fs.readFile(path.join(tempDir, configFilePath), "utf8"));

  assert.equal(result.status, 0);
  assert.equal(config.links[0].title, "Blog");
  assert.equal(config.links[1].title, "GitHub");
});

test("link remove deletes a link by 1-based index", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-link-remove-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "link", "remove", "--index", "1"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const config = JSON.parse(await fs.readFile(path.join(tempDir, configFilePath), "utf8"));

  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[opentree\] removed link #1: GitHub/);
  assert.equal(config.links.length, 1);
  assert.equal(config.links[0].title, "Website");
});

test("link remove rejects deleting the last link", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-link-remove-last-"));
  await fs.writeFile(
    path.join(tempDir, configFilePath),
    JSON.stringify(
      {
        profile: {
          name: "Kidow",
          bio: "Only one link left.",
          avatarUrl: ""
        },
        links: [
          {
            title: "Only Link",
            url: "https://example.com"
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

  const result = spawnSync(
    process.execPath,
    [cliPath, "link", "remove", "--index", "1"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /cannot remove the last link/);
});

test("link update changes a specific link", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-link-update-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "link", "update", "--index", "2", "--title", "Portfolio", "--url", "https://example.com/portfolio"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const config = JSON.parse(await fs.readFile(path.join(tempDir, configFilePath), "utf8"));

  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[opentree\] updated link #2/);
  assert.equal(config.links[1].title, "Portfolio");
  assert.equal(config.links[1].url, "https://example.com/portfolio");
});

test("link update rejects invalid url changes", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-link-update-invalid-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "link", "update", "--index", "1", "--url", "mailto:test@example.com"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[opentree\] link update aborted because the config would be invalid/);
  assert.match(result.stderr, /links\[0\]\.url must be an http or https URL/);
});

test("link move reorders links with 1-based indexes", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-link-move-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  spawnSync(
    process.execPath,
    [cliPath, "link", "add", "--title", "Docs", "--url", "https://example.com/docs"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );

  const result = spawnSync(
    process.execPath,
    [cliPath, "link", "move", "--from", "3", "--to", "1"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const config = JSON.parse(await fs.readFile(path.join(tempDir, configFilePath), "utf8"));

  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[opentree\] moved link from #3 to #1/);
  assert.equal(config.links[0].title, "Docs");
  assert.equal(config.links[1].title, "GitHub");
});

test("link move supports structured json output", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-link-move-json-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  spawnSync(
    process.execPath,
    [cliPath, "link", "add", "--title", "Docs", "--url", "https://example.com/docs"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );

  const result = spawnSync(
    process.execPath,
    [cliPath, "link", "move", "--from", "3", "--to", "1", "--json"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(report.ok, true);
  assert.equal(report.command, "link move");
  assert.equal(report.result.from, 3);
  assert.equal(report.result.to, 1);
  assert.equal(report.result.link.title, "Docs");
  assert.equal(report.config.links[0].title, "Docs");
});

test("link move rejects out-of-range indexes", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-link-move-invalid-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "link", "move", "--from", "4", "--to", "1"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--from must be between 1 and 2/);
});

test("theme set updates theme colors", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-theme-set-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "theme", "set", "--accent-color", "#0f766e", "--background-color", "#f0fdfa"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const config = JSON.parse(await fs.readFile(path.join(tempDir, configFilePath), "utf8"));

  assert.equal(result.status, 0);
  assert.match(result.stdout, /\[opentree\] updated theme fields: accentColor, backgroundColor/);
  assert.equal(config.theme.accentColor, "#0f766e");
  assert.equal(config.theme.backgroundColor, "#f0fdfa");
  assert.equal(config.theme.textColor, "#052e16");
});

test("theme set rejects invalid colors", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-theme-invalid-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "theme", "set", "--text-color", "white"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[opentree\] theme update aborted because the config would be invalid/);
  assert.match(result.stderr, /theme\.textColor must be a hex color/);
});

test("theme set supports structured json output for validation failures", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-theme-json-invalid-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "theme", "set", "--text-color", "white", "--json"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(report.ok, false);
  assert.equal(report.command, "theme set");
  assert.equal(report.stage, "validate");
  assert.match(report.message, /theme update aborted because the config would be invalid/);
  assert.match(report.issues[0], /theme\.textColor must be a hex color/);
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
    },
    siteUrl: "https://links.example.com",
    metadata: {
      title: "Kidow Links",
      description: "A rebuilt profile preview.",
      ogImageUrl: "https://cdn.example.com/og.png"
    }
  };

  await fs.writeFile(
    path.join(tempDir, configFilePath),
    JSON.stringify(updatedConfig, null, 2) + "\n"
  );

  const secondResponse = await renderDevResponse(tempDir);
  const secondHtml = secondResponse.body;

  assert.equal(secondResponse.statusCode, 200);
  assert.match(secondHtml, /<title>Kidow Links<\/title>/);
  assert.match(secondHtml, /A rebuilt profile preview\./);
  assert.match(secondHtml, /https:\/\/example\.com\/blog/);
  assert.match(secondHtml, /<meta property="og:url" content="https:\/\/links\.example\.com" \/>/);
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

test("dev supports structured json output", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-dev-json-"));
  await writeConfigFile(tempDir);

  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  const signalProcess = new EventEmitter();
  const server = createFakeServer({ activePort: 43123 });

  const exitPromise = runDev(
    {
      createServer: () => server,
      cwd: tempDir,
      signalProcess,
      stderr,
      stdout
    },
    ["--json", "--port", "0"]
  );

  for (let attempt = 0; attempt < 20 && stdout.buffer.length === 0; attempt += 1) {
    await new Promise((resolve) => {
      setTimeout(resolve, 5);
    });
  }

  const report = JSON.parse(stdout.buffer);

  assert.equal(report.ok, true);
  assert.equal(report.command, "dev");
  assert.equal(report.stage, "listen");
  assert.equal(report.message, "dev server running at http://127.0.0.1:43123");
  assert.deepEqual(report.result, {
    host: "127.0.0.1",
    port: 43123,
    url: "http://127.0.0.1:43123"
  });
  assert.deepEqual(server.listenCalls, [
    {
      host: "127.0.0.1",
      port: 0
    }
  ]);
  assert.match(stderr.buffer, /\[opentree\] dev server running at http:\/\/127\.0\.0\.1:43123/);

  signalProcess.emit("SIGTERM");
  const exitCode = await exitPromise;

  assert.equal(exitCode, 0);
  assert.equal(server.closed, true);
});

test("dev supports structured json output for startup failures", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-dev-missing-json-"));
  const result = spawnSync(process.execPath, [cliPath, "dev", "--json"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(report.ok, false);
  assert.equal(report.command, "dev");
  assert.equal(report.stage, "load");
  assert.match(report.message, /cannot start dev server because opentree\.config\.json was not found/);
  assert.deepEqual(report.issues, ["Run `opentree init` first to create a starter config."]);
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

test("vercel link stores a sanitized root project link", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-vercel-link-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  const spawnCalls = [];
  await writeConfigFile(tempDir, {
    siteUrl: "https://links.example.com"
  });

  const exitCode = await runVercelCommand(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    ["link"],
    {
      inspectVercelProjectLink: async () => ({
        ok: true,
        linked: true,
        project: {
          projectId: "prj_123",
          orgId: "team_456",
          projectName: "opentree",
          extraField: "should-not-survive"
        },
        projectFilePath: path.join(tempDir, rootVercelProjectFilePath)
      }),
      spawn: (command, args, options) => {
        spawnCalls.push({ command, args, options });

        if (args[0] === "whoami") {
          return createFakeChildProcess({
            stdout: "kidow\n"
          });
        }

        return createFakeChildProcess({});
      }
    }
  );

  const linkedProject = JSON.parse(
    await fs.readFile(path.join(tempDir, rootVercelProjectFilePath), "utf8")
  );

  assert.equal(exitCode, 0);
  assert.equal(spawnCalls.length, 2);
  assert.deepEqual(spawnCalls[0].args, ["whoami"]);
  assert.deepEqual(spawnCalls[1].args, ["link"]);
  assert.equal(spawnCalls[1].options.cwd, tempDir);
  assert.match(stderr.buffer, /\[opentree\] linking project root with Vercel CLI/);
  assert.match(stdout.buffer, /\[opentree\] stored Vercel project link at \.vercel\/project\.json/);
  assert.deepEqual(linkedProject, {
    projectId: "prj_123",
    orgId: "team_456",
    projectName: "opentree"
  });
});

test("vercel link supports structured json output", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-vercel-link-json-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  await writeConfigFile(tempDir, {
    siteUrl: "https://links.example.com"
  });

  const exitCode = await runVercelCommand(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    ["link", "--json"],
    {
      inspectVercelProjectLink: async () => ({
        ok: true,
        linked: true,
        project: {
          projectId: "prj_123",
          orgId: "team_456",
          projectName: "opentree"
        },
        projectFilePath: path.join(tempDir, rootVercelProjectFilePath)
      }),
      spawn: (_command, args) => {
        if (args[0] === "whoami") {
          return createFakeChildProcess({
            stdout: "kidow\n"
          });
        }

        return createFakeChildProcess({
          stdout: "Linked via Vercel CLI\n"
        });
      }
    }
  );
  const report = JSON.parse(stdout.buffer);

  assert.equal(exitCode, 0);
  assert.equal(report.ok, true);
  assert.equal(report.command, "vercel link");
  assert.equal(report.stage, "save");
  assert.equal(report.message, "stored Vercel project link at .vercel/project.json");
  assert.equal(report.result.linked, true);
  assert.equal(report.result.project.projectId, "prj_123");
  assert.equal(report.result.projectFilePath, path.join(tempDir, rootVercelProjectFilePath));
  assert.match(stderr.buffer, /Linked via Vercel CLI/);
});

test("vercel link fails when the reusable root link is missing", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-vercel-link-missing-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  await writeConfigFile(tempDir, {
    siteUrl: "https://links.example.com"
  });

  const exitCode = await runVercelCommand(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    ["link"],
    {
      spawn: (command, args) => {
        if (args[0] === "whoami") {
          return createFakeChildProcess({
            stdout: "kidow\n"
          });
        }

        return createFakeChildProcess({});
      }
    }
  );

  assert.equal(exitCode, 1);
  assert.equal(stdout.buffer, "");
  assert.match(stderr.buffer, /no reusable project link was found/);
  assert.match(stderr.buffer, /expected `\.vercel\/project\.json` to be created/);
});

test("vercel link supports structured json output for missing reusable root link", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-vercel-link-missing-json-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  await writeConfigFile(tempDir, {
    siteUrl: "https://links.example.com"
  });

  const exitCode = await runVercelCommand(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    ["link", "--json"],
    {
      spawn: (_command, args) => {
        if (args[0] === "whoami") {
          return createFakeChildProcess({
            stdout: "kidow\n"
          });
        }

        return createFakeChildProcess({});
      }
    }
  );
  const report = JSON.parse(stdout.buffer);

  assert.equal(exitCode, 1);
  assert.equal(report.ok, false);
  assert.equal(report.command, "vercel link");
  assert.equal(report.stage, "inspect");
  assert.equal(report.message, "Vercel link completed, but no reusable project link was found");
});

test("vercel unlink removes local root and dist project links without network calls", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-vercel-unlink-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  await writeVercelProjectFile(tempDir);
  await writeDistVercelProjectFile(tempDir);
  await fs.writeFile(path.join(tempDir, ".vercel", "README.txt"), "keep me\n");

  const exitCode = await runVercelCommand(
    {
      cwd: tempDir,
      stdout,
      stderr
    },
    ["unlink"]
  );

  assert.equal(exitCode, 0);
  assert.equal(stderr.buffer, "");
  await assert.rejects(fs.readFile(path.join(tempDir, rootVercelProjectFilePath), "utf8"), {
    code: "ENOENT"
  });
  await assert.rejects(fs.readFile(path.join(tempDir, distVercelProjectFilePath), "utf8"), {
    code: "ENOENT"
  });
  assert.equal(await fs.readFile(path.join(tempDir, ".vercel", "README.txt"), "utf8"), "keep me\n");
  assert.match(stdout.buffer, /\[opentree\] removed \.vercel\/project\.json/);
  assert.match(stdout.buffer, /\[opentree\] removed dist\/\.vercel\/project\.json/);
  assert.match(stdout.buffer, /\[opentree\] local Vercel project linkage cleared/);
});

test("vercel unlink supports structured json output", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-vercel-unlink-json-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  await writeVercelProjectFile(tempDir);
  await writeDistVercelProjectFile(tempDir);

  const exitCode = await runVercelCommand(
    {
      cwd: tempDir,
      stdout,
      stderr
    },
    ["unlink", "--json"]
  );
  const report = JSON.parse(stdout.buffer);

  assert.equal(exitCode, 0);
  assert.equal(report.ok, true);
  assert.equal(report.command, "vercel unlink");
  assert.equal(report.stage, "remove");
  assert.equal(report.message, "local Vercel project linkage cleared");
  assert.equal(report.result.removedCount, 2);
  assert.deepEqual(report.result.removedPaths, [
    path.join(tempDir, rootVercelProjectFilePath),
    path.join(tempDir, distVercelProjectFilePath)
  ]);
  assert.match(stderr.buffer, /\[opentree\] removed \.vercel\/project\.json/);
});

test("vercel unlink is idempotent when no local project link exists", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-vercel-unlink-empty-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();

  const exitCode = await runVercelCommand(
    {
      cwd: tempDir,
      stdout,
      stderr
    },
    ["unlink"]
  );

  assert.equal(exitCode, 0);
  assert.equal(stderr.buffer, "");
  assert.match(stdout.buffer, /\[opentree\] no local Vercel project link was found/);
});

test("vercel unlink supports structured json output when no local link exists", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-vercel-unlink-empty-json-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();

  const exitCode = await runVercelCommand(
    {
      cwd: tempDir,
      stdout,
      stderr
    },
    ["unlink", "--json"]
  );
  const report = JSON.parse(stdout.buffer);

  assert.equal(exitCode, 0);
  assert.equal(report.ok, true);
  assert.equal(report.command, "vercel unlink");
  assert.equal(report.message, "no local Vercel project link was found");
  assert.deepEqual(report.result, {
    removedCount: 0,
    removedPaths: []
  });
});

test("vercel status reports healthy local link and auth state", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-vercel-status-ok-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  await writeVercelProjectFile(tempDir);

  const exitCode = await runVercelCommand(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    ["status"],
    {
      spawn: (_command, args) => {
        if (args[0] === "whoami") {
          return createFakeChildProcess({
            stdout: "kidow\n"
          });
        }

        throw new Error("unexpected spawn call");
      }
    }
  );

  assert.equal(exitCode, 0);
  assert.equal(stderr.buffer, "");
  assert.match(stdout.buffer, /\[opentree\] vercel status/);
  assert.match(stdout.buffer, /\[pass\] vercel: CLI is installed/);
  assert.match(stdout.buffer, /\[pass\] vercel auth: logged in as kidow/);
  assert.match(stdout.buffer, /\[pass\] vercel link: project root is linked to opentree \(prj_123\)/);
  assert.match(stdout.buffer, /\[opentree\] vercel status found no issues/);
});

test("vercel status supports structured json output for failing state", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-vercel-status-fail-json-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();

  const exitCode = await runVercelCommand(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    ["status", "--json"],
    {
      spawn: () =>
        createFakeChildProcess({
          error: Object.assign(new Error("vercel not found"), { code: "ENOENT" })
        })
    }
  );
  const report = JSON.parse(stdout.buffer);

  assert.equal(exitCode, 1);
  assert.equal(stderr.buffer, "");
  assert.equal(report.ok, false);
  assert.equal(report.command, "vercel status");
  assert.equal(report.stage, "status");
  assert.equal(report.summary, "[opentree] vercel status found 2 issue(s)");
  assert.equal(report.issueCount, 2);
  assert.equal(report.result.cli.installed, false);
  assert.equal(report.result.auth.checked, false);
  assert.equal(report.result.link.linked, false);
  assert.equal(report.result.link.kind, "missing");
  assert.equal(report.message, "[opentree] vercel status found 2 issue(s)");
  assert.deepEqual(report.issues, [
    "CLI is not installed",
    "root Vercel project link was not found"
  ]);
});

test("deploy runs build first and forwards the deployment url", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-deploy-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  const spawnCalls = [];
  const buildCalls = [];
  await writeConfigFile(tempDir, {
    siteUrl: "https://links.example.com"
  });
  await writeVercelProjectFile(tempDir);

  const exitCode = await runDeploy(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    ["--prod"],
    {
      runBuild: async (io) => {
        buildCalls.push(io);
        return 0;
      },
      spawn: (command, args, options) => {
        spawnCalls.push({ command, args, options });

        if (args[0] === "whoami") {
          return createFakeChildProcess({
            stdout: "kidow\n"
          });
        }

        return createFakeChildProcess({
          stdout: "https://opentree-demo.vercel.app\n",
          stderr: "Inspect: https://vercel.com/kidow/opentree\n"
        });
      }
    }
  );

  assert.equal(exitCode, 0);
  assert.equal(buildCalls.length, 1);
  assert.equal(buildCalls[0].stdout, stderr);
  assert.equal(spawnCalls.length, 2);
  assert.match(stderr.buffer, /\[opentree\] deploy mode: prod/);
  assert.equal(spawnCalls[0].command, "vercel");
  assert.deepEqual(spawnCalls[0].args, ["whoami"]);
  assert.equal(spawnCalls[0].options.cwd, tempDir);
  assert.equal(spawnCalls[1].command, "vercel");
  assert.deepEqual(spawnCalls[1].args, ["--cwd", path.join(tempDir, "dist"), "--prod"]);
  assert.equal(spawnCalls[1].options.cwd, tempDir);
  assert.deepEqual(
    JSON.parse(await fs.readFile(path.join(tempDir, distVercelProjectFilePath), "utf8")),
    {
      projectId: "prj_123",
      orgId: "team_456",
      projectName: "opentree"
    }
  );
  assert.match(stdout.buffer, /https:\/\/opentree-demo\.vercel\.app/);
  assert.match(stderr.buffer, /\[opentree\] Vercel CLI authenticated as kidow/);
  assert.match(stderr.buffer, /\[opentree\] synced Vercel project link to dist\/\.vercel\/project\.json/);
  assert.match(stderr.buffer, /\[opentree\] production deployment ready/);
  assert.match(stderr.buffer, /\[opentree\] deployment url: https:\/\/opentree-demo\.vercel\.app/);
  assert.match(stderr.buffer, /\[opentree\] inspect url: https:\/\/vercel\.com\/kidow\/opentree/);
});

test("deploy supports explicit preview mode without forwarding --prod", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-deploy-preview-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  const spawnCalls = [];
  await writeConfigFile(tempDir, {
    siteUrl: "https://links.example.com"
  });
  await writeVercelProjectFile(tempDir);

  const exitCode = await runDeploy(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    ["--preview"],
    {
      runBuild: async () => 0,
      spawn: (command, args, options) => {
        spawnCalls.push({ command, args, options });

        if (args[0] === "whoami") {
          return createFakeChildProcess({
            stdout: "kidow\n"
          });
        }

        return createFakeChildProcess({
          stdout: "https://opentree-preview.vercel.app\n"
        });
      }
    }
  );

  assert.equal(exitCode, 0);
  assert.equal(spawnCalls.length, 2);
  assert.match(stderr.buffer, /\[opentree\] deploy mode: preview/);
  assert.deepEqual(spawnCalls[1].args, ["--cwd", path.join(tempDir, "dist")]);
  assert.match(stderr.buffer, /\[opentree\] preview deployment ready/);
  assert.match(stderr.buffer, /\[opentree\] deployment url: https:\/\/opentree-preview\.vercel\.app/);
  assert.match(stdout.buffer, /https:\/\/opentree-preview\.vercel\.app/);
});

test("deploy supports structured json output on success", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-deploy-json-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  await writeConfigFile(tempDir, {
    siteUrl: "https://links.example.com"
  });
  await writeVercelProjectFile(tempDir);

  const exitCode = await runDeploy(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    ["--prod", "--json"],
    {
      runBuild: async () => 0,
      spawn: (_command, args) => {
        if (args[0] === "whoami") {
          return createFakeChildProcess({
            stdout: "kidow\n"
          });
        }

        return createFakeChildProcess({
          stdout: "https://opentree-json.vercel.app\n",
          stderr: "Inspect: https://vercel.com/kidow/opentree-json\n"
        });
      }
    }
  );

  const report = JSON.parse(stdout.buffer);

  assert.equal(exitCode, 0);
  assert.equal(report.ok, true);
  assert.equal(report.command, "deploy");
  assert.equal(report.mode, "prod");
  assert.equal(report.stage, "deploy");
  assert.equal(report.cwd, tempDir);
  assert.equal(report.outputDir, path.join(tempDir, "dist"));
  assert.deepEqual(report.issues, []);
  assert.equal(report.deploymentUrl, "https://opentree-json.vercel.app");
  assert.equal(report.inspectUrl, "https://vercel.com/kidow/opentree-json");
  assert.equal(report.project.projectId, "prj_123");
  assert.equal(report.project.orgId, "team_456");
  assert.equal(report.project.projectName, "opentree");
  assert.equal(report.projectFilePath, path.join(tempDir, "dist", ".vercel", "project.json"));
  assert.equal(report.result.mode, "prod");
  assert.equal(report.result.target, "production");
  assert.equal(report.result.deploymentUrl, "https://opentree-json.vercel.app");
  assert.equal(report.result.inspectUrl, "https://vercel.com/kidow/opentree-json");
  assert.match(stderr.buffer, /\[opentree\] production deployment ready/);
  assert.match(stderr.buffer, /\[opentree\] deployment url: https:\/\/opentree-json\.vercel\.app/);
  assert.match(stderr.buffer, /\[opentree\] inspect url: https:\/\/vercel\.com\/kidow\/opentree-json/);
});

test("deploy reports a missing vercel cli", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-deploy-missing-cli-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  await writeConfigFile(tempDir, {
    siteUrl: "https://links.example.com"
  });

  const exitCode = await runDeploy(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    [],
    {
      runBuild: async () => {
        throw new Error("runBuild should not be called when vercel is unavailable");
      },
      spawn: () => createFakeChildProcess({ error: { code: "ENOENT" } })
    }
  );

  assert.equal(exitCode, 1);
  assert.equal(stdout.buffer, "");
  assert.match(stderr.buffer, /checking Vercel readiness/);
  assert.match(stderr.buffer, /CLI is not installed/);
  assert.match(stderr.buffer, /npm install -g vercel/);
});

test("deploy uses the shared Vercel status collector for preflight", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-deploy-shared-status-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  await writeConfigFile(tempDir, {
    siteUrl: "https://links.example.com"
  });
  await writeVercelProjectFile(tempDir);

  const exitCode = await runDeploy(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    [],
    {
      collectVercelStatus: async () => ({
        checks: [
          {
            id: "vercel",
            status: "fail",
            message: "CLI is not installed",
            hints: ["install it with `npm install -g vercel`"],
            details: []
          }
        ],
        result: {
          cli: {
            installed: false
          },
          auth: {
            installed: false,
            checked: false,
            authenticated: false,
            username: ""
          },
          link: {
            kind: "linked",
            linked: true,
            project: {
              projectId: "prj_123",
              orgId: "team_456",
              projectName: "opentree"
            },
            projectFilePath: path.join(tempDir, ".vercel", "project.json")
          }
        }
      }),
      runBuild: async () => {
        throw new Error("runBuild should not be called when shared diagnostics fail");
      },
      spawn: (_command, args) => {
        if (args[0] === "whoami") {
          return createFakeChildProcess({
            stdout: "kidow\n"
          });
        }

        return createFakeChildProcess({
          stdout: "https://opentree-preview.vercel.app\n"
        });
      }
    }
  );

  assert.equal(exitCode, 1);
  assert.equal(stdout.buffer, "");
  assert.match(stderr.buffer, /CLI is not installed/);
  assert.match(stderr.buffer, /npm install -g vercel/);
});

test("deploy requires siteUrl before running build", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-deploy-site-url-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  await writeConfigFile(tempDir);

  const exitCode = await runDeploy(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    [],
    {
      runBuild: async () => {
        throw new Error("runBuild should not be called when siteUrl is missing");
      },
      spawn: () => {
        throw new Error("spawn should not be called when siteUrl is missing");
      }
    }
  );

  assert.equal(exitCode, 1);
  assert.equal(stdout.buffer, "");
  assert.match(stderr.buffer, /deploy preflight failed because siteUrl is missing/);
  assert.match(stderr.buffer, /opentree site set --url <your-production-url>/);
});

test("deploy reports when vercel login is missing", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-deploy-login-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  await writeConfigFile(tempDir, {
    siteUrl: "https://links.example.com"
  });

  const exitCode = await runDeploy(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    [],
    {
      runBuild: async () => {
        throw new Error("runBuild should not be called when vercel login is missing");
      },
      spawn: () =>
        createFakeChildProcess({
          stderr: "Error: Not logged in\n",
          exitCode: 1
        })
    }
  );

  assert.equal(exitCode, 1);
  assert.equal(stdout.buffer, "");
  assert.match(stderr.buffer, /checking Vercel readiness/);
  assert.match(stderr.buffer, /CLI is not logged in/);
  assert.match(stderr.buffer, /Error: Not logged in/);
  assert.match(stderr.buffer, /run `vercel login`/);
});

test("deploy supports structured json output for argument failures", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-deploy-json-fail-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();

  const exitCode = await runDeploy(
    {
      cwd: tempDir,
      stdout,
      stderr
    },
    ["--json", "--target", "prod"]
  );

  const report = JSON.parse(stdout.buffer);

  assert.equal(exitCode, 1);
  assert.equal(report.ok, false);
  assert.equal(report.command, "deploy");
  assert.equal(report.stage, "args");
  assert.equal(report.mode, "preview");
  assert.equal(report.deploymentUrl, null);
  assert.equal(report.project, null);
  assert.equal(report.message, "unknown option: --target");
  assert.deepEqual(report.issues, ["unknown option: --target"]);
  assert.equal(report.result, null);
  assert.match(stderr.buffer, /\[opentree\] unknown option: --target/);
});

test("deploy requires a reusable root Vercel project link", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-deploy-link-missing-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  await writeConfigFile(tempDir, {
    siteUrl: "https://links.example.com"
  });

  const exitCode = await runDeploy(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    [],
    {
      runBuild: async () => {
        throw new Error("runBuild should not be called when the Vercel project link is missing");
      },
      spawn: (command, args) => {
        if (args[0] === "whoami") {
          return createFakeChildProcess({
            stdout: "kidow\n"
          });
        }

        throw new Error("deploy should not start when the Vercel project link is missing");
      }
    }
  );

  assert.equal(exitCode, 1);
  assert.equal(stdout.buffer, "");
  assert.match(stderr.buffer, /root Vercel project link was not found/);
  assert.match(
    stderr.buffer,
    /run `opentree vercel link` to create a reusable root-level project link/
  );
});

test("deploy reports inspect url and guidance when the deploy step fails", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-deploy-fail-guidance-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  await writeConfigFile(tempDir, {
    siteUrl: "https://links.example.com"
  });
  await writeVercelProjectFile(tempDir);

  const exitCode = await runDeploy(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    ["--prod", "--json"],
    {
      runBuild: async () => 0,
      spawn: (_command, args) => {
        if (args[0] === "whoami") {
          return createFakeChildProcess({
            stdout: "kidow\n"
          });
        }

        return createFakeChildProcess({
          stderr: "Inspect: https://vercel.com/kidow/opentree-failed\n",
          exitCode: 1
        });
      }
    }
  );

  const report = JSON.parse(stdout.buffer);

  assert.equal(exitCode, 1);
  assert.equal(report.ok, false);
  assert.equal(report.stage, "deploy");
  assert.equal(report.inspectUrl, "https://vercel.com/kidow/opentree-failed");
  assert.equal(report.result.target, "production");
  assert.equal(report.result.inspectUrl, "https://vercel.com/kidow/opentree-failed");
  assert.match(stderr.buffer, /\[opentree\] inspect url: https:\/\/vercel\.com\/kidow\/opentree-failed/);
  assert.match(stderr.buffer, /\[opentree\] review the Vercel inspect output and logs, then retry the deploy/);
});

test("deploy rejects unsupported or conflicting mode flags", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-deploy-mode-invalid-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();

  const unknownOptionExitCode = await runDeploy(
    {
      cwd: tempDir,
      stdout,
      stderr
    },
    ["--target", "prod"]
  );

  assert.equal(unknownOptionExitCode, 1);
  assert.match(stderr.buffer, /\[opentree\] unknown option: --target/);

  stderr.buffer = "";
  stdout.buffer = "";

  const conflictingModeExitCode = await runDeploy(
    {
      cwd: tempDir,
      stdout,
      stderr
    },
    ["--prod", "--preview"]
  );

  assert.equal(conflictingModeExitCode, 1);
  assert.match(stderr.buffer, /\[opentree\] choose only one deploy mode: --prod or --preview/);
});

test("doctor reports a healthy project and vercel session", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-doctor-ok-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  await writeConfigFile(tempDir, {
    siteUrl: "https://links.example.com"
  });
  await writeVercelProjectFile(tempDir);

  const exitCode = await runDoctor(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    [],
    {
      spawn: () =>
        createFakeChildProcess({
          stdout: "kidow\n"
        })
    }
  );

  assert.equal(exitCode, 0);
  assert.equal(stderr.buffer, "");
  assert.match(stdout.buffer, /\[pass\] config: opentree\.config\.json is valid/);
  assert.match(stdout.buffer, /\[pass\] siteUrl: configured as https:\/\/links\.example\.com/);
  assert.match(stdout.buffer, /\[pass\] vercel: CLI is installed/);
  assert.match(stdout.buffer, /\[pass\] vercel auth: logged in as kidow/);
  assert.match(stdout.buffer, /\[pass\] vercel link: project root is linked to opentree \(prj_123\)/);
  assert.match(stdout.buffer, /\[opentree\] doctor found no issues/);
});

test("doctor supports json output for healthy projects", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-doctor-json-ok-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
  await writeConfigFile(tempDir, {
    siteUrl: "https://links.example.com"
  });
  await writeVercelProjectFile(tempDir);

  const exitCode = await runDoctor(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    ["--json"],
    {
      spawn: () =>
        createFakeChildProcess({
          stdout: "kidow\n"
        })
    }
  );

  const report = JSON.parse(stdout.buffer);

  assert.equal(exitCode, 0);
  assert.equal(stderr.buffer, "");
  assert.equal(report.ok, true);
  assert.equal(report.command, "doctor");
  assert.equal(report.stage, "status");
  assert.equal(report.issueCount, 0);
  assert.equal(report.cwd, tempDir);
  assert.equal(report.message, "[opentree] doctor found no issues");
  assert.equal(report.summary, "[opentree] doctor found no issues");
  assert.deepEqual(report.issues, []);
  assert.equal(report.result.config.kind, "valid");
  assert.equal(report.result.siteUrl.value, "https://links.example.com");
  assert.equal(report.result.vercel.auth.username, "kidow");
  assert.equal(report.result.vercel.link.project.projectId, "prj_123");
  assert.equal(report.checks.length, 5);
  assert.deepEqual(
    report.checks.map((check) => [check.id, check.status]),
    [
      ["config", "pass"],
      ["siteUrl", "pass"],
      ["vercel", "pass"],
      ["vercel auth", "pass"],
      ["vercel link", "pass"]
    ]
  );
});

test("doctor reports missing config and missing vercel cli", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-doctor-missing-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();

  const exitCode = await runDoctor(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    [],
    {
      spawn: () => createFakeChildProcess({ error: { code: "ENOENT" } })
    }
  );

  assert.equal(exitCode, 1);
  assert.equal(stderr.buffer, "");
  assert.match(stdout.buffer, /\[fail\] config: opentree\.config\.json was not found/);
  assert.match(stdout.buffer, /\[skip\] siteUrl: could not be checked because the config is unavailable/);
  assert.match(stdout.buffer, /\[fail\] vercel: CLI is not installed/);
  assert.match(stdout.buffer, /\[skip\] vercel auth: could not be checked because the Vercel CLI is unavailable/);
  assert.match(stdout.buffer, /\[fail\] vercel link: root Vercel project link was not found/);
  assert.match(stdout.buffer, /\[opentree\] doctor found 3 issue\(s\)/);
});

test("doctor reports invalid config and missing vercel login", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-doctor-invalid-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();
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
  await writeVercelProjectFile(tempDir);

  const exitCode = await runDoctor(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    [],
    {
      spawn: () =>
        createFakeChildProcess({
          stderr: "Error: Not logged in\n",
          exitCode: 1
        })
    }
  );

  assert.equal(exitCode, 1);
  assert.equal(stderr.buffer, "");
  assert.match(stdout.buffer, /\[fail\] config: opentree\.config\.json has validation issues/);
  assert.match(stdout.buffer, /links\[0\]\.url must be an http or https URL/);
  assert.match(stdout.buffer, /\[fail\] siteUrl: missing from opentree\.config\.json/);
  assert.match(stdout.buffer, /\[pass\] vercel: CLI is installed/);
  assert.match(stdout.buffer, /\[fail\] vercel auth: CLI is not logged in/);
  assert.match(stdout.buffer, /\[pass\] vercel link: project root is linked to opentree \(prj_123\)/);
  assert.match(stdout.buffer, /\[opentree\] doctor found 3 issue\(s\)/);
});

test("doctor supports json output for failing projects", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-doctor-json-fail-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();

  const exitCode = await runDoctor(
    {
      cwd: tempDir,
      stdout,
      stderr,
      env: { ...process.env }
    },
    ["--json"],
    {
      spawn: () => createFakeChildProcess({ error: { code: "ENOENT" } })
    }
  );

  const report = JSON.parse(stdout.buffer);

  assert.equal(exitCode, 1);
  assert.equal(stderr.buffer, "");
  assert.equal(report.ok, false);
  assert.equal(report.command, "doctor");
  assert.equal(report.stage, "status");
  assert.equal(report.issueCount, 3);
  assert.equal(report.message, "[opentree] doctor found 3 issue(s)");
  assert.equal(report.summary, "[opentree] doctor found 3 issue(s)");
  assert.equal(report.result.config.ok, false);
  assert.equal(report.result.siteUrl.configured, false);
  assert.equal(report.result.vercel.cli.installed, false);
  assert.deepEqual(
    report.checks.map((check) => [check.id, check.status]),
    [
      ["config", "fail"],
      ["siteUrl", "skip"],
      ["vercel", "fail"],
      ["vercel auth", "skip"],
      ["vercel link", "fail"]
    ]
  );
  assert.match(report.checks[0].message, /opentree\.config\.json was not found/);
  assert.deepEqual(report.issues, [
    `opentree.config.json was not found in ${tempDir}`,
    "CLI is not installed",
    "root Vercel project link was not found"
  ]);
});

test("doctor returns structured json for argument failures", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-doctor-json-args-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();

  const exitCode = await runDoctor(
    {
      cwd: tempDir,
      stdout,
      stderr
    },
    ["--bad", "--json"]
  );

  const report = JSON.parse(stdout.buffer);

  assert.equal(exitCode, 1);
  assert.equal(report.ok, false);
  assert.equal(report.command, "doctor");
  assert.equal(report.stage, "args");
  assert.equal(report.message, "usage: opentree doctor [--json]");
  assert.deepEqual(report.issues, ["usage: opentree doctor [--json]"]);
  assert.equal(report.result, null);
  assert.match(stderr.buffer, /\[opentree\] usage: opentree doctor \[--json\]/);
});

test("vercel status returns structured json for argument failures", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-vercel-status-json-args-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();

  const exitCode = await runVercelCommand(
    {
      cwd: tempDir,
      stdout,
      stderr
    },
    ["status", "--bad", "--json"]
  );

  const report = JSON.parse(stdout.buffer);

  assert.equal(exitCode, 1);
  assert.equal(report.ok, false);
  assert.equal(report.command, "vercel status");
  assert.equal(report.stage, "args");
  assert.equal(report.message, "usage: opentree vercel status [--json]");
  assert.deepEqual(report.issues, ["usage: opentree vercel status [--json]"]);
  assert.equal(report.result, null);
  assert.match(stderr.buffer, /\[opentree\] usage: opentree vercel status \[--json\]/);
});

test("vercel command returns structured json for invalid subcommands", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-vercel-json-subcommand-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();

  const exitCode = await runVercelCommand(
    {
      cwd: tempDir,
      stdout,
      stderr
    },
    ["nope", "--json"]
  );

  const report = JSON.parse(stdout.buffer);

  assert.equal(exitCode, 1);
  assert.equal(report.ok, false);
  assert.equal(report.command, "vercel");
  assert.equal(report.stage, "args");
  assert.equal(report.message, "usage: opentree vercel <link|unlink|status>");
  assert.deepEqual(report.issues, ["usage: opentree vercel <link|unlink|status>"]);
  assert.equal(report.result, null);
  assert.match(stderr.buffer, /\[opentree\] usage: opentree vercel <link\|unlink\|status>/);
});

test("deploy rejects a custom cwd override", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-deploy-cwd-"));
  const stdout = new MemoryWritable();
  const stderr = new MemoryWritable();

  const exitCode = await runDeploy(
    {
      cwd: tempDir,
      stdout,
      stderr
    },
    ["--cwd", "somewhere-else"]
  );

  assert.equal(exitCode, 1);
  assert.match(stderr.buffer, /--cwd is managed by `opentree deploy`/);
});

test("deploy fails when build cannot produce a valid deploy bundle", () => {
  const tempDir = fs.mkdtemp(path.join(os.tmpdir(), "opentree-deploy-preflight-config-"));
  return tempDir.then((resolvedTempDir) => {
    const result = spawnSync(process.execPath, [cliPath, "deploy"], {
      cwd: resolvedTempDir,
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /\[opentree\] preparing deploy bundle/);
    assert.match(result.stderr, /\[opentree\] opentree\.config\.json was not found/);
  });
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

test("help output includes task-oriented examples", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Quick Start:/);
  assert.match(result.stdout, /Common Tasks:/);
  assert.match(result.stdout, /opentree init --name "Kidow"/);
  assert.match(result.stdout, /opentree deploy --prod/);
  assert.match(result.stdout, /opentree doctor/);
});

test("completion command prints bash completion", () => {
  const result = spawnSync(process.execPath, [cliPath, "completion", "bash"], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /complete -F _opentree_completion opentree/);
  assert.match(result.stdout, /COMPREPLY/);
});

test("completion command prints zsh completion", () => {
  const result = spawnSync(process.execPath, [cliPath, "completion", "zsh"], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /#compdef opentree/);
  assert.match(result.stdout, /_arguments/);
});

test("completion command rejects unsupported shells", () => {
  const result = spawnSync(process.execPath, [cliPath, "completion", "fish"], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /\[opentree\] usage: opentree completion <bash\|zsh>/);
});

test("init supports template selection", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-init-template-"));

  const result = spawnSync(
    process.execPath,
    [cliPath, "init", "--template", "terminal"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const config = JSON.parse(await fs.readFile(path.join(tempDir, configFilePath), "utf8"));

  assert.equal(result.status, 0);
  assert.equal(config.template, "terminal");
});

test("link preset adds a known destination from a handle", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-link-preset-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "link", "preset", "--name", "github", "--handle", "kidow", "--json"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(report.command, "link preset");
  assert.equal(report.result.link.url, "https://github.com/kidow");
  assert.equal(report.result.link.title, "GitHub");
});

test("interactive command creates a config from prompt answers", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-interactive-"));

  const result = spawnSync(
    process.execPath,
    [cliPath, "interactive"],
    {
      cwd: tempDir,
      encoding: "utf8",
      input: ["Kidow", "CLI profile", "", "https://links.example.com", "terminal", "Docs", "https://example.com/docs"].join("\n") + "\n"
    }
  );
  const config = JSON.parse(await fs.readFile(path.join(tempDir, configFilePath), "utf8"));

  assert.equal(result.status, 0);
  assert.equal(config.profile.name, "Kidow");
  assert.equal(config.template, "terminal");
  assert.equal(config.links[0].url, "https://example.com/docs");
});

test("import links loads links from a JSON file", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-import-links-"));
  const importFile = path.join(tempDir, "links.json");
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  await fs.writeFile(
    importFile,
    JSON.stringify([
      { title: "Docs", url: "https://example.com/docs" },
      { title: "GitHub", url: "https://github.com/kidow" }
    ]) + "\n"
  );

  const result = spawnSync(
    process.execPath,
    [cliPath, "import", "links", "--file", importFile, "--replace", "--json"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const report = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(report.command, "import links");
  assert.equal(report.result.linksCount, 2);
  assert.equal(report.result.links[0].title, "Docs");
});

test("prompt command applies deterministic natural language edits", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-prompt-"));
  spawnSync(process.execPath, [cliPath, "init"], {
    cwd: tempDir,
    encoding: "utf8"
  });

  const result = spawnSync(
    process.execPath,
    [cliPath, "prompt", "set my name to Kidow and add link Docs https://example.com/docs and set template to terminal"],
    {
      cwd: tempDir,
      encoding: "utf8"
    }
  );
  const config = JSON.parse(await fs.readFile(path.join(tempDir, configFilePath), "utf8"));

  assert.equal(result.status, 0);
  assert.equal(config.profile.name, "Kidow");
  assert.equal(config.template, "terminal");
  assert.equal(config.links.at(-1).url, "https://example.com/docs");
});

test("build supports alternate templates, qr, click tracking, and social card customization", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opentree-build-expansion-"));
  await fs.writeFile(
    path.join(tempDir, configFilePath),
    JSON.stringify(
      {
        ...createConfig({
          profile: {
            name: "Kidow",
            bio: "Shipping links."
          },
          siteUrl: "https://links.example.com",
          template: "terminal",
          analytics: {
            clickTracking: "local"
          },
          metadata: {
            title: "Kidow Links",
            description: "Find my work.",
            ogImageUrl: "",
            socialCard: {
              eyebrow: "Operator Manual",
              style: "terminal",
              showQrCode: true
            }
          }
        })
      },
      null,
      2
    ) + "\n"
  );

  const result = spawnSync(process.execPath, [cliPath, "build"], {
    cwd: tempDir,
    encoding: "utf8"
  });
  const html = await fs.readFile(path.join(tempDir, buildFilePath), "utf8");
  const ogImage = await fs.readFile(path.join(tempDir, ogImageFilePath), "utf8");

  assert.equal(result.status, 0);
  assert.match(html, /data-template="terminal"/);
  assert.match(html, /api\.qrserver\.com/);
  assert.match(html, /localStorage/);
  assert.match(html, /data-link-id="1"/);
  assert.match(ogImage, /Operator Manual/);
});
