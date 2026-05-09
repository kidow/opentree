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

### Phase 5.5 — Windows Support

- Add `.github/workflows/desktop-release.yml`: cross-platform release
  pipeline using `tauri-apps/tauri-action` over a matrix of
  macOS arm64, macOS x86_64, and Windows x86_64. Linux explicitly
  excluded per roadmap. Triggers on `desktop-v*.*.*` tags or manual
  `workflow_dispatch`.
- Tauri bundle Windows config: SHA-256 Authenticode digest, DigiCert
  timestamp URL, WiX (MSI) en-US, NSIS installer with English +
  Korean language selector at install time. Existing `targets: "all"`
  produces both `.msi` and NSIS `.exe`.
- Code signing wiring (no certs committed):
  - Windows Authenticode: `WINDOWS_CERTIFICATE` (base64 PFX) +
    `WINDOWS_CERTIFICATE_PASSWORD` GitHub repo secrets
  - macOS signing + notarization: `APPLE_CERTIFICATE`,
    `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`,
    `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`
  - Updater signing: `TAURI_SIGNING_PRIVATE_KEY`,
    `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
  - All optional — workflow runs unsigned if secrets missing
- Custom URL scheme registration (`opentree://`) deferred — current AI
  Chat uses API key paste, not OAuth; no callback target needed
- Manual UI verification on Windows is left to release reviewer

### Phase 15 — Provider Expansion (long tail)

- Analytics: extend AnalyticsConfig.provider to support 5 providers
  (Plausible, Umami, Fathom, Google Analytics 4, Cloudflare Web
  Analytics) with provider-specific script injection. Self-host base
  URL still applies to Plausible/Umami. Click tracking (BlockClick
  event) auto-fires for Plausible and GA4
- Form block: add `actionUrl` + `provider` fields. Falls back to
  Formspree URL built from `formspreeId` when `actionUrl` empty.
  Web3Forms / Basin / Getform / custom action URLs supported
- Email block: add `actionUrl` + `provider` fields with
  provider-aware email field name (Mailchimp `EMAIL`, Klaviyo/
  Buttondown `email`, Kit `email_address`). Mailchimp / Klaviyo /
  Buttondown action URLs supported
- Settings → Analytics: provider dropdown + per-provider ID hints +
  self-host URL when applicable
- Bump `schemaVersion` to 12

This closes the post-MVP roadmap (Phases 4–15). Phase 5.5 (Windows
support) and Phase 13.2 (cron auto-setup) remain explicitly deferred.

### Phase 14 — i18n + SEO + a11y polish

- Add `seo: {title, description, ogImage}` and `locale` fields to Config
- Render injects: `<html lang>`, `<meta name="description">`,
  Open Graph tags (`og:title/type/description/image/url`),
  Twitter Card meta, JSON-LD `schema.org/Person` (with `sameAs` from
  link blocks)
- Build emits `robots.txt` (with sitemap reference if siteUrl set) and
  `sitemap.xml` (when siteUrl set) — uploaded by all deploy providers
  (Vercel utf-8, CF Pages SHA-256 multipart, GH Pages Contents API)
  and copied on local export
- Add visible `:focus-visible` outline on all interactive elements
  using accent color (a11y)
- Desktop UI i18n scaffold: `i18n.ts` with ko/en catalogs + `t()`,
  `useT()`, `useLang()` hooks; localStorage-persisted; auto-detects
  from `navigator.language`
- Settings → SEO section (meta title / description / OG image / page
  locale) and Language picker (한국어 / English)
- Bump `schemaVersion` to 11

Deferred from roadmap: multi-locale per project (`/ko` + `/en` builds
with language switcher block) — Phase 14.2.

### Phase 13 — Link Scheduling

- Add `schedules` field to Config: map of block id → `{publishAt, unpublishAt}`
  (ISO8601 UTC strings)
- Per-block schedule editor in BlockCard (datetime-local inputs for
  publish start / end, plus 제거 button)
- Render wraps scheduled blocks in `<div class="scheduled" data-schedule-publish=… data-schedule-unpublish=…>` (CSS `display: contents` keeps layout intact)
- Inject runtime JS that re-evaluates schedules every 60s and toggles
  `.scheduled-hidden` on the wrapper — handles user's open browser
  past the publish/unpublish boundary
- AI Chat gains `set_schedule` tool (id + publishAt/unpublishAt)
- Bump `schemaVersion` to 10

Deferred from roadmap (13.2): provider cron auto-setup
(`scheduled-rebuild.yml` for GH Pages, Vercel `crons`, CF Worker).
Without cron, blocks reveal at next manual Publish OR via client-side
hide while page is open.

### Phase 12 — Theme Expansion

