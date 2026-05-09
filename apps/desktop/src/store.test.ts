import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppStore } from "./store";
import type { Block, Config } from "./types";

function makeConfig(): Config {
  return {
    schemaVersion: 14,
    profile: { name: "Original" },
    blocks: [
      { id: "p1", type: "profile", enabled: true },
      { id: "l1", type: "link", enabled: true, title: "GitHub", url: "https://gh.example.com" },
    ],
    theme: {
      accentColor: "#000",
      backgroundColor: "#fff",
      textColor: "#111",
      buttonStyle: "outline",
      layout: "classic",
    },
    connections: [],
  };
}

describe("useAppStore", () => {
  it("setConfig replaces the config and clears history", () => {
    const { result } = renderHook(() => useAppStore(null));
    expect(result.current.config).toBeNull();

    act(() => result.current.setConfig(makeConfig()));
    expect(result.current.config?.profile.name).toBe("Original");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("updateProfile mutates and marks dirty", () => {
    const { result } = renderHook(() => useAppStore(null));
    act(() => result.current.setConfig(makeConfig()));
    act(() => result.current.updateProfile({ name: "Updated" }));
    expect(result.current.config?.profile.name).toBe("Updated");
    expect(result.current.dirty).toBe(true);
  });

  it("addBlock appends a block", () => {
    const { result } = renderHook(() => useAppStore(null));
    act(() => result.current.setConfig(makeConfig()));
    const newBlock: Block = { id: "h1", type: "heading", enabled: true, text: "New" };
    act(() => result.current.addBlock(newBlock));
    expect(result.current.config?.blocks.length).toBe(3);
    const blocks = result.current.config?.blocks ?? [];
    expect(blocks[blocks.length - 1]?.id).toBe("h1");
  });

  it("updateBlock applies a patch by id", () => {
    const { result } = renderHook(() => useAppStore(null));
    act(() => result.current.setConfig(makeConfig()));
    act(() => result.current.updateBlock("l1", { title: "GH Patched" } as Partial<Block>));
    const link = result.current.config?.blocks.find((b) => b.id === "l1");
    expect(link).toMatchObject({ id: "l1", title: "GH Patched" });
  });

  it("removeBlock drops the matching block", () => {
    const { result } = renderHook(() => useAppStore(null));
    act(() => result.current.setConfig(makeConfig()));
    act(() => result.current.removeBlock("l1"));
    expect(result.current.config?.blocks.length).toBe(1);
    expect(result.current.config?.blocks.find((b) => b.id === "l1")).toBeUndefined();
  });

  it("reorderBlocks replaces the blocks array", () => {
    const { result } = renderHook(() => useAppStore(null));
    act(() => result.current.setConfig(makeConfig()));
    const reversed = [...(result.current.config?.blocks ?? [])].reverse();
    act(() => result.current.reorderBlocks(reversed));
    expect(result.current.config?.blocks[0].id).toBe("l1");
    expect(result.current.config?.blocks[1].id).toBe("p1");
  });

  it("undo and redo travel the history stack", () => {
    const { result } = renderHook(() => useAppStore(null));
    act(() => result.current.setConfig(makeConfig()));
    act(() => result.current.updateProfile({ name: "Step 1" }));
    act(() => result.current.updateProfile({ name: "Step 2" }));

    expect(result.current.config?.profile.name).toBe("Step 2");
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.config?.profile.name).toBe("Step 1");
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.config?.profile.name).toBe("Original");

    act(() => result.current.redo());
    expect(result.current.config?.profile.name).toBe("Step 1");
  });

  it("updateSchedule sets and clears entries", () => {
    const { result } = renderHook(() => useAppStore(null));
    act(() => result.current.setConfig(makeConfig()));

    act(() => result.current.updateSchedule("l1", { publishAt: "2026-01-01T00:00:00Z" }));
    expect(result.current.config?.schedules?.l1?.publishAt).toBe("2026-01-01T00:00:00Z");

    act(() => result.current.updateSchedule("l1", null));
    expect(result.current.config?.schedules?.l1).toBeUndefined();
  });

  it("updateSchedule with empty schedule deletes entry", () => {
    const { result } = renderHook(() => useAppStore(null));
    act(() => result.current.setConfig(makeConfig()));
    act(() => result.current.updateSchedule("l1", { publishAt: "2026-01-01T00:00:00Z" }));
    act(() => result.current.updateSchedule("l1", { publishAt: undefined, unpublishAt: undefined }));
    expect(result.current.config?.schedules?.l1).toBeUndefined();
  });

  it("markSaved clears dirty flag", () => {
    const { result } = renderHook(() => useAppStore(null));
    act(() => result.current.setConfig(makeConfig()));
    act(() => result.current.updateProfile({ name: "X" }));
    expect(result.current.dirty).toBe(true);
    act(() => result.current.markSaved());
    expect(result.current.dirty).toBe(false);
  });

  it("update wholesale replaces config and pushes history", () => {
    const { result } = renderHook(() => useAppStore(null));
    act(() => result.current.setConfig(makeConfig()));
    const next: Config = { ...makeConfig(), profile: { name: "Replaced" } };
    act(() => result.current.update(next));
    expect(result.current.config?.profile.name).toBe("Replaced");
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    expect(result.current.config?.profile.name).toBe("Original");
  });
});
