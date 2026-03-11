# opentree

`opentree` is a CLI-first link-in-bio generator.

It creates a static profile page from a single config file, lets you edit that config from the terminal, previews the result locally, and deploys the generated site with Vercel.

## Install

```bash
npm install -g opentree-cli
```

The package name is `opentree-cli`, and the installed command is `opentree`.

## Quick Start

```bash
opentree init --name "Kidow" --bio "CLI-first profile"
opentree link add --title "Docs" --url "https://example.com/docs"
opentree build
opentree dev
```

This creates `opentree.config.json`, updates it through CLI commands, builds a static site, and starts a local preview server.

## What It Does

- Generates a link page from `opentree.config.json`
- Updates profile, site, metadata, theme, and links from the CLI
- Adds guided setup, link presets, JSON import, and deterministic prompt editing
- Exposes runtime command schemas with `opentree schema --json`
- Validates config before build and deploy
- Produces static HTML output plus generated favicon and social image assets
- Supports glass and terminal templates, optional QR output, local click tracking, and richer social card defaults
- Previews the page locally with live config reload on refresh
- Integrates with Vercel for linking, status checks, and deployment
- Includes task-oriented help output and shell completion generation for bash and zsh
- Supports `--json` output and `--dry-run` previews on mutating commands for scripts and CI

## Core Commands

```bash
opentree init
opentree interactive
opentree validate
opentree build
opentree dev
opentree deploy
opentree import links --file ./links.json --replace
opentree schema build --json
opentree prompt "set my bio to Shipping links"

opentree config show
opentree profile set --name "Kidow"
opentree site set --url "https://links.example.com" --analytics local
opentree meta set --title "Kidow Links" --card-eyebrow "Operator Manual" --card-style terminal --show-qr-code
opentree theme set --accent-color "#0f766e"

opentree link list
opentree link add --title "Docs" --url "https://example.com/docs"
opentree link preset --name github --handle kidow
opentree link update --index 1 --title "GitHub Profile"
opentree link move --from 3 --to 1
opentree link remove --index 1

opentree vercel link
opentree vercel status
opentree vercel unlink
opentree doctor
opentree completion zsh
```

Most mutating commands also support `--dry-run`, including `init`, `build`, `deploy`, `import links`, `prompt`, config edit commands, `link` mutations, and `vercel link` / `vercel unlink`.

## Deploy Flow

```bash
npm install -g vercel
vercel login

opentree site set --url "https://links.example.com"
opentree vercel link
opentree deploy --prod
```

`opentree deploy` expects:

- a valid `opentree.config.json`
- a configured `siteUrl`
- Vercel CLI installed
- Vercel CLI logged in
- a root-level Vercel project link created by `opentree vercel link`

Deploy output conventions:

- preview and production deploys are reported separately
- successful deploys print standardized `deployment url` and `inspect url` lines when available
- failed deploys after preflight print the Vercel inspect URL when available and include retry guidance
- `deploy --json` returns a stable deploy result payload with `mode`, `target`, `deploymentUrl`, `inspectUrl`, `outputDir`, and linked project metadata

## Config Schema

`opentree.config.json` is the public config contract for the CLI. New configs created by `opentree init` use `schemaVersion: 1`.

Current versioning policy:

- `schemaVersion: 1` is the current supported contract
- missing `schemaVersion` is still accepted for backward compatibility with older configs
- future breaking config changes should increment `schemaVersion`

For editor integration, the repository ships [opentree.schema.json](./opentree.schema.json).

Example config:

```json
{
  "schemaVersion": 1,
  "profile": {
    "name": "Kidow",
    "bio": "CLI-first profile",
    "avatarUrl": "https://example.com/avatar.png"
  },
  "links": [
    {
      "title": "Docs",
      "url": "https://example.com/docs"
    }
  ],
  "theme": {
    "accentColor": "#166534",
    "backgroundColor": "#f0fdf4",
    "textColor": "#052e16"
  },
  "template": "terminal",
  "siteUrl": "https://links.example.com",
  "analytics": {
    "clickTracking": "local"
  },
  "metadata": {
    "title": "Kidow Links",
    "description": "Find my work across the internet.",
    "ogImageUrl": "https://cdn.example.com/og.png",
    "socialCard": {
      "eyebrow": "Operator Manual",
      "style": "terminal",
      "showQrCode": true
    }
  }
}
```

Field definitions:

