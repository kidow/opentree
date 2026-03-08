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
- shared Vercel readiness diagnostics across `deploy`, `doctor`, and `vercel status`
- a documented config contract with `schemaVersion: 1` and a shipped JSON Schema export
- a documented JSON output contract with shared top-level fields across machine-readable commands
- deploy output that clearly distinguishes preview vs production, standardizes URLs, and gives post-preflight failure guidance
- generated output with shipped favicon/social image assets, improved long-text handling, accessibility refinements, and tighter mobile spacing
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

### 1. Release and Publishing Automation

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

### 2. Optional CLI Ergonomics

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

### 3. Future Expansion

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

1. Automate releases.
2. Revisit ergonomic and expansion features.

## Definition Of The Next Milestone

The next milestone is complete when:

- the default deployment workflow is clear enough for a first-time user
