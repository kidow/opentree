export interface Profile {
  name: string;
  bio?: string;
  avatarUrl?: string;
}

export interface Theme {
  accentColor: string;
  backgroundColor: string;
  textColor: string;
}

export type Block =
  | { id: string; type: "profile"; enabled: boolean }
  | { id: string; type: "link"; enabled: boolean; title: string; url: string }
  | { id: string; type: "heading"; enabled: boolean; text: string }
  | { id: string; type: "text"; enabled: boolean; content: string };

export interface Config {
  schemaVersion: number;
  profile: Profile;
  blocks: Block[];
  theme: Theme;
  siteUrl?: string;
  domain?: string;
  connections: string[];
}
