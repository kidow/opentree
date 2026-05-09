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

## v0.1.0 - 2026-03-08

Initial release notes:

- CLI workflow for init, edit, inspect, validate, build, preview, diagnose, and deploy
- Shared deploy diagnostics and documented JSON output contract
- Documented config schema with `schemaVersion: 1` and shipped JSON Schema
- Generated favicon, default social image, and improved default page accessibility
