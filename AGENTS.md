# opentree agent guide

Use this file when operating `opentree` from an AI agent or another automated tool.

## Preferred command patterns

- Prefer `--json` on operational commands. The stable top-level contract is `command`, `stage`, `message`, `ok`, `issues`, and `result`.
- Prefer `--dry-run` before any mutating command. Supported surfaces include `init`, `build`, `deploy`, `import links`, `prompt`, config edit commands, `link` mutations, and `vercel link` / `vercel unlink`.
- Prefer `opentree schema --json` to inspect the full command map at runtime.
- Prefer `opentree schema <command> --json` before constructing flags for a specific command.

## Path safety

- `build --output` must stay inside the current working directory.
- `import links --file` must stay inside the current working directory.
- Do not pass paths containing `?`, `#`, control characters, or percent-encoded dot segments such as `%2e`.

## Safe mutation loop

1. Inspect command shape with `opentree schema <command> --json`.
2. Validate intent with `--dry-run --json`.
3. Re-run without `--dry-run` once the predicted result is acceptable.

## Notes

- `opentree.config.json` is the public config contract.
- `opentree.schema.json` is the editor-facing JSON Schema for the config file.
- Unknown commands also return structured JSON when `--json` is present.
