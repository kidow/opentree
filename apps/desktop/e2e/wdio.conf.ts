import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import path from "node:path";
import os from "node:os";

// Resolve binary built by `npx tauri build --debug`.
function resolveBinary(): string {
  const root = path.resolve(__dirname, "..", "src-tauri", "target", "debug");
  if (process.platform === "win32") return path.join(root, "opentree-desktop.exe");
  return path.join(root, "opentree-desktop");
}

let tauriDriver: ChildProcess | null = null;

export const config = {
  runner: "local",
  framework: "mocha",
  reporters: ["spec"],
  specs: [path.join(__dirname, "tests", "**/*.spec.ts")],
  maxInstances: 1,
  capabilities: [{
    maxInstances: 1,
    "tauri:options": {
      application: resolveBinary(),
    },
  }],
  hostname: "127.0.0.1",
  port: 4444,
  logLevel: "warn",
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  mochaOpts: {
    ui: "bdd",
    timeout: 60_000,
  },

  // Build the Tauri binary once before the suite.
  onPrepare: () => {
    if (process.env.SKIP_TAURI_BUILD) return;
    const result = spawnSync("npx", ["tauri", "build", "--debug", "--no-bundle"], {
      cwd: path.resolve(__dirname, ".."),
      stdio: "inherit",
    });
    if (result.status !== 0) {
      throw new Error("Tauri debug build failed — cannot run E2E");
    }
  },

  // Boot tauri-driver before each session. Linux uses webkitwebdriver,
  // Windows uses msedgedriver via WebView2. macOS is unsupported by
  // tauri-driver — skip.
  beforeSession: () =>
    new Promise<void>((resolve, reject) => {
      if (os.platform() === "darwin") {
        return reject(new Error("tauri-driver does not support macOS — run E2E on Linux or Windows"));
      }
      const child = spawn("tauri-driver", [], { stdio: ["ignore", "pipe", "pipe"] });
      tauriDriver = child;
      child.stderr?.on("data", (chunk: Buffer) => {
        process.stderr.write(`[tauri-driver] ${chunk}`);
      });
      // Give the driver a moment to bind 4444 before the suite starts.
      setTimeout(resolve, 1000);
    }),

  afterSession: () => {
    tauriDriver?.kill();
    tauriDriver = null;
  },
};
