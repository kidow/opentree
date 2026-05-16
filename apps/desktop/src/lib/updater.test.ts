import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/plugin-updater", () => ({ check: vi.fn() }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: vi.fn() }));

import { shouldCheck, markChecked, MIN_CHECK_INTERVAL_MS, checkForUpdate } from "./updater";
import { check } from "@tauri-apps/plugin-updater";

describe("updater", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("shouldCheck is true when never checked", () => {
    expect(shouldCheck()).toBe(true);
  });

  it("shouldCheck is false right after markChecked", () => {
    markChecked();
    expect(shouldCheck()).toBe(false);
  });

  it("shouldCheck is true again once the throttle interval has elapsed", () => {
    const now = Date.now();
    markChecked(now - MIN_CHECK_INTERVAL_MS - 1000);
    expect(shouldCheck(now)).toBe(true);
  });

  it("checkForUpdate returns null when the updater throws", async () => {
    vi.mocked(check).mockRejectedValue(new Error("no endpoint"));
    expect(await checkForUpdate()).toBeNull();
  });

  it("checkForUpdate returns the update when one is found", async () => {
    const fake = { version: "9.9.9" } as Awaited<ReturnType<typeof check>>;
    vi.mocked(check).mockResolvedValue(fake);
    expect(await checkForUpdate()).toBe(fake);
  });
});
