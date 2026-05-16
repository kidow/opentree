import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

const LAST_CHECK_KEY = "opentree.lastUpdateCheck";
/** Minimum gap between automatic (focus-triggered) update checks. */
export const MIN_CHECK_INTERVAL_MS = 30 * 60 * 1000;

/** True when enough time has passed since the last automatic check. */
export function shouldCheck(now: number = Date.now()): boolean {
  try {
    const last = Number(window.localStorage.getItem(LAST_CHECK_KEY) ?? 0);
    return now - last > MIN_CHECK_INTERVAL_MS;
  } catch {
    return true;
  }
}

export function markChecked(now: number = Date.now()): void {
  try {
    window.localStorage.setItem(LAST_CHECK_KEY, String(now));
  } catch {
    /* localStorage may be unavailable */
  }
}

/** Query the updater endpoint. Returns the pending Update, or null if none / on error. */
export async function checkForUpdate(): Promise<Update | null> {
  try {
    return await check();
  } catch {
    return null;
  }
}

/** Download + install the update, then relaunch the app. */
export async function installAndRestart(update: Update): Promise<void> {
  await update.downloadAndInstall();
  await relaunch();
}
