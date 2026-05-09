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

### Testing — remaining UI components (Vitest)

- 56 new component tests across 7 files closing the remaining UI gap:
  - `Welcome.test.tsx` (2) — title + onOpen callback
  - `PhonePreview.test.tsx` (8) — profile / link / heading / text
    rendering, disabled blocks hidden, avatar img vs placeholder
    fallback, theme color application, unsupported block types
    silently skipped
  - `Editor.test.tsx` (6) — null config short-circuit, BlockCard
    list per config, AddBlockModal open/close + append, remove +
    toggle wired through store
  - `Settings.test.tsx` (8) — six provider cards rendered, masked
    token display when connected, verify_connection + set_token
    invocation chain, Site URL + Analytics dropdown + Locale
    Variants editor + language picker + project info
  - `Publish.test.tsx` (8) — 3 provider tabs, "connect in Settings"
    state, project name input + deploy button, deploy_vercel
    payload (config + projectName + projectPath), success URL
    rendering, error state, project name sanitisation, provider
    switch clears stale result
  - `Design.test.tsx` (13) — 6 colour rows, hex update, WCAG
    warning, button preset / layout / background type switching,
    font family + custom CSS blur, theme bundle export + import
    (success + invalid JSON), Unsplash modal open + search-result
    rendering
  - `ChatSidebar.test.tsx` (11) — title + provider dropdown, hint
    visible on empty state, send disabled while empty, missing
    token error, chat_send invocation payload, assistant text
    rendering, pending tool call summary + Apply/Cancel buttons,
    Cancel reverts preview, Apply dismisses pending UI, Enter to
    submit, error state on invoke throw
- Total UI test count rises from 43 to 99
- Full repo test count: opentree-core 54 + desktop backend 59 +
  desktop UI 99 + E2E specs 3 = **215**

### Testing — asset.rs (image import + resize)

- 14 inline tests covering `import_asset` and `resize_if_needed`:
  - 5MB cap rejected with size-aware error message
  - Missing source path returns error
  - Small images preserved without resize, output path format
    `assets/{role}-{hash8}.{ext}` validated
  - Same content produces same filename (SHA-256 dedup) — single
    file on disk after duplicate import
  - Different content → different filenames
  - Role-based width caps: avatar ≤ 512×512 (height capped too),
    image ≤ 1920w, background ≤ 2560w
  - JPEG signature preserved through resize round-trip
  - Uppercase extensions lowercased on output
  - Assets folder auto-created when missing
  - `resize_if_needed` returns original bytes unchanged when within
    limits, applies height cap for avatar role
- `tempfile` dev-dep added to `apps/desktop/src-tauri`

### Testing — desktop backend (publish.rs + ai.rs)

- Add `mockito` dev-dep. 45 inline tests covering Tauri backend HTTP
  + parsing logic
- ai.rs (17): pure response parsers (`parse_anthropic_response`,
  `parse_openai_response`) covering text-only, tool_use, multi-block
  text, unknown blocks, invalid arguments fallback, and invalid JSON
  paths; tool definition shape (`tool_defs` covers all 8 actions,
  Claude vs OpenAI envelope formats); `system_prompt` config injection;
  HTTP `verify_anthropic_at` / `verify_openai_at` (200 ok / 401 err)
  via mockito
- publish.rs (28): pure helpers (`sha256_hex`, `ext_to_mime`,
  `plausible_base` with self-host override + trailing slash strip);
  parsers for Plausible aggregate + breakdown, Unsplash search
  (UTM attribution attached); HTTP `verify_vercel_at`,
  `verify_github_at`, `verify_cloudflare_at`,
  `verify_unsplash_at` (with `/me` → `/photos/random` fallback),
  `unsplash_search_at`, `fetch_plausible_stats`, `verify_plausible`
  via mockito (success + error paths)
- Refactored testable surface: each public verify/search function
  delegates to a private `*_at(base)` variant that takes the API base
  URL. Plausible already supported base override via `PlausibleConnection`.
  Production callers unchanged
- CI `rust` job now installs Linux WebKit deps and runs
  `cargo test --lib` against `apps/desktop/src-tauri` in addition
  to `opentree-core` tests

### Testing — E2E scaffold (WebdriverIO + tauri-driver)

- Add `apps/desktop/e2e/` directory with WebdriverIO 9 + Mocha
  framework wired through `tauri-driver`
- `wdio.conf.ts`: builds the Tauri debug binary (skippable via
  `SKIP_TAURI_BUILD=1`), spawns `tauri-driver` on `127.0.0.1:4444`,
  hard-fails on macOS (tauri-driver has no macOS backend)
