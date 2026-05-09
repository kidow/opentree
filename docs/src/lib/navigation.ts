export interface NavItem {
  title: string;
  href: string;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    items: [
      { title: "Introduction", href: "/" },
      { title: "Download", href: "/download" },
      { title: "Getting Started", href: "/getting-started" },
    ],
  },
  {
    title: "Reference",
    items: [
      { title: "Changelog", href: "/changelog" },
    ],
  },
];
