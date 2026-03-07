# opentree Specification

This document tracks the remaining work for `opentree`.

It is not a marketing page. It is the working product and engineering roadmap for the next development phases.

## Current Baseline

The current CLI already supports:

- project initialization with `opentree init`
- config editing through profile, site, metadata, theme, and link commands
- config inspection through `config show` and `link list`
- config validation through `validate`
- static site generation through `build`
- local preview through `dev`
- deployment through `deploy`
- Vercel link management through `vercel link`, `vercel status`, and `vercel unlink`
- readiness checks through `doctor`
- machine-readable `--json` output for major commands
- CI coverage through automated test and smoke test runs

## Product Goal

`opentree` should feel like a complete CLI product for building and operating a link-in-bio page:

- easy to install
- easy to understand
- safe to automate
- predictable to deploy
- opinionated in output quality

## Remaining Work

### 1. Unify Deploy Preflight With Shared Diagnostics

Priority: now

`deploy` should consume the same shared diagnostic collectors used by `doctor` and `vercel status`.

Deliverables:

- one shared source of truth for Vercel CLI installation checks
- one shared source of truth for Vercel auth checks
- one shared source of truth for root project link checks
- consistent failure wording across `deploy`, `doctor`, and `vercel status`

Acceptance criteria:

- no duplicate Vercel readiness logic in separate command files
- the same failure scenario produces equivalent status interpretation in all three commands

### 2. Formalize the Config Schema

Priority: now

The project needs a stable public config contract.

Deliverables:

- documented schema for `opentree.config.json`
- explicit field definitions for `profile`, `links`, `theme`, `siteUrl`, and `metadata`
- decision on whether to add `schemaVersion`
- optional JSON Schema export for editor integration

Acceptance criteria:

- users can understand the full config format without reading source code
- future breaking changes have a place to be versioned

### 3. Freeze the JSON Output Contract

Priority: now

`--json` output is now broad enough that it should be treated as a public interface.

Deliverables:

- common required fields documented for all machine-readable commands
- rules for `command`, `stage`, `message`, `issues`, and `result`
- compatibility policy for future JSON changes

Acceptance criteria:

- downstream scripts can rely on output structure
- new command implementations follow the same contract by default

### 4. Improve Deploy UX

Priority: next

Deployment works, but the CLI can still be clearer and more polished.

Deliverables:

- clearer success output for preview vs production deploys
- standardized reporting for deployment URL and inspect URL
- better guidance when deploy fails after passing preflight
- consistent JSON response shape for deploy outcomes

Acceptance criteria:

- a user can distinguish preview and production deploys without guessing
- deploy failures are actionable without reading source code

### 5. Raise Output Quality

Priority: next

The generated site should feel more complete by default.

Deliverables:

- favicon support
- stronger default Open Graph image strategy
- long text handling for bios and link titles
- accessibility pass on generated markup
- mobile layout polish and spacing review

Acceptance criteria:

- built pages behave well on common mobile and desktop widths
- generated pages have reasonable default metadata and accessibility characteristics

### 6. Release and Publishing Automation

Priority: next

The project needs a cleaner release path beyond manual publishing.

Deliverables:

- documented npm release workflow
- versioning rules
- changelog or release notes process
- optional GitHub Actions release automation

Acceptance criteria:

- publishing a new version follows a repeatable process
- release changes are visible to users

### 7. Optional CLI Ergonomics

Priority: later

These improve usability but are not required to complete the current product loop.

Candidates:

- link presets
- interactive mode
- friendlier help text and examples
- import or migration helpers
- shell completion

Acceptance criteria:

- additions must simplify common tasks without weakening the current deterministic workflow

### 8. Future Expansion

Priority: later

These are valid directions, but they should not block the current core CLI product.

Candidates:

- multiple templates
- QR code generation
- analytics or click tracking
- natural-language editing
- richer social card customization

## Non-Goals For The Current Phase

The following are explicitly out of scope for the near term:

- a drag-and-drop visual editor
- full Linktree feature parity
- monetization tooling
- advanced analytics dashboards
- multi-tenant hosted infrastructure

## Recommended Execution Order

1. Unify deploy preflight with shared diagnostics.
2. Formalize the config schema.
3. Freeze the JSON output contract.
4. Improve deploy UX.
5. Raise output quality.
6. Automate releases.
7. Revisit ergonomic and expansion features.

## Definition Of The Next Milestone

The next milestone is complete when:

- `deploy`, `doctor`, and `vercel status` share the same readiness logic
- the config schema is documented in a stable way
- JSON output is documented as a public contract
- the default deployment workflow is clear enough for a first-time user
