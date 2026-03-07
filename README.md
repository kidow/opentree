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
