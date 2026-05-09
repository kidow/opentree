# Opentree

Free, open-source desktop app for building your link-in-bio page. No account required. Your data stays local.

## What it is

Opentree is a macOS desktop app — think Linktree, but self-hosted and free. Edit your profile visually, preview it in a phone mock-up, and deploy to Vercel with one click.

## Features

- Visual drag-and-drop editor (Link, Heading, Text blocks)
- Live phone-shaped preview
- Design tab: accent, background, and text colors
- One-click Vercel deploy via REST API
- Local-first: config saved as `opentree.config.json` — you own it
- Export to static `index.html` + `favicon.svg`
- Undo / Redo (50-step history)
- Import links from JSON
- MIT licensed

## Download

See [Releases](https://github.com/kidow/opentree/releases) for the latest macOS `.dmg`.

## Build from source

**Requirements:** Rust 1.75+, Node.js 20+, Xcode Command Line Tools

```bash
git clone https://github.com/kidow/opentree
cd opentree/apps/desktop
npm install
source ~/.cargo/env
npx tauri dev      # dev mode
npx tauri build    # production build
```

## Config format

`opentree.config.json` is a plain JSON file stored in your project folder.

```json
{
  "schemaVersion": 2,
  "profile": {
    "name": "Kidow",
    "bio": "Building things",
    "avatarUrl": "https://example.com/avatar.png"
  },
  "blocks": [
    { "id": "...", "type": "profile", "enabled": true },
    { "id": "...", "type": "link", "enabled": true, "title": "GitHub", "url": "https://github.com/kidow" },
    { "id": "...", "type": "heading", "enabled": true, "text": "Projects" },
    { "id": "...", "type": "text", "enabled": true, "content": "Some description" }
  ],
  "theme": {
    "accentColor": "#166534",
    "backgroundColor": "#f0fdf4",
    "textColor": "#052e16"
  },
  "siteUrl": "https://yourname.vercel.app"
}
```

## Workspace structure

```
opentree/
├── crates/
│   └── opentree-core/     # Rust: config, build, validate, render
├── apps/
│   ├── desktop/           # Tauri v2 + React desktop app
│   │   ├── src/           # React (TypeScript + Vite)
│   │   └── src-tauri/     # Rust Tauri backend
│   └── legacy-cli/        # Legacy Node.js CLI (archived)
└── docs/                  # Next.js documentation site
```

## Docs

[opentree.vercel.app](https://opentree.vercel.app) — Getting started, download, changelog.

## License

MIT
