# Changelog

All notable changes to this project should be recorded in this file.

The format is intentionally simple:

- Keep an `Unreleased` section at the top.
- Move entries into a versioned section when a release is cut.
- Prefer short user-facing bullets over implementation detail dumps.

## Unreleased

### Desktop App (Tauri)

- Add Rust workspace and `opentree-core` crate — foundation for native binary
- Move Node.js CLI to `apps/legacy-cli` to make room for Rust core
- Remove `apps/legacy-cli` — all functionality superseded by Rust core and Tauri desktop
- Remove import-from-JSON feature — no clear use case without legacy CLI

### Phase 7 — Block Expansion B (Embed)

- Add 4 new block types: Music, Video, Pinterest, Collection
- Music block auto-embeds Spotify (track/album/playlist/artist/episode/show), Apple Music, SoundCloud
- Video block auto-embeds YouTube (watch / youtu.be / shorts / embed) and Vimeo
- Pinterest block embeds via official `pinit.js` widget
- Collection block: grid or carousel layout containing child blocks (Link/Image/Music/Video/Pinterest)
- Add `oembedCache` field on embed blocks for future metadata enrichment
- Render fallback: any embed block with unrecognised URL falls back to a plain link card
- Bump `schemaVersion` to 5 (Block enum extended; existing configs auto-migrate via serde defaults)
- Add validation: music/video/pinterest require URL, collection rejects non-allowed child types

### Phase 6 — Block Expansion A + Asset Infrastructure

- Add 6 new block types: Socials, Image, Footer, Affiliate (UTM), Sponsored, Custom HTML
- Add `import_asset` command: imports image files into project `assets/` folder with SHA-256 dedup and resize (avatar 512px, image 1920px, background 2560px)
- Add image file picker in block editor (invokes `import_asset` via Tauri)
- Include `assets/` folder in all deployment providers (Vercel base64, CF Pages SHA-256 multipart, GitHub Pages Contents API)
- Copy `assets/` folder on local site export
- Render new block types in HTML output with full CSS
- Add validation for Image (alt required, source required), Affiliate (URL required + valid), Sponsored (title+URL required)

### Phase 5 — Hosting + Domain + Connections

- Replace plaintext token storage with OS Keychain via `keyring` crate
- Add Cloudflare Pages deployment (direct upload API with SHA-256 manifest)
- Add GitHub Pages deployment (GitHub Contents API + Pages activation)
- Add domain management: connect custom domain, display DNS records, poll verification status per provider
- Add Settings → Connections UI: connect/disconnect Vercel, Cloudflare Pages, GitHub Pages with credential validation
- Restructure Publish tab: provider tabs, project name per provider, custom domain section
- Add `domain` and `connections` fields to Config schema (schemaVersion → 3 ready)
- Add Tauri desktop app shell with tree editor
- Add Design tab with color picker
- Add Settings tab with site URL and project info
- Add Publish tab with Vercel deployment integration
- Add import flow for JSON link files
- Add undo/redo with history stack
- Fix profile editing, close-warning dialog, and export dialog

### Docs Site

- Add docs project (`apps/docs`)
- Add cmd+k search dialog
- Fix light mode header theming
- Remove Ask AI floating action from layout

### Web Landing

- Add `apps/web` — Astro + Tailwind + Inter + MDX landing site scaffold
- Register `apps/web` in root npm workspaces, remove stale `apps/docs` reference
- Delete legacy `docs/` directory (CLI-era artifact)
- Add Hero, Author, and Footer components with full copy and CTAs
- Add full SEO meta: title, description, OG, JSON-LD, sitemap, robots
- Add five content sections: Local-first, Editor, Preview, Deploy, Open
- Add `/download` page with build-time GitHub API fetch, version/date/size/checksum, and fallback
- Add `redeploy-web.yml` — triggers Vercel deploy on every published release
- Redesign with Mintlify-inspired tokens: white canvas default, atmospheric hero gradient, pill CTAs, refined typography (Inter Variable + Geist Mono), and richer visual mocks per section

## v0.1.0 - 2026-03-08

Initial release notes:

- CLI workflow for init, edit, inspect, validate, build, preview, diagnose, and deploy
- Shared deploy diagnostics and documented JSON output contract
- Documented config schema with `schemaVersion: 1` and shipped JSON Schema
- Generated favicon, default social image, and improved default page accessibility
