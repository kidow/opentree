import { useState, useCallback } from "react";
import type { Block, Config, Profile, Theme } from "./types";

export function useAppStore(initial: Config | null) {
  const [config, setConfig] = useState<Config | null>(initial);
  const [dirty, setDirty] = useState(false);
  const [projectPath, setProjectPath] = useState<string | null>(null);

  const update = useCallback((next: Config) => {
    setConfig(next);
    setDirty(true);
  }, []);

  const updateProfile = useCallback((profile: Partial<Profile>) => {
    setConfig((c) => {
      if (!c) return c;
      return { ...c, profile: { ...c.profile, ...profile } };
    });
    setDirty(true);
  }, []);

  const updateTheme = useCallback((theme: Partial<Theme>) => {
    setConfig((c) => {
      if (!c) return c;
      return { ...c, theme: { ...c.theme, ...theme } };
    });
    setDirty(true);
  }, []);

  const addBlock = useCallback((block: Block) => {
    setConfig((c) => {
      if (!c) return c;
      return { ...c, blocks: [...c.blocks, block] };
    });
    setDirty(true);
  }, []);

  const updateBlock = useCallback((id: string, patch: Partial<Block>) => {
    setConfig((c) => {
      if (!c) return c;
      return {
        ...c,
        blocks: c.blocks.map((b) =>
          b.id === id ? ({ ...b, ...patch } as Block) : b
        ),
      };
    });
    setDirty(true);
  }, []);

  const removeBlock = useCallback((id: string) => {
    setConfig((c) => {
      if (!c) return c;
      return { ...c, blocks: c.blocks.filter((b) => b.id !== id) };
    });
    setDirty(true);
  }, []);

  const reorderBlocks = useCallback((blocks: Block[]) => {
    setConfig((c) => {
      if (!c) return c;
      return { ...c, blocks };
    });
    setDirty(true);
  }, []);

  const markSaved = useCallback(() => setDirty(false), []);

  return {
    config,
    dirty,
    projectPath,
    setProjectPath,
    update,
    updateProfile,
    updateTheme,
    addBlock,
    updateBlock,
    removeBlock,
    reorderBlocks,
    markSaved,
    setConfig,
  };
}
