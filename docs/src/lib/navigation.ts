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
    items: [{ title: "Introduction", href: "/" }],
  },
];
