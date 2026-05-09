# Desktop E2E (WebdriverIO + tauri-driver)

End-to-end tests that drive the real Tauri binary through WebDriver.

## Platform Support

| Platform | Status |
|----------|--------|
| **Linux** | Supported. Uses `webkit2gtk-driver`. |
| **Windows** | Supported. Uses Microsoft Edge Driver via WebView2. |
| **macOS** | **Unsupported** — `tauri-driver` has no macOS backend. Run unit tests (`npm test`) locally and rely on CI for E2E coverage. |

## Prerequisites

### Linux

```bash
sudo apt install -y webkit2gtk-driver libwebkit2gtk-4.0-dev
cargo install tauri-driver --locked
```

### Windows

```powershell
# Microsoft Edge Driver matching your Edge version
# https://developer.microsoft.com/microsoft-edge/tools/webdriver/
cargo install tauri-driver --locked
```

## Run

```bash
cd apps/desktop
npm run e2e
```

The runner:

1. Builds the Tauri binary in debug mode (`npx tauri build --debug --no-bundle`).
2. Spawns `tauri-driver` on `127.0.0.1:4444`.
3. Executes Mocha specs in `e2e/tests/`.

Skip the build step (already built once) with `SKIP_TAURI_BUILD=1 npm run e2e`.

## Specs

- `smoke.spec.ts` — window launch, title, root mount
- `sidebar.spec.ts` — sidebar tabs + AI Chat toggle (auto-skips if a project isn't loaded)

## Adding tests

Project-loaded specs need a fixture project on disk. The suite is structured so that future specs can opt into a fixture by writing a known `opentree.config.json` to a temp dir before launch — see `wdio.conf.ts#onPrepare` for the hook to extend.

## CI

The repo's `ci.yml` runs E2E on Linux only. Windows E2E runs in `desktop-release.yml` once a tag is cut. macOS is intentionally skipped.