- Extend Theme schema: optional `borderColor` / `mutedColor` /
  `hoverColor` tokens (auto-fall back to accent / text-derived /
  accent), `buttonStyle`, `layout`, `background`, `fontFamily`,
  `customCss`
- Button presets: outline (default — preserves existing look), pill,
  rounded, square, soft
- Layout variants: classic (current), featured (first card emphasized
  with shadow + larger padding)
- Backgrounds: solid color, linear gradient (from/to/direction), image
  (assetPath or url + opacity overlay)
- Google Fonts: set `fontFamily` to inject `<link>` tags + apply to
  body font-stack at build time
- Custom CSS escape hatch: arbitrary CSS appended to rendered `<style>`
- Theme Bundle: JSON export/import in Design tab (community-shareable
  preset format)
- WCAG AA contrast warning when text/background ratio < 4.5:1
- `prefers-reduced-motion` media query auto-disables transitions
- Bump `schemaVersion` to 9

Skipped vs roadmap (deferred): Unsplash picker (needs API), background
video, complex animations.

### Phase 11 — AI Chat 편집

- Add right-side AI Chat panel (toggles in/out of phone preview slot)
- Supports Claude (Anthropic) and OpenAI as backends; user pastes API
  key in Settings → 연결 (OAuth PKCE deferred — providers don't expose
  stable PKCE flows for end-user API access)
- AI sees current config JSON and exposes 7 tools:
  `add_block`, `edit_block`, `delete_block`, `reorder_blocks`,
  `toggle_block`, `update_theme`, `update_profile`
- Tool calls render as a pending preview applied to live phone preview;
  user clicks **Apply** (commit to undo stack) or **Cancel** (revert)
- Defaults: `claude-sonnet-4-5-20250929`, `gpt-4o-mini`
- API keys stored in OS Keychain; usage billed against user's own account

### Phase 10 — Analytics (Plausible)

- Add `analytics` field on Config (provider, domain, optional self-host URL)
- Render auto-injects Plausible script (`script.tagged-events.js`) into
  `<head>` and a small click-tracking script that fires
  `plausible('BlockClick', {props:{block_id, block_type, label}})` for
  every clickable block
- All clickable blocks now emit `data-track-id`/`data-track-type`/
  `data-track-label` data attributes (inert when analytics disabled)
- Add Plausible API connection in Settings → 연결 (Bearer token, optional
  self-host base URL)
- Add Settings → Analytics section to enable + configure Site ID / self-host
- Add `Stats` tab — KPIs (visitors / pageviews / bounce / avg duration)
  + Top Blocks breakdown via Plausible Stats API; periods Today / 7d /
  30d / 6mo / 12mo
- Bump `schemaVersion` to 8

### Phase 9 — Commerce (incl. 9.5 Gumroad/Lemon Squeezy/Polar)

- Add `commerce` block — link to Stripe Payment Link, Gumroad, Lemon
  Squeezy or Polar with label/description/price metadata
- Add `support` block — Ko-fi, Buy Me a Coffee, Stripe, PayPal,
  Patreon donation links with provider badge
- Add `course` block — external course link with optional platform
  and price
- All commerce blocks render as plain `<a>` cards — payment processed
  externally, no tokens stored
- Add validation: URL + label/title required per block
- Bump `schemaVersion` to 7

### Phase 8 — Forms + Email

- Add `form` block type — submits to Formspree (`https://formspree.io/f/<id>`)
  with configurable fields (name + label + type: text/email/textarea + required)
- Add `email` block type — submits to ConvertKit/Kit
  (`https://app.kit.com/forms/<id>/subscriptions`); single email field signup form
- No tokens or provider connections needed — both endpoints are public
  by design and meant for embed in static sites
- Render produces real HTML `<form>` elements (no JavaScript), so they
  work even with JS disabled
- Add validation: form requires formspreeId + ≥1 field with name; email
  requires convertkitFormId
- Bump `schemaVersion` to 6

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
- Add sticky Header with Docs/Download/GitHub nav across all pages
- Add `/docs` section: hub page + 4 MDX guides (Deploy, Custom domains, Config schema, Troubleshooting) covering v1-stable surface (Phase 5 deploy/domain + Phase 1 blocks/theme); Phase 6+ block types deferred until v1 stabilizes
- Add DocsLayout with sidebar nav and Tailwind typography prose styles

## v0.1.0 - 2026-03-08

Initial release notes:

- CLI workflow for init, edit, inspect, validate, build, preview, diagnose, and deploy
- Shared deploy diagnostics and documented JSON output contract
- Documented config schema with `schemaVersion: 1` and shipped JSON Schema
- Generated favicon, default social image, and improved default page accessibility
