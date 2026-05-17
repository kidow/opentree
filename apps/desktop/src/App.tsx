import { useEffect, useCallback, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getVersion } from "@tauri-apps/api/app";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "./store";
import type { Config } from "./types";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./components/ui/resizable";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import Design from "./components/Design";
import Publish from "./components/Publish";
import Stats from "./components/Stats";
import Channels from "./components/Channels";
import ChatSidebar from "./components/ChatSidebar";
import PhonePreview from "./components/PhonePreview";
import PreviewControls from "./components/PreviewControls";
import { loadViewMode, VIEW_MODE_STORAGE_KEY, type ViewMode } from "./components/ViewModeToggle";
import CloseConfirmDialog from "./components/CloseConfirmDialog";
import StatusBar, { type SaveState } from "./components/StatusBar";
import SettingsModal from "./components/SettingsModal";
import FeedbackModal from "./components/FeedbackModal";
import { addRecent, getRecents, basename, type RecentProject } from "./lib/recents";
import { checkForUpdate, installAndRestart, shouldCheck, markChecked } from "./lib/updater";
import type { Update } from "@tauri-apps/plugin-updater";
import { useT } from "./i18n";
import "./App.css";

type Tab = "links" | "design" | "publish" | "stats" | "channels";

const SIDEBAR_MIN_WIDTH = 180;
const SIDEBAR_MAX_WIDTH = 320;
const PREVIEW_MIN_WIDTH = 260;
const PREVIEW_MAX_WIDTH = 640;
const CENTER_MIN_WIDTH = 320;
const CENTER_MAX_WIDTH = 980;
const CHAT_MIN_WIDTH = 280;
const CHAT_MAX_WIDTH = 480;
const AUTOSAVE_DEBOUNCE_MS = 1500;

