import { useEffect, useCallback, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "./store";
import type { Config } from "./types";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import Design from "./components/Design";
import Settings from "./components/Settings";
import Publish from "./components/Publish";
import PhonePreview from "./components/PhonePreview";
import Welcome from "./components/Welcome";
import CloseConfirmDialog from "./components/CloseConfirmDialog";
import "./App.css";

type Tab = "links" | "design" | "publish" | "settings";

export default function App() {
  const store = useAppStore(null);
  const [activeTab, setActiveTab] = useState<Tab>("links");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const dirtyRef = useRef(store.dirty);
  useEffect(() => { dirtyRef.current = store.dirty; }, [store.dirty]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "s") { e.preventDefault(); handleSave(); }
      else if (e.key === "z" && !e.shiftKey) { e.preventDefault(); store.undo(); }
      else if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); store.redo(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [store.config, store.projectPath]);

  // 창 닫기 경고
  useEffect(() => {
    const win = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    win.onCloseRequested((event) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      setShowCloseConfirm(true);
    }).then((fn) => { unlisten = fn; });
    return () => unlisten?.();
  }, []);

  // Profile 편집 이벤트 수신
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as Record<string, string>;
      store.updateProfile(detail);
    };
    window.addEventListener("profile-update", handler);
    return () => window.removeEventListener("profile-update", handler);
  }, [store.updateProfile]);

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
    const dest = await open({
      directory: true,
      multiple: false,
      title: "내보낼 폴더 선택",
    });
    if (!dest || typeof dest !== "string") return;
    await invoke("export_site", { config: store.config, dest });
  }, [store]);

  const handleForceClose = useCallback(async () => {
    setShowCloseConfirm(false);
    await getCurrentWindow().destroy();
  }, []);

  if (!store.config || !store.projectPath) {
    return <Welcome onOpen={handleOpen} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        dirty={store.dirty}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSave={handleSave}
        onExport={handleExport}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        onUndo={store.undo}
        onRedo={store.redo}
      />
      {activeTab === "links" && <Editor store={store} />}
      {activeTab === "design" && <Design store={store} />}
      {activeTab === "publish" && <Publish store={store} />}
      {activeTab === "settings" && (
        <Settings store={store} projectPath={store.projectPath!} />
      )}
      <PhonePreview config={store.config} />
      {showCloseConfirm && (
        <CloseConfirmDialog
          onConfirm={handleForceClose}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}
    </div>
  );
}
