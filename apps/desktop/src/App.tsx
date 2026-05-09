import { useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "./store";
import type { Config } from "./types";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import PhonePreview from "./components/PhonePreview";
import Welcome from "./components/Welcome";
import "./App.css";

export default function App() {
  const store = useAppStore(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [store.config, store.projectPath]);

  const handleOpen = useCallback(async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "프로젝트 폴더 선택",
    });
    if (!selected || typeof selected !== "string") return;

    try {
      const config: Config = await invoke("load_config", { path: selected });
      store.setConfig(config);
      store.setProjectPath(selected);
      store.markSaved();
    } catch {
      const config: Config = await invoke("default_config");
      store.setConfig(config);
      store.setProjectPath(selected);
      store.markSaved();
    }
  }, [store]);

  const handleSave = useCallback(async () => {
    if (!store.config || !store.projectPath) return;
    await invoke("save_config", {
      path: store.projectPath,
      config: store.config,
    });
    store.markSaved();
  }, [store]);

  const handleExport = useCallback(async () => {
    if (!store.config) return;
    const dest = await save({ title: "내보낼 폴더 선택" });
    if (!dest) return;
    await invoke("export_site", { config: store.config, dest });
  }, [store]);

  if (!store.config || !store.projectPath) {
    return <Welcome onOpen={handleOpen} />;
  }

  return (
    <div className="app-layout">
      <Sidebar dirty={store.dirty} onSave={handleSave} onExport={handleExport} />
      <Editor store={store} />
      <PhonePreview config={store.config} />
    </div>
  );
}
