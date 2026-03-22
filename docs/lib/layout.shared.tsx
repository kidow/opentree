type SiteLink = {
  external?: boolean;
  href: string;
  label: string;
};

export const docsSite = {
  title: "opentree docs",
  eyebrow: "Custom docs shell",
  description:
    "A lighter documentation surface for the opentree CLI, designed directly with Next.js App Router and Tailwind CSS.",
  repositoryUrl: "https://github.com/kidow/opentree"
};

export const siteLinks: SiteLink[] = [
  {
    label: "Home",
    href: "/"
  },
  {
    label: "Docs index",
    href: "/docs"
  },
  {
    label: "Quick start",
    href: "/docs/getting-started/quick-start"
  },
  {
    label: "GitHub",
    href: docsSite.repositoryUrl,
    external: true
  }
];

export const shellHighlights = [
  {
    title: "Lighter navigation",
    description:
      "The shell keeps the repo-driven MDX content, then replaces framework chrome with a focused sidebar and article frame."
  },
  {
    title: "Operator pacing",
    description:
      "Landing, section map, and page rails all follow the install -> edit -> build -> deploy workflow instead of theme defaults."
  },
  {
    title: "Direct styling surface",
    description:
      "Typography, spacing, cards, and code blocks are now controlled from the app itself with Tailwind utilities and a thin CSS layer."
  }
] as const;

export const workflowSteps = [
  {
    step: "01",
    title: "Install",
    description: "Start with environment checks and the fastest route to a working CLI."
  },
  {
    step: "02",
    title: "Shape config",
    description: "Edit profile, theme, metadata, and links without reverse-engineering the schema."
  },
  {
    step: "03",
    title: "Preview output",
    description: "Inspect generated HTML, social images, and deterministic site artifacts before shipping."
  },
  {
    step: "04",
    title: "Ship",
    description: "Move into deploy, doctor, and release workflows once the local surface is stable."
  }
] as const;
