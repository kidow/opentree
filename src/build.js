const fs = require("node:fs/promises");
const path = require("node:path");
const { CONFIG_FILE_NAME } = require("./init");
const { loadConfig, validateConfig } = require("./config");

const OUTPUT_DIR_NAME = "dist";
const OUTPUT_FILE_NAME = "index.html";
const ROBOTS_FILE_NAME = "robots.txt";
const SITEMAP_FILE_NAME = "sitemap.xml";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function renderAvatar(profile) {
  if (!profile.avatarUrl) {
    return `
      <div class="avatar avatar-placeholder" aria-hidden="true">
        <span>${escapeHtml(profile.name.slice(0, 1).toUpperCase())}</span>
      </div>
    `;
  }

  return `
    <img
      class="avatar"
      src="${escapeHtml(profile.avatarUrl)}"
      alt="${escapeHtml(profile.name)} avatar"
    />
  `;
}

function renderLinks(links) {
  return links
    .map((link) => {
      return `
        <li>
          <a class="link-card" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">
            <span>${escapeHtml(link.title)}</span>
            <span aria-hidden="true">↗</span>
          </a>
        </li>
      `;
    })
    .join("");
}

function getOptionalString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function resolvePageMetadata(config) {
  const siteUrl = getOptionalString(config.siteUrl);
  const metadata =
    config.metadata && typeof config.metadata === "object" && !Array.isArray(config.metadata)
      ? config.metadata
      : {};
  const title = getOptionalString(metadata.title) || `${config.profile.name} | opentree`;
  const description = getOptionalString(metadata.description) || config.profile.bio;
  const imageUrl = getOptionalString(metadata.ogImageUrl) || getOptionalString(config.profile.avatarUrl);

  return {
    description,
    imageUrl,
    siteUrl,
    title,
    twitterCard: imageUrl ? "summary_large_image" : "summary"
  };
}

function renderMetaTags(config) {
  const metadata = resolvePageMetadata(config);
  const tags = [
    `<title>${escapeHtml(metadata.title)}</title>`,
    `<meta name="description" content="${escapeHtml(metadata.description)}" />`,
    `<meta name="theme-color" content="${escapeHtml(config.theme.accentColor)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeHtml(config.profile.name)}" />`,
    `<meta property="og:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}" />`,
    `<meta name="twitter:card" content="${escapeHtml(metadata.twitterCard)}" />`,
    `<meta name="twitter:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(metadata.description)}" />`
  ];

  if (metadata.siteUrl) {
    tags.push(`<link rel="canonical" href="${escapeHtml(metadata.siteUrl)}" />`);
    tags.push(`<meta property="og:url" content="${escapeHtml(metadata.siteUrl)}" />`);
  }

  if (metadata.imageUrl) {
    tags.push(`<meta property="og:image" content="${escapeHtml(metadata.imageUrl)}" />`);
    tags.push(
      `<meta property="og:image:alt" content="${escapeHtml(config.profile.name)} profile image" />`
    );
    tags.push(`<meta name="twitter:image" content="${escapeHtml(metadata.imageUrl)}" />`);
  }

  return tags.join("\n    ");
}

function buildSiteAssetUrl(siteUrl, fileName) {
  const baseUrl = new URL(siteUrl);
  baseUrl.search = "";
  baseUrl.hash = "";

  if (!baseUrl.pathname.endsWith("/")) {
    baseUrl.pathname = `${baseUrl.pathname}/`;
  }

  return new URL(fileName, baseUrl).href;
}

