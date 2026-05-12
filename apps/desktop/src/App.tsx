import { useEffect, useCallback, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "./store";
import type { Config } from "./types";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./components/ui/resizable";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import Design from "./components/Design";
import Settings from "./components/Settings";
import Publish from "./components/Publish";
import Stats from "./components/Stats";
import ChatSidebar from "./components/ChatSidebar";
import PhonePreview from "./components/PhonePreview";
import Welcome from "./components/Welcome";
import CloseConfirmDialog from "./components/CloseConfirmDialog";
import "./App.css";

type Tab = "links" | "design" | "publish" | "settings" | "stats";

const SIDEBAR_MIN_WIDTH = 180;
const SIDEBAR_MAX_WIDTH = 320;
const PREVIEW_MIN_WIDTH = 260;
const PREVIEW_MAX_WIDTH = 640;
const CENTER_MIN_WIDTH = 320;
const CENTER_MAX_WIDTH = 980;
const RECENT_PROJECT_PATH_KEY = "opentree.recentProjectPath";

export default function App() {
  const store = useAppStore(null);
  const [activeTab, setActiveTab] = useState<Tab>("links");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [booting, setBooting] = useState(true);
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

  useEffect(() => {
    const loadRecentProject = async () => {
      const recentPath = window.localStorage.getItem(RECENT_PROJECT_PATH_KEY);
      if (!recentPath) {
        setBooting(false);
        return;
      }

      try {
        const config: Config = await invoke("load_config", { path: recentPath });
        store.setConfig(config);
        store.setProjectPath(recentPath);
        store.markSaved();
      } catch {
        try {
          const config: Config = await invoke("default_config");
          store.setConfig(config);
          store.setProjectPath(recentPath);
          store.markSaved();
        } catch {
          window.localStorage.removeItem(RECENT_PROJECT_PATH_KEY);
        }
      } finally {
        setBooting(false);
      }
    };

    void loadRecentProject();
  }, [store.markSaved, store.setConfig, store.setProjectPath]);

  const setRecentProjectPath = useCallback((path: string) => {
    window.localStorage.setItem(RECENT_PROJECT_PATH_KEY, path);
  }, []);

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
      setRecentProjectPath(selected);
      store.markSaved();
    } catch {
      const config: Config = await invoke("default_config");
      store.setConfig(config);
      store.setProjectPath(selected);
      setRecentProjectPath(selected);
      store.markSaved();
    }
  }, [setRecentProjectPath, store.markSaved, store.setConfig, store.setProjectPath]);

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
    await invoke("export_site", { config: store.config, dest, projectPath: store.projectPath });
  }, [store]);

  const handleForceClose = useCallback(async () => {
    setShowCloseConfirm(false);
    await getCurrentWindow().destroy();
  }, []);

  if (booting) {
    return null;
  }

  if (!store.config || !store.projectPath) {
    return <Welcome onOpen={handleOpen} />;
  }

  return (
    <>
      <ResizablePanelGroup orientation="horizontal" className="app-layout">
        <ResizablePanel
          defaultSize={220}
          minSize={SIDEBAR_MIN_WIDTH}
          maxSize={SIDEBAR_MAX_WIDTH}
          className="app-panel app-sidebar-panel"
        >
          <Sidebar
            dirty={store.dirty}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onSave={handleSave}
            onExport={handleExport}
            chatOpen={chatOpen}
            onToggleChat={() => setChatOpen((v) => !v)}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel
          minSize={CENTER_MIN_WIDTH}
          maxSize={CENTER_MAX_WIDTH}
          className="app-panel app-center-panel"
        >
          {activeTab === "links" && <Editor store={store} />}
          {activeTab === "design" && <Design store={store} />}
          {activeTab === "publish" && <Publish store={store} projectPath={store.projectPath!} />}
          {activeTab === "stats" && <Stats store={store} />}
          {activeTab === "settings" && (
            <Settings store={store} projectPath={store.projectPath!} />
          )}
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel
          defaultSize={480}
          minSize={PREVIEW_MIN_WIDTH}
          maxSize={PREVIEW_MAX_WIDTH}
          className="app-panel app-preview-panel"
        >
          {chatOpen ? <ChatSidebar store={store} /> : <PhonePreview config={store.config} />}
        </ResizablePanel>
      </ResizablePanelGroup>
      {showCloseConfirm && (
        <CloseConfirmDialog
          onConfirm={handleForceClose}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}
    </>
  );
}
