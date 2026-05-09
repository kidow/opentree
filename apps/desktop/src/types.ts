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

export interface OembedCache {
  html?: string;
  thumbnailUrl?: string;
  title?: string;
  authorName?: string;
  providerName?: string;
}

export interface FormField {
  name: string;
  label: string;
  fieldType: "text" | "email" | "textarea";
  required: boolean;
}

export type CommerceProvider = "stripe" | "gumroad" | "lemonsqueezy" | "polar";
export type SupportProvider = "stripe" | "kofi" | "bmc" | "paypal" | "patreon";

export type Block =
  | { id: string; type: "profile"; enabled: boolean }
  | { id: string; type: "link"; enabled: boolean; title: string; url: string }
  | { id: string; type: "heading"; enabled: boolean; text: string }
  | { id: string; type: "text"; enabled: boolean; content: string }
  | { id: string; type: "socials"; enabled: boolean; items: { platform: string; url: string }[] }
  | { id: string; type: "image"; enabled: boolean; assetPath: string; alt: string; url?: string }
  | { id: string; type: "footer"; enabled: boolean; text: string; links: { label: string; url: string }[] }
  | { id: string; type: "affiliate"; enabled: boolean; title: string; url: string; utmSource?: string; utmMedium?: string; utmCampaign?: string }
  | { id: string; type: "sponsored"; enabled: boolean; title: string; url: string }
  | { id: string; type: "custom-html"; enabled: boolean; html: string }
  | { id: string; type: "music"; enabled: boolean; url: string; oembedCache?: OembedCache }
  | { id: string; type: "video"; enabled: boolean; url: string; oembedCache?: OembedCache }
  | { id: string; type: "pinterest"; enabled: boolean; url: string; oembedCache?: OembedCache }
  | { id: string; type: "collection"; enabled: boolean; layout: "grid" | "carousel"; children: Block[] }
  | { id: string; type: "form"; enabled: boolean; formspreeId: string; title: string; submitLabel: string; fields: FormField[] }
  | { id: string; type: "email"; enabled: boolean; convertkitFormId: string; title: string; submitLabel: string; placeholder: string }
  | { id: string; type: "commerce"; enabled: boolean; provider: CommerceProvider; url: string; label: string; description?: string; price?: string }
  | { id: string; type: "support"; enabled: boolean; provider: SupportProvider; url: string; label: string }
  | { id: string; type: "course"; enabled: boolean; url: string; title: string; platform?: string; price?: string };

export interface Config {
  schemaVersion: number;
  profile: Profile;
  blocks: Block[];
  theme: Theme;
  siteUrl?: string;
  domain?: string;
  connections: string[];
}