- Specs:
  - `smoke.spec.ts` — window opens, title is non-empty, root element
    mounted with content
  - `sidebar.spec.ts` — five primary tabs + AI Chat toggle button
    visible (auto-skips if Welcome screen still showing — needs
    fixture-project flow to fully exercise)
- `e2e/README.md` documents Linux + Windows prereqs (`tauri-driver`
  via `cargo install`, `webkit2gtk-driver` on Linux, Edge Driver on
  Windows) and the explicit macOS skip
- `package.json` scripts: `e2e` (run suite) + `e2e:typecheck`
  (validate config without launching)
- CI: new `e2e` job on Ubuntu — installs webkit2gtk + tauri-driver,
  runs the suite under `xvfb-run`. `continue-on-error: true` so
  flakes don't block PRs while we stabilise the fixture flow
- Cannot exercise the suite end-to-end on macOS dev machines; rely
  on CI for verification

### Testing — UI unit tests (Vitest + Testing Library)

- Add Vitest with jsdom environment + Testing Library + jest-dom
  matchers + @tauri-apps/api/mocks. 43 unit tests across 5 files:
  - `i18n.test.ts` (7) — `t()` lookups, fallback to key, language
    switching, `useT` / `useLang` reactivity, localStorage persistence
  - `store.test.ts` (11) — store mutators (profile, blocks, theme),
    undo/redo traversal, `updateSchedule` set + clear,
    `markSaved`, wholesale `update`
  - `AddBlockModal.test.tsx` (8) — every block type listed, default
    payload per type (Link/Form/Collection/Commerce/Support),
    onClose, unique UUIDs
  - `BlockCard.test.tsx` (11) — labels (Profile/Link/Image/
    Affiliate/Collection/Music), disabled styling, link editor
    onUpdate, toggle, remove, schedule editor onScheduleChange
  - `Stats.test.tsx` (6) — disabled state, missing-token state,
    KPI rendering from `fetch_plausible_stats` (visitors / pageviews
    / bounce / duration), period switching re-fetches, error
    rendering, refresh button
