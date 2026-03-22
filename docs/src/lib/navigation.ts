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
      { title: "Features", href: "/#features" },
      { title: "Works with", href: "/#works-with" },
      { title: "Example", href: "/#example" },
    ],
  },
  {
    title: "Reference",
    items: [
      { title: "Architecture", href: "/#architecture" },
      { title: "Platforms", href: "/#platforms" },
    ],
  },
];