- `schemaVersion`: optional integer version marker. When present, it must be `1`.
- `profile`: required object for profile identity.
- `profile.name`: required non-empty string shown as the page headline.
- `profile.bio`: required string shown below the profile name.
- `profile.avatarUrl`: required string. Use `""` for no avatar, or an `http`/`https` URL.
- `links`: required non-empty array of outbound links.
- `links[].title`: required non-empty string shown on the link card.
- `links[].url`: required `http`/`https` URL for the destination.
- `theme`: required object for generated page colors.
- `theme.accentColor`: required 6-digit hex color such as `#166534`.
- `theme.backgroundColor`: required 6-digit hex color such as `#f0fdf4`.
- `theme.textColor`: required 6-digit hex color such as `#052e16`.
- `template`: optional string. Supported values are `glass` and `terminal`.
- `siteUrl`: optional string. Use `""` for unset, or an `http`/`https` URL for canonical, sitemap, robots, and deploy expectations.
- `analytics`: optional object for generated-page telemetry.
- `analytics.clickTracking`: optional string. Use `off` to disable tracking or `local` to store click counts in `localStorage`.
- `metadata`: optional object for document and social metadata.
- `metadata.title`: optional string for the HTML title and social title.
- `metadata.description`: optional string for meta description and social description.
- `metadata.ogImageUrl`: optional string. Use `""` for unset, or an `http`/`https` URL for Open Graph and Twitter image tags.
- `metadata.socialCard`: optional object for generated social-card styling.
- `metadata.socialCard.eyebrow`: optional string rendered on the default social card.
- `metadata.socialCard.style`: optional string. Supported values are `glass` and `terminal`.
- `metadata.socialCard.showQrCode`: optional boolean. When `true` and `siteUrl` is set, the page includes a QR code block.

Generated output defaults:

- `build` always emits `favicon.svg` based on the profile name and theme colors
- `build` always emits `opengraph-image.svg` as a default social card asset
- when `siteUrl` is configured and `metadata.ogImageUrl` is empty, social tags fall back to the generated `opengraph-image.svg`
- when `analytics.clickTracking` is `local`, generated links store click counts in `localStorage`
- when `metadata.socialCard.showQrCode` is `true` and `siteUrl` exists, generated HTML includes a QR code image
- long bios and link titles are wrapped to avoid card overflow
- generated markup includes a skip link, labeled navigation, and visible keyboard focus styles

## JSON Output

Most operational commands support `--json`, including:

- `init`
- `validate`
- `build`
- `dev`
- `deploy`
- `doctor`
- `import links`
- `schema`
- `prompt`
- `config show`
- config mutation commands such as `profile set`, `link add`, and `theme set`
- `vercel link`, `vercel status`, and `vercel unlink`
- `completion`

This makes `opentree` usable from shell scripts, CI jobs, and other tooling.

Most mutating commands also support `--dry-run`, so agents and scripts can validate the request and inspect the predicted result without writing files or invoking remote side effects.

Common top-level fields:

- `command`: canonical command name such as `build`, `deploy`, `doctor`, or `link add`
- `stage`: latest execution stage reached by the command
- `message`: primary human-readable summary
- `ok`: boolean success flag
- `issues`: array of actionable failure details or validation errors. Empty on success.
- `result`: command-specific machine-readable payload. `null` when no successful result is available.

Additional command-specific fields may appear alongside the common contract, such as `configPath`, `outputDir`, `checks`, `issueCount`, or `files`.

Stage guidance:

- `args`: argument parsing or usage failure
- `load`: config loading or startup failure before command execution
- `validate`: config validation failure
- `preflight`: readiness failure before a mutating operation
- `auth`: external authentication check
- `link`: project linking or reusable link inspection
- `build`: build step execution
- `deploy`: active deployment step
- `dry-run`: validated preview with no side effects
- `write`: file generation or persistence step
- `save`: local metadata or link persistence step
- `remove`: local cleanup step
- `status`: diagnostic summary stage

Compatibility policy:

- existing top-level contract fields will not be renamed or removed within the current config contract generation
- new fields may be added without notice when they do not change the meaning of existing fields
- scripts should key off `command`, `ok`, `stage`, `issues`, and `result`, and ignore unknown fields
- `result` shape is stable per command, but may grow with additional additive fields

## Release Workflow

The project ships a repeatable npm release path.

Versioning rules:

- use Semantic Versioning
- `patch` for fixes and non-breaking quality changes
- `minor` for backward-compatible CLI features and additive JSON/config behavior
- `major` for breaking CLI or config contract changes
- breaking config schema changes should also increment `schemaVersion`

Release flow:

1. Update [CHANGELOG.md](./CHANGELOG.md).
2. Run `npm run release:check`.
3. Bump the version with `npm version patch`, `npm version minor`, or `npm version major`.
4. Push the commit and tag.
5. Let [RELEASING.md](./RELEASING.md) and `.github/workflows/release.yml` drive npm publish and GitHub release notes.

The repository includes:

- [CHANGELOG.md](./CHANGELOG.md) for release notes
- [RELEASING.md](./RELEASING.md) for the publishing checklist
- `.github/workflows/release.yml` for tag-driven or manual GitHub Actions release automation

## Project Status

`opentree` already covers the main CLI workflow:

- initialize
- edit
- inspect
- validate
- build
- preview
- diagnose
- deploy
- guided setup and migration-style import
- optional template, QR, analytics, and social card extensions

The roadmap document was removed after the current milestone was completed.
