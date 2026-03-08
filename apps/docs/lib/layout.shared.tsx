import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    githubUrl: "https://github.com/kidow/opentree",
    nav: {
      title: "opentree docs"
    },
    links: [
      {
        text: "Docs",
        url: "/docs",
        active: "nested-url"
      },
      {
        text: "GitHub",
        url: "https://github.com/kidow/opentree",
        external: true
      }
    ]
  };
}