export default function App() {
  const store = useAppStore(null);
  const t = useT();
  const [activeTab, setActiveTab] = useState<Tab>("links");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode);
  const [booting, setBooting] = useState(true);
  const [appVersion, setAppVersion] = useState("");
  const [recents, setRecents] = useState<RecentProject[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [update, setUpdate] = useState<Update | null>(null);
  const [updateInstalling, setUpdateInstalling] = useState(false);
  const dirtyRef = useRef(store.dirty);
  useEffect(() => { dirtyRef.current = store.dirty; }, [store.dirty]);

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const persist = useCallback(async (): Promise<boolean> => {
    if (!store.config || !store.projectPath) return false;
    try {
      await invoke("save_config", { path: store.projectPath, config: store.config });
      store.markSaved();
      setLastSavedAt(Date.now());
      setSaveError(null);
      setSaveState("saved");
      return true;
    } catch (e) {
      setSaveError(String(e));
      setSaveState("error");
      return false;
    }
  }, [store]);

  const loadProject = useCallback(async (path: string) => {
    let config: Config;
    try {
      config = await invoke("load_config", { path });
    } catch {
      try {
        config = await invoke("default_config");
      } catch {
        return;
      }
    }
    store.setConfig(config);
    store.setProjectPath(path);
    store.markSaved();
    setRecents(addRecent(path));
    setSaveState("idle");
    setLastSavedAt(null);
    setSaveError(null);
  }, [store]);

  // 디바운스 자동 저장
  useEffect(() => {
    if (!store.dirty || !store.config || !store.projectPath) return;
    setSaveState("saving");
    const id = window.setTimeout(() => { void persist(); }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [store.config, store.dirty, store.projectPath, persist]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "s") { e.preventDefault(); void persist(); }
      else if (e.key === ",") { e.preventDefault(); setSettingsOpen(true); }
      else if (e.key === "z" && !e.shiftKey) { e.preventDefault(); store.undo(); }
      else if ((e.key === "z" && e.shiftKey) || e.key === "y") { e.preventDefault(); store.redo(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [store.undo, store.redo, persist]);

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

  // 업데이트 감지: 시작 시 1회 + 창 포커스 시 (30분 쓰로틀)
  useEffect(() => {
    const runCheck = async (force: boolean) => {
      if (!force && !shouldCheck()) return;
      markChecked();
      const u = await checkForUpdate();
      if (u) setUpdate(u);
    };
    void runCheck(true);
    const onFocus = () => { void runCheck(false); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    void getVersion().then(setAppVersion).catch(() => setAppVersion(""));
    const list = getRecents();
    setRecents(list);
    const recentPath = list[0]?.path;
    if (!recentPath) {
      setBooting(false);
      return;
    }
    void loadProject(recentPath).finally(() => setBooting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpen = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false, title: t("statusbar.openFolder") });
    if (!selected || typeof selected !== "string") return;
    await loadProject(selected);
  }, [loadProject, t]);

  const handleSwitchProject = useCallback(async (path: string) => {
    if (store.dirty && store.config && store.projectPath) {
      try {
        await invoke("save_config", { path: store.projectPath, config: store.config });
      } catch { /* keep going — switching anyway */ }
    }
    await loadProject(path);
  }, [loadProject, store]);

  const handleExport = useCallback(async () => {
    if (!store.config) return;
    const dest = await open({ directory: true, multiple: false, title: "내보낼 폴더 선택" });
    if (!dest || typeof dest !== "string") return;
    await invoke("export_site", { config: store.config, dest, projectPath: store.projectPath });
  }, [store]);

  const handleForceClose = useCallback(async () => {
    setShowCloseConfirm(false);
    await getCurrentWindow().destroy();
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    if (!update) return;
    setUpdateInstalling(true);
    try {
      await installAndRestart(update);
    } catch {
      setUpdateInstalling(false);
    }
  }, [update]);

  if (booting) {
    return null;
  }

  const hasProject = !!store.config && !!store.projectPath;
  const projectName = store.projectPath ? basename(store.projectPath) : null;

  return (
    <div className="app-root">
      <div data-tauri-drag-region className="app-titlebar-drag" />
      <ResizablePanelGroup orientation="horizontal" className="app-layout">
        <ResizablePanel
          defaultSize={220}
          minSize={SIDEBAR_MIN_WIDTH}
          maxSize={SIDEBAR_MAX_WIDTH}
          className="app-panel app-sidebar-panel"
        >
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onExport={handleExport}
            disabled={!hasProject}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel
          minSize={CENTER_MIN_WIDTH}
          maxSize={CENTER_MAX_WIDTH}
          className="app-panel app-center-panel"
        >
          {!hasProject && (
            <div className="app-empty">
              <p className="app-empty-text">{t("empty.noProject")}</p>
              <button className="app-empty-btn" onClick={handleOpen}>
                {t("statusbar.openFolder")}
              </button>
            </div>
          )}
          {hasProject && activeTab === "links" && <Editor store={store} />}
          {hasProject && activeTab === "design" && <Design store={store} />}
          {hasProject && activeTab === "publish" && <Publish store={store} projectPath={store.projectPath!} />}
          {hasProject && activeTab === "stats" && <Stats store={store} />}
          {hasProject && activeTab === "channels" && <Channels />}
        </ResizablePanel>
        {hasProject && (
          <>
            <ResizableHandle />
            <ResizablePanel
              defaultSize={480}
              minSize={PREVIEW_MIN_WIDTH}
              maxSize={PREVIEW_MAX_WIDTH}
              className="app-panel app-preview-panel"
            >
              <div className="relative h-full min-h-0">
                <PreviewControls
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  chatOpen={chatOpen}
                  onToggleChat={() => setChatOpen((v) => !v)}
                />
                <PhonePreview config={store.config!} viewMode={viewMode} />
              </div>
            </ResizablePanel>
            {chatOpen && (
              <>
                <ResizableHandle />
                <ResizablePanel
                  defaultSize={340}
                  minSize={CHAT_MIN_WIDTH}
                  maxSize={CHAT_MAX_WIDTH}
                  className="app-panel app-chat-panel"
                >
                  <ChatSidebar store={store} />
                </ResizablePanel>
              </>
            )}
          </>
        )}
      </ResizablePanelGroup>

      <StatusBar
        appVersion={appVersion}
        projectName={projectName}
        currentPath={store.projectPath}
        recents={recents}
        saveState={saveState}
        lastSavedAt={lastSavedAt}
        saveError={saveError}
        updateVersion={update?.version ?? null}
        updateInstalling={updateInstalling}
        onSwitchProject={handleSwitchProject}
        onOpenFolder={handleOpen}
        onNewProject={handleOpen}
        onRetrySave={() => { void persist(); }}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenFeedback={() => setFeedbackOpen(true)}
        onInstallUpdate={() => { void handleInstallUpdate(); }}
      />

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        store={store}
        projectPath={store.projectPath ?? undefined}
      />
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />

      {showCloseConfirm && (
        <CloseConfirmDialog
          onConfirm={handleForceClose}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}
    </div>
  );
}
