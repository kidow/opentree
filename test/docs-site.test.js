const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

const rootDir = path.join(__dirname, "..");
const docsAppDir = path.join(rootDir, "apps", "docs");

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

test("root package exposes docs app scripts", async () => {
  const packageJson = await readJson(path.join(rootDir, "package.json"));

  assert.equal(packageJson.scripts["docs:dev"], "npm --prefix apps/docs run dev");
  assert.equal(packageJson.scripts["docs:build"], "npm --prefix apps/docs run build");
  assert.equal(packageJson.scripts["docs:test"], "npm --prefix apps/docs run test");
});

test("docs app includes the planned Fumadocs skeleton", async () => {
  const docsPackageJson = await readJson(path.join(docsAppDir, "package.json"));
  const sourceConfig = await readText(path.join(docsAppDir, "source.config.ts"));
  const sourceLoader = await readText(path.join(docsAppDir, "lib", "source.ts"));
  const appLayout = await readText(path.join(docsAppDir, "app", "layout.tsx"));
  const docsLayout = await readText(path.join(docsAppDir, "app", "docs", "layout.tsx"));
  const docsPage = await readText(
    path.join(docsAppDir, "app", "docs", "[[...slug]]", "page.tsx")
  );
  const searchRoute = await readText(
    path.join(docsAppDir, "app", "api", "search", "route.ts")
  );

  assert.equal(docsPackageJson.private, true);
  assert.equal(docsPackageJson.scripts.dev, "next dev");
  assert.equal(docsPackageJson.scripts.build, "next build");
  assert.equal(docsPackageJson.scripts.test, "node --test");
  assert.equal(docsPackageJson.scripts.postinstall, "fumadocs-mdx");
  assert.match(docsPackageJson.dependencies.next, /^15\./);
  assert.match(sourceConfig, /dir:\s*["']content\/docs["']/);
  assert.match(sourceLoader, /baseUrl:\s*["']\/docs["']/);
  assert.match(appLayout, /RootProvider/);
  assert.match(docsLayout, /DocsLayout/);
  assert.match(docsPage, /source\.getPage/);
  assert.match(docsPage, /generateStaticParams/);
  assert.match(searchRoute, /createFromSource/);
});

test("docs app ships the initial landing and information architecture content", async () => {
  const homePage = await readText(path.join(docsAppDir, "app", "page.tsx"));
  const docsIndex = await readText(path.join(docsAppDir, "content", "docs", "index.mdx"));
  const gettingStartedMeta = await readJson(
    path.join(docsAppDir, "content", "docs", "getting-started", "meta.json")
  );
  const guidesMeta = await readJson(
    path.join(docsAppDir, "content", "docs", "guides", "meta.json")
  );
  const referenceMeta = await readJson(
    path.join(docsAppDir, "content", "docs", "reference", "meta.json")
  );

  await fs.access(
    path.join(docsAppDir, "content", "docs", "getting-started", "installation.mdx")
  );
  await fs.access(path.join(docsAppDir, "content", "docs", "getting-started", "quick-start.mdx"));
  await fs.access(path.join(docsAppDir, "content", "docs", "guides", "config-file.mdx"));
  await fs.access(path.join(docsAppDir, "content", "docs", "guides", "preview-and-build.mdx"));
  await fs.access(path.join(docsAppDir, "content", "docs", "guides", "deploy-to-vercel.mdx"));
  await fs.access(path.join(docsAppDir, "content", "docs", "reference", "cli-commands.mdx"));
  await fs.access(path.join(docsAppDir, "content", "docs", "reference", "config-schema.mdx"));

  assert.match(homePage, /CLI-first link-in-bio generator/);
  assert.match(homePage, /init -> edit -> build -> deploy/);
  assert.match(homePage, /5-minute quick start/i);
  assert.match(docsIndex, /Start here/);
  assert.deepEqual(gettingStartedMeta.pages, [
    "installation",
    "quick-start",
    "interactive-setup"
  ]);
  assert.deepEqual(guidesMeta.pages, [
    "config-file",
    "editing-profile",
    "editing-links",
    "import-and-prompt",
    "preview-and-build",
    "deploy-to-vercel",
    "doctor-and-troubleshooting"
  ]);
  assert.deepEqual(referenceMeta.pages, [
    "cli-commands",
    "config-schema",
    "json-output",
    "templates-presets-and-analytics"
  ]);
});
