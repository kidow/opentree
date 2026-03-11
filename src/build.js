const fs = require("node:fs/promises");
const path = require("node:path");
const { CONFIG_FILE_NAME } = require("./init");
const { loadConfig, validateConfig } = require("./config");
const { resolveSandboxedPath } = require("./path-security");

const OUTPUT_DIR_NAME = "dist";
const OUTPUT_FILE_NAME = "index.html";
const FAVICON_FILE_NAME = "favicon.svg";
const OG_IMAGE_FILE_NAME = "opengraph-image.svg";
const ROBOTS_FILE_NAME = "robots.txt";
const SITEMAP_FILE_NAME = "sitemap.xml";

function writeJsonReport(stdout, report) {
  stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

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

function getTemplate(config) {
  return config.template === "terminal" ? "terminal" : "glass";
}

function getAnalyticsMode(config) {
  return config.analytics?.clickTracking === "local" ? "local" : "off";
}

function getSocialCard(config) {
  if (!config.metadata || typeof config.metadata !== "object" || Array.isArray(config.metadata)) {
    return {};
  }

  return config.metadata.socialCard && typeof config.metadata.socialCard === "object"
    ? config.metadata.socialCard
    : {};
}

function getQrCodeUrl(siteUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(siteUrl)}`;
}

function renderLinks(links, analyticsMode) {
  return links
    .map((link, index) => {
      return `
        <li>
          <a
            class="link-card"
            href="${escapeHtml(link.url)}"
            target="_blank"
            rel="noopener noreferrer"
            data-link-id="${index + 1}"
            data-link-title="${escapeHtml(link.title)}"
            ${analyticsMode === "local" ? 'data-track-click="true"' : ""}
          >
            <span class="link-title">${escapeHtml(link.title)}</span>
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

function getProfileMonogram(name) {
  return getOptionalString(name).slice(0, 1).toUpperCase() || "O";
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

function resolvePageMetadata(config) {
  const siteUrl = getOptionalString(config.siteUrl);
  const metadata =
    config.metadata && typeof config.metadata === "object" && !Array.isArray(config.metadata)
      ? config.metadata
      : {};
  const title = getOptionalString(metadata.title) || `${config.profile.name} | opentree`;
  const description = getOptionalString(metadata.description) || config.profile.bio;
  const imageUrl =
    getOptionalString(metadata.ogImageUrl) ||
    getOptionalString(config.profile.avatarUrl) ||
    (siteUrl ? buildSiteAssetUrl(siteUrl, OG_IMAGE_FILE_NAME) : "");

  return {
    description,
    imageUrl,
    siteUrl,
    title,
    twitterCard: imageUrl ? "summary_large_image" : "summary"
  };
}

function renderAnalyticsScript(config) {
  if (getAnalyticsMode(config) !== "local") {
    return "";
  }

  return `
    <script>
      (() => {
        const storageKey = "opentree-click-tracking";
        const links = document.querySelectorAll("[data-track-click='true']");
        links.forEach((link) => {
          link.addEventListener("click", () => {
            const current = JSON.parse(localStorage.getItem(storageKey) || "{}");
            const linkId = link.dataset.linkId;
            current[linkId] = {
              count: (current[linkId]?.count || 0) + 1,
              title: link.dataset.linkTitle || "",
              url: link.href,
              updatedAt: new Date().toISOString()
            };
            localStorage.setItem(storageKey, JSON.stringify(current));
          });
        });
      })();
    </script>
  `;
}

function renderQrCode(config) {
  const socialCard = getSocialCard(config);

  if (!socialCard.showQrCode || !getOptionalString(config.siteUrl)) {
    return "";
  }

  return `
        <aside class="qr-card" aria-label="Quick access QR code">
          <img
            class="qr-image"
            src="${escapeHtml(getQrCodeUrl(config.siteUrl))}"
            alt="${escapeHtml(config.profile.name)} site QR code"
            loading="lazy"
          />
          <p class="qr-copy">Scan to open ${escapeHtml(config.siteUrl)}</p>
        </aside>
  `;
}

function renderMetaTags(config) {
  const metadata = resolvePageMetadata(config);
  const tags = [
    `<title>${escapeHtml(metadata.title)}</title>`,
    `<meta name="description" content="${escapeHtml(metadata.description)}" />`,
    `<meta name="theme-color" content="${escapeHtml(config.theme.accentColor)}" />`,
    `<link rel="icon" href="./${FAVICON_FILE_NAME}" type="image/svg+xml" />`,
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

function renderFaviconSvg(config) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${escapeHtml(config.profile.name)} favicon">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${escapeHtml(config.theme.accentColor)}" />
      <stop offset="100%" stop-color="${escapeHtml(config.theme.textColor)}" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="18" fill="url(#accent)" />
  <circle cx="52" cy="12" r="6" fill="rgba(255,255,255,0.35)" />
  <text x="32" y="39" text-anchor="middle" font-size="28" font-family="Georgia, serif" fill="#ffffff">${escapeHtml(getProfileMonogram(config.profile.name))}</text>
</svg>
`;
}

function renderDefaultOgImageSvg(config) {
  const metadata = resolvePageMetadata(config);
  const socialCard = getSocialCard(config);
  const cardStyle = socialCard.style === "terminal" ? "terminal" : "glass";
  const eyebrow = getOptionalString(socialCard.eyebrow) || "opentree";

  if (cardStyle === "terminal") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-label="${escapeHtml(config.profile.name)} social image">
  <rect width="1200" height="630" fill="#08140f" />
  <rect x="70" y="58" width="1060" height="514" rx="28" fill="#091d16" stroke="${escapeHtml(config.theme.accentColor)}" stroke-width="4" />
  <circle cx="112" cy="100" r="10" fill="#f87171" />
  <circle cx="148" cy="100" r="10" fill="#fbbf24" />
  <circle cx="184" cy="100" r="10" fill="#34d399" />
  <text x="120" y="170" font-size="28" font-family="'SFMono-Regular', 'Menlo', monospace" fill="${escapeHtml(config.theme.accentColor)}">${escapeHtml(eyebrow)}</text>
  <text x="120" y="262" font-size="72" font-family="'SFMono-Regular', 'Menlo', monospace" fill="#f8fafc">${escapeHtml(config.profile.name)}</text>
  <foreignObject x="120" y="292" width="820" height="170">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'SFMono-Regular', 'Menlo', monospace; font-size: 30px; line-height: 1.55; color: #d1fae5;">
      ${escapeHtml(metadata.description)}
    </div>
  </foreignObject>
  <text x="120" y="525" font-size="26" font-family="'SFMono-Regular', 'Menlo', monospace" fill="#86efac">$ open ${escapeHtml(metadata.siteUrl || "opentree")}</text>
</svg>
`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-label="${escapeHtml(config.profile.name)} social image">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${escapeHtml(config.theme.backgroundColor)}" />
      <stop offset="100%" stop-color="${escapeHtml(config.theme.accentColor)}" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <circle cx="1030" cy="120" r="120" fill="rgba(255,255,255,0.16)" />
  <circle cx="180" cy="540" r="180" fill="rgba(255,255,255,0.12)" />
  <rect x="92" y="76" width="1016" height="478" rx="40" fill="rgba(255,255,255,0.84)" stroke="rgba(255,255,255,0.55)" />
  <text x="140" y="150" font-size="28" font-family="'Avenir Next', 'Segoe UI', sans-serif" fill="${escapeHtml(config.theme.textColor)}">${escapeHtml(eyebrow)}</text>
  <text x="140" y="230" font-size="64" font-family="Georgia, serif" fill="${escapeHtml(config.theme.textColor)}">${escapeHtml(config.profile.name)}</text>
  <foreignObject x="140" y="270" width="860" height="170">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Avenir Next', 'Segoe UI', sans-serif; font-size: 34px; line-height: 1.45; color: ${escapeHtml(config.theme.textColor)}; opacity: 0.86;">
      ${escapeHtml(metadata.description)}
    </div>
  </foreignObject>
  <text x="140" y="505" font-size="30" font-family="'Avenir Next', 'Segoe UI', sans-serif" fill="${escapeHtml(config.theme.textColor)}">opentree</text>
</svg>
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

function parseBuildArgs(args) {
  const options = {
    dryRun: false,
    json: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = args[index + 1];

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--output" || arg === "-o") {
      if (nextValue === undefined) {
        throw new Error("missing value for --output");
      }

      if (nextValue.trim().length === 0) {
        throw new Error("--output must be a non-empty path");
      }

      options.outputDir = nextValue;
      index += 1;
      continue;
    }

    throw new Error(`unknown option: ${arg}`);
  }

  return {
    dryRun: options.dryRun,
    json: options.json,
    outputDir: options.outputDir ?? OUTPUT_DIR_NAME
  };
}

function renderHtml(config) {
  const metadata = resolvePageMetadata(config);
  const template = getTemplate(config);
  const analyticsMode = getAnalyticsMode(config);

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

      .skip-link {
        position: absolute;
        left: 16px;
        top: 16px;
        transform: translateY(-160%);
        background: var(--text);
        color: white;
        border-radius: 999px;
        padding: 10px 14px;
        text-decoration: none;
        transition: transform 160ms ease;
      }

      .skip-link:focus {
        transform: translateY(0);
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

      body[data-template="terminal"] {
        font-family: "SFMono-Regular", "Menlo", monospace;
      }

      body[data-template="terminal"] .profile-card {
        --surface: rgba(5, 18, 13, 0.94);
        --surface-border: rgba(74, 222, 128, 0.48);
        --shadow: rgba(2, 6, 23, 0.45);
        color: #ecfdf5;
        border-radius: 24px;
        backdrop-filter: none;
      }

      body[data-template="terminal"] p,
      body[data-template="terminal"] .footer {
        color: #bbf7d0;
      }

      body[data-template="terminal"] .link-card {
        background: rgba(6, 24, 18, 0.96);
        color: #f0fdf4;
        border-color: rgba(74, 222, 128, 0.32);
        box-shadow: 0 18px 32px rgba(2, 6, 23, 0.22);
      }

      body[data-template="terminal"] .link-card:hover {
        border-color: rgba(74, 222, 128, 0.7);
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
        line-height: 1;
        letter-spacing: -0.05em;
        overflow-wrap: anywhere;
      }

      p {
        margin: 0 auto;
        max-width: 32ch;
        font-size: 1rem;
        line-height: 1.6;
        color: color-mix(in srgb, var(--text) 74%, black);
        overflow-wrap: anywhere;
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

      .link-title {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .link-card:hover {
        transform: translateY(-2px);
        border-color: color-mix(in srgb, var(--accent) 35%, white);
        box-shadow: 0 18px 32px rgba(5, 46, 22, 0.12);
      }

      .link-card:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--accent) 60%, white);
        outline-offset: 4px;
      }

      .footer {
        margin-top: 18px;
        text-align: center;
        font-size: 0.85rem;
        color: color-mix(in srgb, var(--text) 54%, white);
      }

      .qr-card {
        margin-top: 18px;
        display: grid;
        justify-items: center;
        gap: 10px;
      }

      .qr-image {
        width: 112px;
        height: 112px;
        border-radius: 18px;
        background: white;
        padding: 8px;
        border: 1px solid rgba(5, 46, 22, 0.12);
      }

      .qr-copy {
        margin: 0;
        max-width: 30ch;
        text-align: center;
        font-size: 0.9rem;
      }

      @media (max-width: 640px) {
        body {
          padding: 20px 12px;
        }

        .profile-card {
          border-radius: 24px;
          padding: 22px 18px;
        }

        .avatar {
          width: 84px;
          height: 84px;
        }

        .link-card {
          padding: 16px 16px;
          gap: 12px;
        }
      }
    </style>
  </head>
  <body data-template="${escapeHtml(template)}" data-analytics="${escapeHtml(analyticsMode)}">
    <a class="skip-link" href="#content">Skip to content</a>
    <main class="shell" id="content">
      <section class="profile-card" aria-labelledby="profile-title">
        <header class="hero">
          ${renderAvatar(config.profile)}
          <h1 id="profile-title">${escapeHtml(config.profile.name)}</h1>
          <p>${escapeHtml(config.profile.bio)}</p>
        </header>
        <nav aria-label="Profile links">
          <ul>
            ${renderLinks(config.links, analyticsMode)}
          </ul>
        </nav>
        ${renderQrCode(config)}
        <footer class="footer">Built with opentree</footer>
      </section>
    </main>
    ${renderAnalyticsScript(config)}
  </body>
</html>
`;
}

async function runBuild(io, args = []) {
  const cwd = io.cwd ?? process.cwd();
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const requestedJson = args.includes("--json");
  let options;
  let report = {
    command: "build",
    configPath: path.join(cwd, CONFIG_FILE_NAME),
    cwd,
    dryRun: false,
    files: {
      favicon: null,
      indexHtml: null,
      ogImage: null,
      robots: null,
      sitemap: null
    },
    issues: [],
    message: "",
    metadata: null,
    ok: false,
    outputDir: path.resolve(cwd, OUTPUT_DIR_NAME),
    result: null,
    stage: "args"
  };

  try {
    options = parseBuildArgs(args);
  } catch (error) {
    report.issues = [error.message];
    report.message = error.message;
    stderr.write(`[opentree] ${error.message}\n`);
    if (requestedJson) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }

  try {
    report.outputDir = resolveSandboxedPath(cwd, options.outputDir, "--output");
  } catch (error) {
    report.issues = [error.message];
    report.message = error.message;
    stderr.write(`[opentree] ${error.message}\n`);
    if (requestedJson) {
      writeJsonReport(stdout, report);
    }
    return 1;
  }
  report.dryRun = options.dryRun;
  const buildStdout = options.json ? stderr : stdout;
  const outputDir = report.outputDir;
  const faviconPath = path.join(outputDir, FAVICON_FILE_NAME);
  const outputPath = path.join(outputDir, OUTPUT_FILE_NAME);
  const ogImagePath = path.join(outputDir, OG_IMAGE_FILE_NAME);
  const robotsPath = path.join(outputDir, ROBOTS_FILE_NAME);
  const sitemapPath = path.join(outputDir, SITEMAP_FILE_NAME);

  buildStdout.write(`[opentree] building from ${CONFIG_FILE_NAME}\n`);

  let loadedConfig;
  try {
    loadedConfig = await loadConfig(cwd);
  } catch (error) {
    report.stage = "load";

    if (error && error.code === "ENOENT") {
      report.message = `${CONFIG_FILE_NAME} was not found in ${cwd}`;
      report.issues = [report.message];
      stderr.write(`[opentree] ${CONFIG_FILE_NAME} was not found in ${cwd}\n`);
      stderr.write("[opentree] run `opentree init` first to create a starter config\n");
      if (options.json) {
        writeJsonReport(stdout, report);
      }
      return 1;
    }

    if (error instanceof SyntaxError) {
      report.message = `${CONFIG_FILE_NAME} is not valid JSON`;
      report.issues = [error.message];
      stderr.write(`[opentree] ${CONFIG_FILE_NAME} is not valid JSON\n`);
      stderr.write(`[opentree] ${error.message}\n`);
      if (options.json) {
        writeJsonReport(stdout, {
          ...report,
          details: [error.message]
        });
      }
      return 1;
    }

    throw error;
  }

  const errors = validateConfig(loadedConfig.config);
  if (errors.length > 0) {
    report.stage = "validate";
    report.message = "build aborted because the config is invalid";
    report.issues = errors;
    stderr.write("[opentree] build aborted because the config is invalid\n");
    errors.forEach((error) => {
      stderr.write(`- ${error}\n`);
    });
    if (options.json) {
      writeJsonReport(stdout, {
        ...report,
        details: errors
      });
    }
    return 1;
  }

  report.stage = "write";
  const metadata = resolvePageMetadata(loadedConfig.config);
  report.metadata = metadata;

  if (options.dryRun) {
    report.ok = true;
    report.stage = "dry-run";
    report.files = {
      favicon: faviconPath,
      indexHtml: outputPath,
      ogImage: ogImagePath,
      robots: metadata.siteUrl ? robotsPath : null,
      sitemap: metadata.siteUrl ? sitemapPath : null
    };
    report.message = `dry run: would build ${path.relative(cwd, outputPath)}`;
    report.result = {
      dryRun: true,
      files: report.files,
      metadata: report.metadata,
      outputDir: report.outputDir
    };
    if (options.json) {
      writeJsonReport(stdout, report);
      return 0;
    }

    stdout.write(`[opentree] dry run: would build ${path.relative(cwd, outputPath)}\n`);
    return 0;
  }

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(faviconPath, renderFaviconSvg(loadedConfig.config), "utf8");
  await fs.writeFile(outputPath, renderHtml(loadedConfig.config), "utf8");
  await fs.writeFile(ogImagePath, renderDefaultOgImageSvg(loadedConfig.config), "utf8");
  report.files.favicon = faviconPath;
  report.files.indexHtml = outputPath;
  report.files.ogImage = ogImagePath;

  buildStdout.write(`[opentree] wrote ${path.relative(cwd, faviconPath)}\n`);
  buildStdout.write(`[opentree] wrote ${path.relative(cwd, outputPath)}\n`);
  buildStdout.write(`[opentree] wrote ${path.relative(cwd, ogImagePath)}\n`);

  if (metadata.siteUrl) {
    await fs.writeFile(sitemapPath, renderSitemapXml(metadata.siteUrl), "utf8");
    await fs.writeFile(robotsPath, renderRobotsTxt(metadata.siteUrl), "utf8");
    report.files.sitemap = sitemapPath;
    report.files.robots = robotsPath;

    buildStdout.write(`[opentree] wrote ${path.relative(cwd, sitemapPath)}\n`);
    buildStdout.write(`[opentree] wrote ${path.relative(cwd, robotsPath)}\n`);
  } else {
    await removeOptionalFile(sitemapPath);
    await removeOptionalFile(robotsPath);
  }

  report.ok = true;
  report.message = `build completed: ${path.relative(cwd, outputPath)}`;
  report.result = {
    files: report.files,
    metadata: report.metadata,
    outputDir: report.outputDir
  };
  if (options.json) {
    writeJsonReport(stdout, report);
  }

  return 0;
}

module.exports = {
  OUTPUT_DIR_NAME,
  OUTPUT_FILE_NAME,
  FAVICON_FILE_NAME,
  OG_IMAGE_FILE_NAME,
  ROBOTS_FILE_NAME,
  SITEMAP_FILE_NAME,
  parseBuildArgs,
  renderHtml,
  renderRobotsTxt,
  renderSitemapXml,
  runBuild
};
