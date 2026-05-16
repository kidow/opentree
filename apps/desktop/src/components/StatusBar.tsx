import { useEffect, useState } from "react";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronUp, Check, FolderOpen, Plus, Settings as SettingsIcon, RefreshCw, AlertCircle, Package, MessageSquare, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useT, getLang } from "../i18n";
import type { RecentProject } from "../lib/recents";

const RELEASES_URL = "https://github.com/kidow/opentree/releases";

export type SaveState = "idle" | "saving" | "saved" | "error";

interface Props {
  appVersion: string;
  projectName: string | null;
  currentPath: string | null;
  recents: RecentProject[];
  saveState: SaveState;
  lastSavedAt: number | null;
  saveError: string | null;
  updateVersion: string | null;
  updateInstalling: boolean;
  onSwitchProject: (path: string) => void;
  onOpenFolder: () => void;
  onNewProject: () => void;
  onRetrySave: () => void;
  onOpenSettings: () => void;
  onOpenFeedback: () => void;
  onInstallUpdate: () => void;
}

function relativeSaved(ts: number, now: number): string {
  const mins = Math.floor((now - ts) / 60000);
  const ko = getLang() === "ko";
  if (mins < 1) return ko ? "방금 저장됨" : "Saved just now";
  if (mins < 60) return ko ? `${mins}분 전 저장` : `Saved ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return ko ? `${hrs}시간 전 저장` : `Saved ${hrs}h ago`;
}

export default function StatusBar({
  appVersion,
  projectName,
  currentPath,
  recents,
  saveState,
  lastSavedAt,
  saveError,
  updateVersion,
  updateInstalling,
  onSwitchProject,
  onOpenFolder,
  onNewProject,
  onRetrySave,
  onOpenSettings,
  onOpenFeedback,
  onInstallUpdate,
}: Props) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 20000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <footer className="status-bar">
        <div className="status-bar-group">
          {/* Project name dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="status-bar-item status-bar-project" title={currentPath ?? undefined}>
                <FolderOpen size={13} />
                <span>{projectName ?? t("statusbar.noProject")}</span>
                <ChevronUp size={12} className="status-bar-chevron" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="status-menu" side="top" align="start" sideOffset={6}>
                {recents.length > 0 && (
                  <>
                    <DropdownMenu.Label className="status-menu-label">
                      {t("statusbar.recent")}
                    </DropdownMenu.Label>
                    {recents.map((r) => (
                      <DropdownMenu.Item
                        key={r.path}
                        className="status-menu-item"
                        onSelect={() => {
                          if (r.path !== currentPath) onSwitchProject(r.path);
                        }}
                      >
                        <span className="status-menu-check">
                          {r.path === currentPath ? <Check size={13} /> : null}
                        </span>
                        <span className="status-menu-name">{r.name}</span>
                        <span className="status-menu-path">{r.path}</span>
                      </DropdownMenu.Item>
                    ))}
                    <DropdownMenu.Separator className="status-menu-sep" />
                  </>
                )}
                <DropdownMenu.Item className="status-menu-item status-menu-accent" onSelect={onNewProject}>
                  <Plus size={13} />
                  <span>{t("statusbar.newProject")}</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item className="status-menu-item" onSelect={onOpenFolder}>
                  <FolderOpen size={13} />
                  <span>{t("statusbar.openFolder")}</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Version */}
          <button
            className="status-bar-item"
            onClick={() => { void openExternal(RELEASES_URL); }}
            title={t("statusbar.versionTooltip")}
          >
            <Package size={13} />
            <span>{appVersion}</span>
          </button>

          {/* Autosave status */}
          {currentPath && saveState !== "idle" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`status-bar-item${saveState === "error" ? " status-bar-error" : ""}`}
                  onClick={saveState === "error" ? onRetrySave : undefined}
                >
                  {saveState === "saving" && <RefreshCw size={13} className="status-bar-spin" />}
                  {saveState === "saved" && <Check size={13} />}
                  {saveState === "error" && <AlertCircle size={13} />}
                  <span>
                    {saveState === "saving" && t("save.saving")}
                    {saveState === "saved" && lastSavedAt != null && relativeSaved(lastSavedAt, now)}
                    {saveState === "error" && t("save.failed")}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {saveState === "error"
                  ? saveError ?? t("save.failed")
                  : t("save.tooltipSaveNow")}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="status-bar-group">
          {updateVersion && (
            <button
              className="status-bar-update"
              onClick={onInstallUpdate}
              disabled={updateInstalling}
              title={`v${updateVersion}`}
            >
              <Download size={13} />
              <span>{updateInstalling ? t("update.installing") : t("update.available")}</span>
            </button>
          )}
          <button className="status-bar-item" onClick={onOpenFeedback}>
            <MessageSquare size={13} />
            <span>{t("statusbar.feedback")}</span>
          </button>
          <button className="status-bar-item" onClick={onOpenSettings} title={t("settings.shortcutHint")}>
            <SettingsIcon size={13} />
            <span>{t("settings.title")}</span>
          </button>
        </div>
      </footer>

      <style>{`
        .status-bar {
          height: 28px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px;
          background: var(--surface);
          border-top: 1px solid var(--border);
          font-size: 12px;
          user-select: none;
        }
        .status-bar-group { display: flex; align-items: center; gap: 2px; }
        .status-bar-item {
          display: flex;
          align-items: center;
          gap: 5px;
          height: 22px;
          padding: 0 8px;
          border-radius: 5px;
          color: var(--text-muted);
          background: none;
          border: 0;
          cursor: pointer;
          white-space: nowrap;
        }
        .status-bar-item:hover { background: var(--bg); color: var(--text); }
        .status-bar-project { font-weight: 500; }
        .status-bar-chevron { opacity: 0.6; }
        .status-bar-error { color: #dc2626; }
        .status-bar-error:hover { color: #dc2626; background: #fef2f2; }
        .status-bar-update {
          display: flex;
          align-items: center;
          gap: 5px;
          height: 22px;
          padding: 0 10px;
          margin-right: 2px;
          border-radius: 5px;
          border: 0;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          color: var(--brand-green-fg);
          background: var(--brand-green);
          white-space: nowrap;
        }
        .status-bar-update:hover { background: var(--brand-green-dark); }
        .status-bar-update:disabled { opacity: 0.5; cursor: default; }
        .status-bar-spin { animation: status-spin 1s linear infinite; }
        @keyframes status-spin { to { transform: rotate(360deg); } }
        .status-menu {
          min-width: 240px;
          max-width: 420px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 4px;
          box-shadow: 0 8px 28px rgba(0,0,0,0.16);
          z-index: 60;
        }
        .status-menu-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          padding: 6px 8px 2px;
        }
        .status-menu-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          border-radius: 5px;
          font-size: 13px;
          color: var(--text);
          cursor: pointer;
          outline: none;
        }
        .status-menu-item[data-highlighted] { background: var(--bg); }
        .status-menu-accent { color: var(--accent); font-weight: 600; }
        .status-menu-check { width: 13px; display: inline-flex; flex-shrink: 0; }
        .status-menu-name { flex-shrink: 0; }
        .status-menu-path {
          flex: 1;
          font-size: 11px;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: right;
        }
        .status-menu-sep { height: 1px; background: var(--border); margin: 4px 0; }
      `}</style>
    </TooltipProvider>
  );
}
