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
- Validates config before build and deploy
- Produces static HTML output
- Previews the page locally with live config reload on refresh
- Integrates with Vercel for linking, status checks, and deployment
- Supports `--json` output on major commands for scripts and CI

## Core Commands

```bash
opentree init
opentree validate
opentree build
opentree dev
opentree deploy

opentree config show
opentree profile set --name "Kidow"
opentree site set --url "https://links.example.com"
opentree meta set --title "Kidow Links"
opentree theme set --accent-color "#0f766e"

opentree link list
opentree link add --title "Docs" --url "https://example.com/docs"
opentree link update --index 1 --title "GitHub Profile"
opentree link move --from 3 --to 1
opentree link remove --index 1

opentree vercel link
opentree vercel status
opentree vercel unlink
opentree doctor
```

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
  "siteUrl": "https://links.example.com",
  "metadata": {
    "title": "Kidow Links",
    "description": "Find my work across the internet.",
    "ogImageUrl": "https://cdn.example.com/og.png"
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
- `siteUrl`: optional string. Use `""` for unset, or an `http`/`https` URL for canonical, sitemap, robots, and deploy expectations.
- `metadata`: optional object for document and social metadata.
- `metadata.title`: optional string for the HTML title and social title.
- `metadata.description`: optional string for meta description and social description.
- `metadata.ogImageUrl`: optional string. Use `""` for unset, or an `http`/`https` URL for Open Graph and Twitter image tags.

## JSON Output

Most operational commands support `--json`, including:

- `init`
- `validate`
- `build`
- `dev`
- `deploy`
- `doctor`
- `config show`
- config mutation commands such as `profile set`, `link add`, and `theme set`
- `vercel link`, `vercel status`, and `vercel unlink`

This makes `opentree` usable from shell scripts, CI jobs, and other tooling.

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
- `write`: file generation or persistence step
- `save`: local metadata or link persistence step
- `remove`: local cleanup step
- `status`: diagnostic summary stage

Compatibility policy:

- existing top-level contract fields will not be renamed or removed within the current config contract generation
- new fields may be added without notice when they do not change the meaning of existing fields
- scripts should key off `command`, `ok`, `stage`, `issues`, and `result`, and ignore unknown fields
- `result` shape is stable per command, but may grow with additional additive fields

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

The project is still evolving. The remaining roadmap and open work are tracked in [spec.md](./spec.md).
