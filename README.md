# Opentree

Free, open-source desktop app for building your link-in-bio page. No account required. Your data stays local.

## What it is

Opentree is a cross-platform desktop app (macOS + Windows) — think Linktree, but self-hosted and free. Edit your profile visually, preview it in a phone mock-up, and deploy to Vercel, Cloudflare Pages, or GitHub Pages with one click.

## Features

**Editor**
- Drag-and-drop block editor with 21 block types: profile, link, heading, text, socials, image, footer, affiliate (UTM), sponsored, custom-html, music, video, pinterest, collection, form, email, commerce, support, course, language-switcher
- Live phone-shaped preview
- Image asset import with SHA-256 dedup + auto-resize (avatar 512px, image 1920px, background 2560px)
- Per-block schedule (publishAt / unpublishAt) — server-side filter at deploy time + client-side hide between deploys
- Undo / Redo (50-step history)

**Design**
- Theme tokens: accent, background, text, optional border / muted / hover
- Button presets: outline, pill, rounded, square, soft
- Layouts: classic, featured (first card emphasized)
- Backgrounds: solid, linear gradient, image (with Unsplash picker), video
- Google Fonts via `<link>` injection
- Custom CSS escape hatch
- Theme bundle JSON import / export
- WCAG AA contrast warning + `prefers-reduced-motion` baked in

**Hosting + Deploy**
- One-click deploy to Vercel, Cloudflare Pages, or GitHub Pages
- Custom domain management (DNS records, verification polling)
- Static export to local folder
- API tokens stored in OS Keychain (macOS Keychain / Windows Credential Manager)

**Analytics**
- 5 providers: Plausible, Umami, Fathom, GA4, Cloudflare Web Analytics
- Auto-injected click tracking on every clickable block (Plausible + GA4)
- Built-in Stats dashboard for Plausible: visitors / pageviews / bounce / duration + Top Blocks breakdown

**AI Chat**
- Right-side chat panel powered by Claude or OpenAI
- 8 tools: add/edit/delete/reorder/toggle blocks, update theme/profile, set schedule
- Live preview of pending changes with Apply / Cancel

**Internationalization**
- Desktop UI: 한국어 + English
- Page output: `<html lang>`, full Open Graph + Twitter Card meta, JSON-LD `schema.org/Person`
- Multi-locale per project: emit `/ko`, `/en` etc. with profile + per-block overrides + language-switcher block

**SEO + a11y**
- Auto-generated `sitemap.xml` + `robots.txt`
- `:focus-visible` outlines, semantic landmarks, alt text required for images

**Local-first**
- Config saved as `opentree.config.json` — you own it
- No accounts, no telemetry, no opentree-hosted backend

Apache-2.0 licensed.

## Download

See [Releases](https://github.com/kidow/opentree/releases) for the latest macOS `.dmg` and Windows `.msi` / `.exe`.

## Build from source

**Requirements:**

- Rust 1.75+
- Node.js 20+
- macOS: Xcode Command Line Tools
- Windows: WebView2 runtime + Visual Studio Build Tools (C++ workload)

```bash
git clone https://github.com/kidow/opentree
cd opentree/apps/desktop
npm install
source ~/.cargo/env
npx tauri dev      # dev mode
npx tauri build    # production build
```

## Config format

`opentree.config.json` is a plain JSON file stored in your project folder. Schema version 14 (current). Backward compatible — older configs auto-migrate via serde defaults.

```json
{
  "schemaVersion": 14,
  "profile": {
    "name": "Kidow",
    "bio": "Building things",
    "avatarUrl": "https://example.com/avatar.png"
  },
  "blocks": [
    { "id": "...", "type": "profile", "enabled": true },
    { "id": "...", "type": "link", "enabled": true, "title": "GitHub", "url": "https://github.com/kidow" },
    { "id": "...", "type": "music", "enabled": true, "url": "https://open.spotify.com/track/..." }
  ],
  "theme": {
    "accentColor": "#166534",
    "backgroundColor": "#f0fdf4",
    "textColor": "#052e16",
    "buttonStyle": "outline",
    "layout": "classic"
  },
  "siteUrl": "https://yourname.vercel.app",
  "domain": "yourname.com",
  "connections": [],
  "schedules": {},
  "seo": { "title": "...", "description": "...", "ogImage": "..." },
  "locale": "en",
  "localeVariants": []
}
```

## Workspace structure

```
opentree/
├── crates/
│   └── opentree-core/     # Rust: config, build, validate, render
└── apps/
    ├── desktop/           # Tauri v2 + React desktop app
    │   ├── src/           # React (TypeScript + Vite)
    │   └── src-tauri/     # Rust Tauri backend
    └── web/               # Astro landing site
```

## Docs

[opentree.vercel.app](https://opentree-omega.vercel.app) — Getting started, download, changelog.

## License

Apache-2.0
