import { useState, useCallback, useRef } from "react";
import type { Block, Config, Profile, Schedule, Theme } from "./types";

const MAX_HISTORY = 50;

export function useAppStore(initial: Config | null) {
  const [config, setConfig] = useState<Config | null>(initial);
  const [dirty, setDirty] = useState(false);
  const [projectPath, setProjectPath] = useState<string | null>(null);

  // History stacks stored in refs to avoid re-renders
  const historyRef = useRef<Config[]>([]);
  const futureRef = useRef<Config[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncUndoRedo = useCallback(() => {
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  // Push current config to history before mutation
  const pushHistory = useCallback((current: Config) => {
    historyRef.current = [...historyRef.current.slice(-MAX_HISTORY + 1), current];
    futureRef.current = [];
    syncUndoRedo();
  }, [syncUndoRedo]);

  const mutate = useCallback((fn: (c: Config) => Config) => {
    setConfig((c) => {
      if (!c) return c;
      pushHistory(c);
      return fn(c);
    });
    setDirty(true);
  }, [pushHistory]);

  const update = useCallback((next: Config) => {
    setConfig((c) => { if (c) pushHistory(c); return next; });
    setDirty(true);
  }, [pushHistory]);

  const updateProfile = useCallback((profile: Partial<Profile>) => {
    mutate((c) => ({ ...c, profile: { ...c.profile, ...profile } }));
  }, [mutate]);

  const updateTheme = useCallback((theme: Partial<Theme>) => {
    mutate((c) => ({ ...c, theme: { ...c.theme, ...theme } }));
  }, [mutate]);

  const addBlock = useCallback((block: Block) => {
    mutate((c) => ({ ...c, blocks: [...c.blocks, block] }));
  }, [mutate]);

  const updateBlock = useCallback((id: string, patch: Partial<Block>) => {
    mutate((c) => ({
      ...c,
      blocks: c.blocks.map((b) => b.id === id ? ({ ...b, ...patch } as Block) : b),
    }));
  }, [mutate]);

  const removeBlock = useCallback((id: string) => {
    mutate((c) => ({ ...c, blocks: c.blocks.filter((b) => b.id !== id) }));
  }, [mutate]);

  const reorderBlocks = useCallback((blocks: Block[]) => {
    mutate((c) => ({ ...c, blocks }));
  }, [mutate]);

  const updateSchedule = useCallback((blockId: string, schedule: Schedule | null) => {
    mutate((c) => {
      const next = { ...(c.schedules ?? {}) };
      if (!schedule || (!schedule.publishAt && !schedule.unpublishAt)) {
        delete next[blockId];
      } else {
        next[blockId] = schedule;
      }
      return { ...c, schedules: next };
    });
  }, [mutate]);

  const undo = useCallback(() => {
    setConfig((c) => {
      const prev = historyRef.current.pop();
      if (!prev) return c;
      if (c) futureRef.current.push(c);
      syncUndoRedo();
      return prev;
    });
    setDirty(true);
  }, [syncUndoRedo]);

  const redo = useCallback(() => {
    setConfig((c) => {
      const next = futureRef.current.pop();
      if (!next) return c;
      if (c) historyRef.current.push(c);
      syncUndoRedo();
      return next;
    });
    setDirty(true);
  }, [syncUndoRedo]);

  const markSaved = useCallback(() => setDirty(false), []);

  const setConfigExternal = useCallback((c: Config | null) => {
    historyRef.current = [];
    futureRef.current = [];
    syncUndoRedo();
    setConfig(c);
  }, [syncUndoRedo]);

  return {
    config,
    dirty,
    projectPath,
    canUndo,
    canRedo,
    setProjectPath,
    update,
    updateProfile,
    updateTheme,
    addBlock,
    updateBlock,
    removeBlock,
    reorderBlocks,
    updateSchedule,
    undo,
    redo,
    markSaved,
    setConfig: setConfigExternal,
  };
}
