import { evaluate } from "@mdx-js/mdx";
import fs from "node:fs/promises";
import path from "node:path";
import { cache, type ComponentType } from "react";
import * as runtime from "react/jsx-runtime";
import type { MDXComponents } from "mdx/types";
import remarkGfm from "remark-gfm";

export type DocEntry = {
  description: string;
  href: string;
  pageSlug: string | null;
  sectionSlug: string;
  sectionTitle: string;
  slug: string[];
  title: string;
};

export type DocSection = {
  href: string;
  pages: DocEntry[];
  slug: string;
  title: string;
};

type Frontmatter = {
  description?: string;
  title?: string;
};

type SectionMeta = {
  pages: string[];
  title: string;
};

type DocsNavigation = {
  flat: DocEntry[];
  overview: DocEntry;
  sections: DocSection[];
};

export type DocTocItem = {
  depth: number;
  title: string;
  url: string;
};

export type CompiledDocPage = {
  description: string;
  slug: string[];
  title: string;
  toc: DocTocItem[];
  Content: ComponentType<{ components?: MDXComponents }>;
};

const sectionOrder = ["getting-started", "guides", "reference", "operations", "examples"];

function createHref(slug: string[]) {
  return slug.length === 0 ? "/docs" : `/docs/${slug.join("/")}`;
}

function humanize(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[`*_~]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/&[a-z]+;/gi, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseFrontmatter(source: string): Frontmatter {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!match) {
    return {};
  }

  const frontmatter = match[1]
    .split(/\r?\n/)
    .reduce<Record<string, string>>((accumulator, line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      accumulator[key] = rawValue.replace(/^["']|["']$/g, "");
      return accumulator;
    }, {});

  return {
    title: frontmatter.title,
    description: frontmatter.description
  };
}

const resolveDocsRoot = cache(async () => {
  const candidates = [
    path.join(process.cwd(), "content", "docs"),
    path.join(process.cwd(), "apps", "docs", "content", "docs")
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error("Unable to locate the content/docs directory for the docs app.");
});

async function readSectionMeta(root: string, sectionSlug: string) {
  const metaPath = path.join(root, sectionSlug, "meta.json");
  const metaSource = await fs.readFile(metaPath, "utf8");
  return JSON.parse(metaSource) as SectionMeta;
}

async function buildSection(root: string, sectionSlug: string) {
  const meta = await readSectionMeta(root, sectionSlug);
  const pages = await Promise.all(
    meta.pages.map(async (pageSlug) => {
      const filePath = path.join(root, sectionSlug, `${pageSlug}.mdx`);
      const fileSource = await fs.readFile(filePath, "utf8");
      const frontmatter = parseFrontmatter(fileSource);

      return {
        description: frontmatter.description ?? "",
        href: createHref([sectionSlug, pageSlug]),
        pageSlug,
        sectionSlug,
        sectionTitle: meta.title,
        slug: [sectionSlug, pageSlug],
        title: frontmatter.title ?? humanize(pageSlug)
      } satisfies DocEntry;
    })
  );

  return {
    href: pages[0]?.href ?? createHref([sectionSlug]),
    pages,
    slug: sectionSlug,
    title: meta.title
  } satisfies DocSection;
}

function stripFrontmatter(source: string) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function extractToc(source: string) {
  const items: DocTocItem[] = [];
  let insideCodeFence = false;

  for (const line of source.split(/\r?\n/)) {
    if (line.trim().startsWith("```")) {
      insideCodeFence = !insideCodeFence;
      continue;
    }

    if (insideCodeFence) {
      continue;
    }

    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);

    if (!match) {
      continue;
    }

    const title = match[2]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[`*_~]/g, "")
      .trim();
    const slug = slugifyHeading(title);

    if (!slug) {
      continue;
    }

    items.push({
      depth: match[1].length,
      title,
      url: `#${slug}`
    });
  }

  return items;
}

async function readDocSource(slug: string[]) {
  const root = await resolveDocsRoot();

  if (slug.length === 0) {
    return {
      slug,
      source: await fs.readFile(path.join(root, "index.mdx"), "utf8")
    };
  }

  if (slug.length !== 2) {
    return null;
  }

  try {
    return {
      slug,
      source: await fs.readFile(path.join(root, slug[0], `${slug[1]}.mdx`), "utf8")
    };
  } catch {
    return null;
  }
}

export const getDocsNavigation = cache(async (): Promise<DocsNavigation> => {
  const root = await resolveDocsRoot();
  const rootEntries = await fs.readdir(root, { withFileTypes: true });
  const indexSource = await fs.readFile(path.join(root, "index.mdx"), "utf8");
  const indexFrontmatter = parseFrontmatter(indexSource);

  const sections = (
    await Promise.all(
      rootEntries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          try {
            await fs.access(path.join(root, entry.name, "meta.json"));
            return await buildSection(root, entry.name);
          } catch {
            return null;
          }
        })
    )
  )
    .filter((section) => section !== null)
    .sort((left, right) => {
      const leftOrder = sectionOrder.indexOf(left.slug);
      const rightOrder = sectionOrder.indexOf(right.slug);
      const normalizedLeft = leftOrder === -1 ? Number.MAX_SAFE_INTEGER : leftOrder;
      const normalizedRight = rightOrder === -1 ? Number.MAX_SAFE_INTEGER : rightOrder;
      return normalizedLeft - normalizedRight || left.title.localeCompare(right.title);
    }) as DocSection[];

  const overview = {
    description:
      indexFrontmatter.description ??
      "Start with the docs overview when you want the shortest route through the CLI workflow.",
    href: "/docs",
    pageSlug: null,
    sectionSlug: "overview",
    sectionTitle: "Overview",
    slug: [],
    title: indexFrontmatter.title ?? "Docs Home"
  } satisfies DocEntry;

  return {
    flat: [overview, ...sections.flatMap((section) => section.pages)],
    overview,
    sections
  };
});

export async function getDocsPageContext(slug: string[] = []) {
  const navigation = await getDocsNavigation();
  const href = createHref(slug);
  const currentIndex = navigation.flat.findIndex((entry) => entry.href === href);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  return {
    current: navigation.flat[safeIndex],
    next:
      safeIndex < navigation.flat.length - 1 ? navigation.flat[safeIndex + 1] : null,
    previous: safeIndex > 0 ? navigation.flat[safeIndex - 1] : null
  };
}

const getCompiledDocPageCached = cache(async (slugPath: string): Promise<CompiledDocPage | null> => {
  const slug = slugPath ? slugPath.split("/") : [];
  const document = await readDocSource(slug);

  if (!document) {
    return null;
  }

  const frontmatter = parseFrontmatter(document.source);
  const contentSource = stripFrontmatter(document.source);
  const toc = extractToc(contentSource);
  const evaluated = await evaluate(contentSource, {
    ...runtime,
    remarkPlugins: [remarkGfm]
  });

  return {
    description: frontmatter.description ?? "",
    slug,
    title:
      frontmatter.title ??
      (slug.length === 0 ? "Docs Home" : humanize(slug[slug.length - 1] ?? "Docs Home")),
    toc,
    Content: evaluated.default
  };
});

export async function getCompiledDocPage(slug: string[] = []) {
  return getCompiledDocPageCached(slug.join("/"));
}

export async function getDocsStaticParams() {
  const navigation = await getDocsNavigation();
  return navigation.flat.map((entry) => ({
    slug: entry.slug
  }));
}
