const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const rootDir = path.join(__dirname, "..");
const docsDir = path.join(rootDir, "docs");

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

test("root package does not contain docs proxy scripts", async () => {
  const packageJson = await readJson(path.join(rootDir, "package.json"));

  assert.equal("docs:dev" in packageJson.scripts, false);
  assert.equal("docs:build" in packageJson.scripts, false);
  assert.equal("docs:test" in packageJson.scripts, false);
});

test("docs app ships the current custom shell and command palette entry points", async () => {
  const docsPackageJson = await readJson(path.join(docsDir, "package.json"));
  const layout = await readText(path.join(docsDir, "src", "app", "layout.tsx"));
  const header = await readText(path.join(docsDir, "src", "components", "header.tsx"));
  const globals = await readText(path.join(docsDir, "src", "app", "globals.css"));
  const navigation = await readText(path.join(docsDir, "src", "lib", "navigation.ts"));
  const page = await readText(path.join(docsDir, "src", "app", "page.mdx"));
  const searchDialog = await readText(
    path.join(docsDir, "src", "components", "search-dialog.tsx")
  );
  const searchIndex = await readText(
    path.join(docsDir, "src", "lib", "search-index.mjs")
  );

  assert.equal(docsPackageJson.private, true);
  assert.equal(docsPackageJson.scripts.dev, "next dev --webpack");
  assert.equal(docsPackageJson.scripts.build, "next build --webpack");
  assert.equal("test" in docsPackageJson.scripts, false);
  assert.match(docsPackageJson.dependencies.next, /16\./);
  assert.match(layout, /<Header \/>/);
  assert.match(layout, /<Sidebar \/>/);
  assert.match(layout, /CopyPageButton/);
  assert.match(header, /SearchDialog/);
  assert.match(searchDialog, /metaKey \|\| event\.ctrlKey/);
  assert.match(searchDialog, /role="dialog"/);
  assert.match(searchDialog, /searchDocs/);
  assert.match(searchDialog, /Search docs/);
  assert.match(searchIndex, /searchDocuments/);
  assert.match(searchIndex, /buildExcerpt/);
  assert.match(globals, /\.docs-search-overlay/);
  assert.match(globals, /\.docs-search-result/);
  assert.match(navigation, /Features/);
  assert.match(navigation, /Architecture/);
  assert.match(page, /## Example/);
  assert.match(page, /## Platforms/);
});

test("docs search index ranks key sections and aliases relevant queries", async () => {
  const moduleUrl = pathToFileURL(
    path.join(docsDir, "src", "lib", "search-index.mjs")
  ).href;
  const { searchDocs, searchDocuments } = await import(moduleUrl);

  assert.ok(Array.isArray(searchDocuments));
  assert.ok(searchDocuments.length >= 5);

  const installResults = searchDocs("install cli");
  assert.equal(installResults[0]?.href, "/");

  const deployResults = searchDocs("deploy vercel");
  assert.equal(deployResults[0]?.href, "/#architecture");

  const jsonResults = searchDocs("json output");
  assert.equal(jsonResults[0]?.href, "/#features");

  const emptyResults = searchDocs("");
  assert.equal(emptyResults.length > 0, true);
  assert.equal(emptyResults[0]?.href, "/");
});
