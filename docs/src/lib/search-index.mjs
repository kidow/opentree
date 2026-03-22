const searchDocuments = [
  {
    title: "Introduction",
    href: "/",
    section: "Docs Index",
    body:
      "CLI-first link-in-bio static site generator. Build your profile page from the terminal, deploy anywhere. Install with npm install -g opentree-cli.",
    keywords: ["install", "cli", "getting started", "opentree-cli", "profile"],
  },
  {
    title: "Features",
    href: "/#features",
    section: "Docs Index",
    body:
      "CLI-first workflows, zero dependencies, static output, JSON output, dry-run support, and built-in templates like glass and terminal.",
    keywords: ["json", "dry-run", "templates", "glass", "terminal", "static output"],
  },
  {
    title: "Works with",
    href: "/#works-with",
    section: "Docs Index",
    body:
      "Works with Claude Code, Cursor, GitHub Copilot, and any agent that can run shell commands.",
    keywords: ["agents", "claude", "cursor", "copilot", "ai"],
  },
  {
    title: "Example",
    href: "/#example",
    section: "Docs Index",
    body:
      "Example commands for init, link add, link preset, build, and dev workflows from the command line.",
    keywords: ["commands", "init", "link add", "build", "dev", "quick start"],
  },
  {
    title: "Architecture",
    href: "/#architecture",
    section: "Reference",
    body:
      "The config lives in opentree.config.json, build generates static HTML, and deploy pushes the site to Vercel with opentree deploy --prod.",
    keywords: ["config", "deploy", "vercel", "build", "static html"],
  },
  {
    title: "Platforms",
    href: "/#platforms",
    section: "Reference",
    body:
      "Native Node.js binaries for macOS, Linux, and Windows.",
    keywords: ["macos", "linux", "windows", "node"],
  },
];

function normalize(value) {
  return String(value).toLowerCase().replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(query) {
  return normalize(query).split(" ").filter(Boolean);
}

function buildExcerpt(document, tokens) {
  const text = document.body.trim();

  if (tokens.length === 0) {
    return text;
  }

  const lower = text.toLowerCase();
  const matchIndex = tokens.reduce((bestIndex, token) => {
    const tokenIndex = lower.indexOf(token);
    if (tokenIndex === -1) {
      return bestIndex;
    }

    return bestIndex === -1 ? tokenIndex : Math.min(bestIndex, tokenIndex);
  }, -1);

  if (matchIndex === -1 || text.length <= 120) {
    return text;
  }

  const start = Math.max(0, matchIndex - 32);
  const end = Math.min(text.length, start + 120);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";

  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function scoreDocument(document, tokens) {
  if (tokens.length === 0) {
    return 1;
  }

  const title = normalize(document.title);
  const section = normalize(document.section);
  const body = normalize(document.body);
  const keywords = (document.keywords ?? []).map(normalize);

  let score = 0;

  for (const token of tokens) {
    if (title === token) {
      score += 140;
    } else if (title.startsWith(token)) {
      score += 90;
    } else if (title.includes(token)) {
      score += 70;
    }

    if (section.includes(token)) {
      score += 28;
    }

    if (body.includes(token)) {
      score += 16;
    }

    if (keywords.some((keyword) => keyword.includes(token))) {
      score += 32;
    }
  }

  if (tokens.every((token) => `${title} ${section} ${body}`.includes(token))) {
    score += 24;
  }

  return score;
}

function searchDocs(query, options = {}) {
  const tokens = tokenize(query);
  const limit = options.limit ?? 8;

  return searchDocuments
    .map((document, index) => ({
      ...document,
      excerpt: buildExcerpt(document, tokens),
      score: scoreDocument(document, tokens),
      index,
    }))
    .filter((document) => document.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.index - right.index;
    })
    .slice(0, limit);
}

export { buildExcerpt, searchDocs, searchDocuments };