- Test setup polyfills `localStorage` (vitest 4 jsdom backend
  doesn't seed it), stubs `crypto.randomUUID` for deterministic
  ids, mocks `@tauri-apps/plugin-dialog`
- `package.json` scripts: `test` / `test:watch` / `typecheck`
- CI `frontend` job runs `npm run typecheck` and `npm test`

### Testing — opentree-core integration tests

- Add 54 integration tests across 5 files in `crates/opentree-core/tests/`:
  - `config_roundtrip.rs` (7) — serialize/deserialize parity for every
    Block variant + selective omitted fields + camelCase JSON keys
  - `validate.rs` (19) — positive paths + every `ValidationError` rule
    triggered with focused negative cases
  - `build.rs` (8) — `BuildOutput` fields, schedule filtering at build
    time, locale page emission, `write_output` filesystem side-effects
  - `render_snapshots.rs` (13) — insta snapshot tests for representative
    pages (minimal / all-blocks / analytics / image-bg with credit /
    scheduled wrapper / locale-merge / button styles / featured layout /
    video bg / favicon / sitemap / robots)
  - `schema_migration.rs` (7) — legacy fixture configs (schemaVersion
    2 / 3 / 6 / 8 / 10) parse + validate + build cleanly. Unknown
    future fields tolerated
- Shared `tests/common/mod.rs` builds configs with stable UUIDs so
  snapshots stay deterministic
- Bug fix surfaced by tests: Block variants with multi-word fields
  (`asset_path`, `oembed_cache`, `formspree_id`, `convertkit_form_id`,
  `action_url`, `submit_label`, `utm_*`) now serialize as camelCase to
  match TypeScript types. Per-variant `#[serde(rename_all = "camelCase")]`
  added. Without this, image / form / email block fields were silently
  dropped on round-trip
- Rewrite `.github/workflows/ci.yml`: split into `rust` (cargo test
  opentree-core) and `frontend` (tsc --noEmit) jobs. Drops obsolete
  `npm test` / `npm run test:smoke` from legacy CLI era

### Phase 14.2 — Multi-locale per Project

- Add `localeVariants: LocaleVariant[]` field on Config — each variant
  defines a `code`, URL `path`, optional `label` (button text), optional
  `profile` overrides (name/bio/avatarUrl), and optional per-block JSON
  overrides
- Build emits the primary HTML at root + `/{path}/index.html` for each
  variant. Variant rendering applies a deep JSON merge over the base
  config so each locale can override any field on any block
- All deploy providers (Vercel, CF Pages, GH Pages) now upload locale
  pages alongside the primary
- Local export writes locale subdirectories
- Add `language-switcher` block: renders a row of links (Default + each
  variant's label) so visitors can switch between locale paths
- Settings → Locale Variants editor: add/remove variants, edit
  code/path/label + profile overrides. Per-block translation requires
  manual `opentree.config.json` edit (advanced)
- Bump `schemaVersion` to 14

This closes the post-MVP roadmap. All Phase 4–15 items (incl. 5.5,
12.2, 13.2, 14.2) shipped.

### Phase 12.2 — Unsplash + Background Video

- Add Unsplash picker: connect Access Key in Settings → 연결, then
  Design → 배경 → 이미지 → "📷 Unsplash 검색" opens an inline modal
  with search + thumbnail grid. Selecting a photo auto-fills the
  background URL and stores attribution metadata
- Background attribution is rendered as a small fixed-position
  credit ("Photo by X on Unsplash") in the bottom-right of the
  generated page, with linked photographer + source URLs (UTM
  parameters per Unsplash terms)
- Add `Background::Video` variant: `<video autoplay loop muted
  playsinline>` element fixed to viewport with `object-fit: cover`,
  optional poster image, optional opacity. Hidden under
  `prefers-reduced-motion`
- Bump `schemaVersion` to 13

### Phase 13.2 — Build-time Schedule Filtering

- Add `build_with_time(config, now)` and `render_page_with_time(config, now)`
  to opentree-core: when `now` is provided, blocks scheduled outside the
  publish/unpublish window are excluded from the rendered HTML
- Desktop publish + export commands now pass current UTC time
  (`OffsetDateTime::now_utc()` formatted as RFC3339) to the build, so
  scheduled-out blocks are absent from deployed HTML source — not just
  client-side hidden
- Comparison is lexical on ISO8601 UTC strings (sortable by design)
- Backward compatible: existing `build(config)` and `render_page(config)`
  still work and skip filtering (no time provided)

Provider cron auto-setup (GH Actions / Vercel crons / CF Worker)
remains deferred. opentree's static-upload deployment model means
external schedulers can't usefully trigger redeploys without a
server-side rebuild step that runs opentree-core. Practical workaround:
re-publish from the desktop app at any time and the new HTML reflects
the current schedule. Client-side JS hide (Phase 13.1) still bridges
the gap between manual publishes.

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
- Reflect full Phase 1–14 desktop scope: Hero badge / CTA / JSON-LD now mention macOS + Windows; `/download` shows platform-grouped Apple Silicon / Intel / MSI / EXE assets; `/docs/schema` rewritten to current schemaVersion 14
- Expand `/docs` to 11 pages: Block types (20 catalog), Design (theme + button styles + layouts + backgrounds + fonts + custom CSS), AI editing (Claude/OpenAI + 8 tools), Analytics (Plausible), Scheduling (publishAt/unpublishAt), Multi-locale (localeVariants + languageSwitcher), SEO (meta + sitemap + robots)
- Regroup DocsSidebar into Overview / Editing / Publishing / Reference
- Landing sections updated for v1 scope: Editor section now shows AI panel exchange, new "Every kind of block" 19-tile grid, new "Everything else, built in" capability cards (scheduling / multi-language / privacy-first analytics / SEO); abstract phrasing keeps OSS minimal tone (no provider names in landing copy)
- Remove all Korean strings from `/docs` (Phase 14 desktop is bilingual; quoting one localization is misleading)
- Tighten SEO meta: og:image absolute URL, og:site_name, og:locale, og:image:width/height/alt, conditional JSON-LD (SoftwareApplication on `/` only), per-page `og:type` switches website/article
- Add cmd+k search dialog: shadcn-pattern Command (cmdk) + Dialog (Radix) as React island, search trigger pill in header right of logo, indexes 14 internal pages + 2 external links
- Drop default model values from `/docs/ai-chat` (model names go stale; in-app picker is source of truth)
- Split `/docs/blocks` into 4 category pages (Basic / Media / Forms & email / Commerce) with hub at `/docs/blocks`; sidebar gains nested children
- Add Korean i18n: Astro `i18n` config (en at `/`, ko at `/ko/`), rewrite fallback so untranslated `/ko/*` routes serve English MDX under Korean chrome; bilingual catalog for chrome strings + LanguageSwitcher in header; Korean landing, download, and docs hub pages translated; hreflang + locale OG tags; SearchCommand lang-aware
- Replace LanguageSwitcher pill toggle with a shadcn Select dropdown (Radix `@radix-ui/react-select` React island) — extensible for future locales beyond EN/KO

## v0.1.0 - 2026-03-08

Initial release notes:

- CLI workflow for init, edit, inspect, validate, build, preview, diagnose, and deploy
- Shared deploy diagnostics and documented JSON output contract
- Documented config schema with `schemaVersion: 1` and shipped JSON Schema
- Generated favicon, default social image, and improved default page accessibility
