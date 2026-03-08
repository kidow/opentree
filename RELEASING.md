# Releasing opentree

This project publishes the `opentree-cli` package to npm.

## Versioning Rules

- Use Semantic Versioning.
- `patch`: bug fixes, docs-only corrections that affect shipped guidance, and internal quality improvements with no public behavior break.
- `minor`: backward-compatible CLI features, new flags, new generated output defaults, or additive JSON fields.
- `major`: breaking CLI behavior, removed flags, incompatible JSON contract changes, or a new required config schema generation.
- Config schema breaking changes should increment both the npm major version and `schemaVersion`.

## Release Checklist

1. Update `CHANGELOG.md`.
2. Run `npm run release:check`.
3. Choose the next version with `npm version patch`, `npm version minor`, or `npm version major`.
4. Review the created tag such as `v0.1.1`.
5. Push the commit and tag with `git push && git push --tags`.
6. Confirm the GitHub Actions release workflow finishes.
7. Verify the published package on npm.

## Publishing

Manual local publishing remains possible:

```bash
npm run release:check
npm publish --access public
```

The preferred path is tag-driven automation:

1. Bump the version locally.
2. Update `CHANGELOG.md`.
3. Push the version tag.
4. Let `.github/workflows/release.yml` run tests and publish to npm.

## Release Notes Process

- Draft notes in the `Unreleased` section of `CHANGELOG.md`.
- Collapse those bullets into the new version section on release day.
- Keep notes user-facing: what changed, what was fixed, and any behavior that needs attention.

## Required Secrets

- `NPM_TOKEN`: token with permission to publish `opentree-cli`.

## Failure Handling

- If `npm run release:check` fails, do not publish.
- If npm publish succeeds but the GitHub release step fails, rerun only the workflow after confirming the package version is already live.
- Never overwrite an existing published version. Cut a new patch release instead.
