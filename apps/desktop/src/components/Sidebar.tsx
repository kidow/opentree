import { useT } from "../i18n";

type Tab = "links" | "design" | "settings" | "publish" | "stats";

interface Props {
  dirty: boolean;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onSave: () => void;
  onExport: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
}

export default function Sidebar({ dirty, activeTab, onTabChange, onSave, onExport, chatOpen, onToggleChat }: Props) {
  const t = useT();
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav-item ${activeTab === "links" ? "active" : ""}`}
          onClick={() => onTabChange("links")}
        >
          {t("tab.links")}
        </button>
        <button
          className={`sidebar-nav-item ${activeTab === "design" ? "active" : ""}`}
          onClick={() => onTabChange("design")}
        >
          {t("tab.design")}
        </button>
        <button
          className={`sidebar-nav-item ${activeTab === "publish" ? "active" : ""}`}
          onClick={() => onTabChange("publish")}
        >
          {t("tab.publish")}
        </button>
        <button
          className={`sidebar-nav-item ${activeTab === "stats" ? "active" : ""}`}
          onClick={() => onTabChange("stats")}
        >
          {t("tab.stats")}
        </button>
        <button
          className={`sidebar-nav-item ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => onTabChange("settings")}
        >
          {t("tab.settings")}
        </button>
      </nav>
      <div className="sidebar-actions">
        <button
          className={`sidebar-chat-btn${chatOpen ? " active" : ""}`}
          onClick={onToggleChat}
          title="AI Chat"
        >
          {chatOpen ? t("action.closeChat") : t("action.aiChat")}
        </button>
        <button className="sidebar-save-btn" onClick={onSave} disabled={!dirty}>
          {t("action.save")} {dirty ? "•" : ""}
        </button>
        <button className="sidebar-export-btn" onClick={onExport}>
          {t("action.export")}
        </button>
      </div>
      <style>{`
        .sidebar {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          background: var(--surface);
          padding: 52px 12px 16px;
          gap: 8px;
        }
        .sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 2px; min-height: 0; }
        .sidebar-nav-item {
          width: 100%;
          text-align: left;
          padding: 8px 10px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
        }
        .sidebar-nav-item.active {
          background: var(--bg);
          color: var(--text);
          font-weight: 600;
        }
        .sidebar-actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sidebar-save-btn {
          padding: 8px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          background: var(--accent);
          color: white;
          transition: opacity 0.15s;
        }
        .sidebar-save-btn:disabled {
          opacity: 0.35;
          cursor: default;
        }
        .sidebar-export-btn {
          padding: 8px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid var(--border);
          color: var(--text);
        }
        .sidebar-export-btn:hover { background: var(--bg); }
        .sidebar-chat-btn {
          padding: 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid var(--border);
          color: var(--text);
          background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(59,130,246,0.08));
        }
        .sidebar-chat-btn:hover { background: linear-gradient(135deg, rgba(168,85,247,0.16), rgba(59,130,246,0.16)); }
        .sidebar-chat-btn.active { background: var(--accent); color: white; border-color: var(--accent); }
      `}</style>
    </aside>
  );
}
