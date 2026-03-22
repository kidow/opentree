const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

const rootDir = path.join(__dirname, "..");
const docsAppDir = path.join(rootDir, "docs");

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

test("docs app includes a custom Next.js + Tailwind docs shell", async () => {
  const docsPackageJson = await readJson(path.join(docsAppDir, "package.json"));
  const appLayout = await readText(path.join(docsAppDir, "app", "layout.tsx"));
  const appStyles = await readText(path.join(docsAppDir, "app", "app.css"));
  const docsLayout = await readText(path.join(docsAppDir, "app", "docs", "layout.tsx"));
  const docsPage = await readText(
    path.join(docsAppDir, "app", "docs", "[[...slug]]", "page.tsx")
  );
  const docsHelpers = await readText(path.join(docsAppDir, "lib", "docs.ts"));
  const layoutShared = await readText(path.join(docsAppDir, "lib", "layout.shared.tsx"));
  const siteHeader = await readText(
    path.join(docsAppDir, "components", "docs", "site-header.tsx")
  );
  const docsSidebar = await readText(
    path.join(docsAppDir, "components", "docs", "sidebar.tsx")
  );
  const tableOfContents = await readText(
    path.join(docsAppDir, "components", "docs", "table-of-contents.tsx")
  );
  const mdxComponents = await readText(path.join(docsAppDir, "mdx-components.tsx"));
  const nextConfig = await readText(path.join(docsAppDir, "next.config.mjs"));
  const searchRoute = await readText(
    path.join(docsAppDir, "app", "api", "search", "route.ts")
  );

  assert.equal(docsPackageJson.private, true);
  assert.equal(docsPackageJson.scripts.dev, "next dev");
  assert.equal(docsPackageJson.scripts.build, "next build");
  assert.equal(docsPackageJson.scripts.test, "node --test");
  assert.equal("postinstall" in docsPackageJson.scripts, false);
  assert.match(docsPackageJson.dependencies.next, /15\./);
  assert.deepEqual(Object.keys(docsPackageJson.dependencies).sort(), [
    "@mdx-js/mdx",
    "next",
    "react",
    "react-dom",
    "remark-gfm"
  ]);
  assert.doesNotMatch(appLayout, /RootProvider/);
  assert.doesNotMatch(appStyles, /@import .*preset/i);
  assert.match(appLayout, /SiteHeader/);
  assert.match(appLayout, /SiteFooter/);
  assert.doesNotMatch(docsLayout, /DocsLayout/);
  assert.doesNotMatch(docsPage, /source\.getPage/);
  assert.match(docsPage, /getCompiledDocPage/);
  assert.match(docsPage, /DocsSidebar/);
  assert.match(docsPage, /TableOfContents/);
  assert.match(docsPage, /useMDXComponents/);
  assert.match(docsPage, /generateStaticParams/);
  assert.match(docsHelpers, /meta\.json/);
  assert.match(docsHelpers, /content[\\/]+docs/);
  assert.match(docsHelpers, /@mdx-js\/mdx/);
  assert.match(nextConfig, /reactStrictMode/);
  assert.doesNotMatch(nextConfig, /createMDX/);
  assert.match(searchRoute, /NextResponse/);
  assert.match(siteHeader, /siteLinks/);
  assert.match(layoutShared, /GitHub/);
  assert.match(layoutShared, /Docs index/i);
  assert.match(docsSidebar, /currentPath/);
  assert.match(tableOfContents, /items/);
  assert.match(mdxComponents, /slugifyHeading/);
  await assert.rejects(fs.access(path.join(docsAppDir, "source.config.ts")));
  await assert.rejects(fs.access(path.join(docsAppDir, "lib", "source.ts")));
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

  assert.match(homePage, /control panel, not a theme preset/i);
  assert.match(homePage, /Install CLI/);
  assert.match(homePage, /Section map/i);
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
