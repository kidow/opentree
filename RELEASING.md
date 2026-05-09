# Releasing opentree

This project distributes the `opentree` desktop app as signed installers via GitHub Releases:

- **macOS**: `.dmg` (arm64 + x86_64)
- **Windows**: `.msi` (WiX) + NSIS `.exe`
- Linux: not built

## Versioning Rules

- Use Semantic Versioning.
- `patch`: bug fixes, UI polish, no behavior break.
- `minor`: new block types, new features, additive config fields.
- `major`: breaking config schema changes, removed features, incompatible `schemaVersion` bump.
- Config schema breaking changes should increment both the app major version and `schemaVersion`.

## Release Checklist

1. Update `CHANGELOG.md` — move Unreleased bullets into a new version section.
2. Bump version in `apps/desktop/src-tauri/tauri.conf.json` and `apps/desktop/src-tauri/Cargo.toml`.
3. Commit: `chore: bump desktop version to vX.Y.Z`.
4. Tag: `git tag desktop-vX.Y.Z && git push && git push --tags`.
5. Confirm `.github/workflows/desktop-release.yml` runs on the matrix (macOS arm64, macOS x86_64, Windows x86_64) and attaches all artifacts to a draft release.
6. Review the draft on the [Releases page](https://github.com/kidow/opentree/releases) and publish.

## Publishing

Tag-driven automation is the preferred path:

1. Push the `desktop-vX.Y.Z` tag.
2. `desktop-release.yml` runs `tauri-action` per platform: `tauri build`, sign (if secrets present), and upload artifacts.
3. Workflow can also be triggered via `workflow_dispatch` against an existing tag.

The npm-package release workflow (`release.yml`) is separate and triggers on `v*.*.*` tags.

## Release Notes Process

- Draft notes in the `Unreleased` section of `CHANGELOG.md`.
- Collapse those bullets into the new version section on release day.
- Keep notes user-facing: what changed, what was fixed, any behavior that needs attention.

## Required Secrets

All secrets are optional — the workflow will produce unsigned builds if they're missing. Codesigning and notarization unlock distribution-grade artifacts.

**Updater signing** (Tauri auto-update verification)
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

**macOS** (Developer ID + notarization)
- `APPLE_CERTIFICATE` (base64 `.p12`)
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY` (e.g. `Developer ID Application: Name (TEAMID)`)
- `APPLE_ID`
- `APPLE_PASSWORD` (app-specific password)
- `APPLE_TEAM_ID`

**Windows** (Authenticode)
- `WINDOWS_CERTIFICATE` (base64-encoded PFX)
- `WINDOWS_CERTIFICATE_PASSWORD`

## Failure Handling

- If a build step fails, fix the issue and re-push the tag after deleting it: `git tag -d desktop-vX.Y.Z && git push origin :refs/tags/desktop-vX.Y.Z`.
- Never reuse a published tag. Cut a new patch release instead.
- For platform-specific failures, the matrix is `fail-fast: false` so successful platforms still upload their artifacts.
