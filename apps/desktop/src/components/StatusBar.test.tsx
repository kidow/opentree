import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusBar, { type SaveState } from "./StatusBar";
import type { RecentProject } from "../lib/recents";

const openExternal = vi.fn().mockResolvedValue(undefined);
vi.mock("@tauri-apps/plugin-shell", () => ({ open: (...a: unknown[]) => openExternal(...a) }));

function baseProps(overrides: Partial<React.ComponentProps<typeof StatusBar>> = {}) {
  return {
    appVersion: "0.1.0",
    projectName: "my-links" as string | null,
    currentPath: "/dev/my-links" as string | null,
    recents: [] as RecentProject[],
    saveState: "idle" as SaveState,
    lastSavedAt: null as number | null,
    saveError: null as string | null,
    updateVersion: null as string | null,
    updateInstalling: false,
    onSwitchProject: vi.fn(),
    onOpenFolder: vi.fn(),
    onNewProject: vi.fn(),
    onRetrySave: vi.fn(),
    onOpenSettings: vi.fn(),
    onOpenFeedback: vi.fn(),
    onInstallUpdate: vi.fn(),
    ...overrides,
  };
}

describe("StatusBar", () => {
  beforeEach(() => openExternal.mockClear());

  it("renders project name, version, feedback and settings", () => {
    render(<StatusBar {...baseProps()} />);
    expect(screen.getByText("my-links")).toBeInTheDocument();
    expect(screen.getByText("0.1.0")).toBeInTheDocument();
    expect(screen.getByText("Feedback")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("shows the no-project label when projectName is null", () => {
    render(<StatusBar {...baseProps({ projectName: null, currentPath: null })} />);
    expect(screen.getByText("No project")).toBeInTheDocument();
  });

  it("hides the autosave status when state is idle", () => {
    render(<StatusBar {...baseProps({ saveState: "idle" })} />);
    expect(screen.queryByText("Saving...")).not.toBeInTheDocument();
  });

  it("shows saving status", () => {
    render(<StatusBar {...baseProps({ saveState: "saving" })} />);
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("shows save-failed status that triggers retry on click", () => {
    const onRetrySave = vi.fn();
    render(<StatusBar {...baseProps({ saveState: "error", saveError: "disk full", onRetrySave })} />);
    const failed = screen.getByText("Save failed");
    failed.click();
    expect(onRetrySave).toHaveBeenCalled();
  });

  it("opens release notes when version is clicked", () => {
    render(<StatusBar {...baseProps()} />);
    screen.getByText("0.1.0").click();
    expect(openExternal).toHaveBeenCalledWith("https://github.com/kidow/opentree/releases");
  });

  it("hides the Update Now button when no update is available", () => {
    render(<StatusBar {...baseProps({ updateVersion: null })} />);
    expect(screen.queryByText("Update Now")).not.toBeInTheDocument();
  });

  it("shows Update Now when an update is available and triggers install", () => {
    const onInstallUpdate = vi.fn();
    render(<StatusBar {...baseProps({ updateVersion: "0.2.0", onInstallUpdate })} />);
    const btn = screen.getByText("Update Now");
    btn.click();
    expect(onInstallUpdate).toHaveBeenCalled();
  });

  it("shows installing state and disables the update button", () => {
    render(<StatusBar {...baseProps({ updateVersion: "0.2.0", updateInstalling: true })} />);
    expect(screen.getByText("Updating...")).toBeInTheDocument();
  });

  it("invokes onOpenSettings and onOpenFeedback", () => {
    const onOpenSettings = vi.fn();
    const onOpenFeedback = vi.fn();
    render(<StatusBar {...baseProps({ onOpenSettings, onOpenFeedback })} />);
    screen.getByText("Settings").click();
    screen.getByText("Feedback").click();
    expect(onOpenSettings).toHaveBeenCalled();
    expect(onOpenFeedback).toHaveBeenCalled();
  });
});