function renderSitemapXml(siteUrl) {
  const pageUrl = new URL(siteUrl);
  pageUrl.hash = "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(pageUrl.href)}</loc>
  </url>
</urlset>
`;
}

function renderRobotsTxt(siteUrl) {
  return `User-agent: *
Allow: /
Sitemap: ${buildSiteAssetUrl(siteUrl, SITEMAP_FILE_NAME)}
`;
}

async function removeOptionalFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

function renderHtml(config) {
  const metadata = resolvePageMetadata(config);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${renderMetaTags(config)}
    <style>
      :root {
        --accent: ${config.theme.accentColor};
        --background: ${config.theme.backgroundColor};
        --text: ${config.theme.textColor};
        --surface: rgba(255, 255, 255, 0.84);
        --surface-border: rgba(255, 255, 255, 0.65);
        --shadow: rgba(5, 46, 22, 0.14);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Avenir Next", "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top, color-mix(in srgb, var(--accent) 22%, transparent), transparent 32rem),
          linear-gradient(180deg, color-mix(in srgb, var(--background) 76%, white) 0%, var(--background) 100%);
        display: grid;
        place-items: center;
        padding: 32px 16px;
      }

      .shell {
        width: min(100%, 520px);
      }

      .profile-card {
        background: var(--surface);
        border: 1px solid var(--surface-border);
        backdrop-filter: blur(24px);
        border-radius: 28px;
        box-shadow: 0 28px 60px var(--shadow);
        padding: 28px;
      }

      .hero {
        text-align: center;
        margin-bottom: 24px;
      }

      .avatar {
        width: 92px;
        height: 92px;
        border-radius: 999px;
        object-fit: cover;
        display: inline-grid;
        place-items: center;
        border: 4px solid rgba(255, 255, 255, 0.72);
        box-shadow: 0 14px 30px rgba(0, 0, 0, 0.12);
      }

      .avatar-placeholder {
        background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 32%, white));
        color: white;
        font-size: 2rem;
        font-weight: 700;
      }

      h1 {
        margin: 18px 0 10px;
        font-size: clamp(2rem, 6vw, 2.8rem);
        line-height: 0.95;
        letter-spacing: -0.05em;
      }

      p {
        margin: 0 auto;
        max-width: 32ch;
        font-size: 1rem;
        line-height: 1.6;
        color: color-mix(in srgb, var(--text) 74%, black);
      }

      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 14px;
      }

      .link-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        width: 100%;
        padding: 18px 20px;
        border-radius: 18px;
        text-decoration: none;
        color: var(--text);
        background: white;
        border: 1px solid rgba(5, 46, 22, 0.08);
        box-shadow: 0 12px 24px rgba(5, 46, 22, 0.08);
        transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
      }

      .link-card:hover {
        transform: translateY(-2px);
        border-color: color-mix(in srgb, var(--accent) 35%, white);
        box-shadow: 0 18px 32px rgba(5, 46, 22, 0.12);
      }

      .footer {
        margin-top: 18px;
        text-align: center;
        font-size: 0.85rem;
        color: color-mix(in srgb, var(--text) 54%, white);
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="profile-card">
        <header class="hero">
          ${renderAvatar(config.profile)}
          <h1>${escapeHtml(config.profile.name)}</h1>
          <p>${escapeHtml(config.profile.bio)}</p>
        </header>
        <ul>
          ${renderLinks(config.links)}
        </ul>
        <div class="footer">Built with opentree</div>
      </section>
    </main>
  </body>
</html>
`;
}

async function runBuild(io) {
  const cwd = io.cwd ?? process.cwd();
  const outputDir = path.join(cwd, OUTPUT_DIR_NAME);
  const outputPath = path.join(outputDir, OUTPUT_FILE_NAME);
  const robotsPath = path.join(outputDir, ROBOTS_FILE_NAME);
  const sitemapPath = path.join(outputDir, SITEMAP_FILE_NAME);

  io.stdout.write(`[opentree] building from ${CONFIG_FILE_NAME}\n`);

  let loadedConfig;
  try {
    loadedConfig = await loadConfig(cwd);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      io.stderr.write(`[opentree] ${CONFIG_FILE_NAME} was not found in ${cwd}\n`);
      io.stderr.write("[opentree] run `opentree init` first to create a starter config\n");
      return 1;
    }

    if (error instanceof SyntaxError) {
      io.stderr.write(`[opentree] ${CONFIG_FILE_NAME} is not valid JSON\n`);
      io.stderr.write(`[opentree] ${error.message}\n`);
      return 1;
    }

    throw error;
  }

  const errors = validateConfig(loadedConfig.config);
  if (errors.length > 0) {
    io.stderr.write("[opentree] build aborted because the config is invalid\n");
    errors.forEach((error) => {
      io.stderr.write(`- ${error}\n`);
    });
    return 1;
  }

  const metadata = resolvePageMetadata(loadedConfig.config);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, renderHtml(loadedConfig.config), "utf8");

  io.stdout.write(`[opentree] wrote ${path.relative(cwd, outputPath)}\n`);

  if (metadata.siteUrl) {
    await fs.writeFile(sitemapPath, renderSitemapXml(metadata.siteUrl), "utf8");
    await fs.writeFile(robotsPath, renderRobotsTxt(metadata.siteUrl), "utf8");

    io.stdout.write(`[opentree] wrote ${path.relative(cwd, sitemapPath)}\n`);
    io.stdout.write(`[opentree] wrote ${path.relative(cwd, robotsPath)}\n`);
  } else {
    await removeOptionalFile(sitemapPath);
    await removeOptionalFile(robotsPath);
  }

  return 0;
}

module.exports = {
  OUTPUT_DIR_NAME,
  OUTPUT_FILE_NAME,
  ROBOTS_FILE_NAME,
  SITEMAP_FILE_NAME,
  renderHtml,
  renderRobotsTxt,
  renderSitemapXml,
  runBuild
};
