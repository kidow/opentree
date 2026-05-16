import { useT } from "../i18n";

type Tab = "links" | "design" | "publish" | "stats";

interface Props {
  dirty: boolean;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onSave: () => void;
  onExport: () => void;
  disabled?: boolean;
}

const TABS: Tab[] = ["links", "design", "publish", "stats"];

export default function Sidebar({ dirty, activeTab, onTabChange, onSave, onExport, disabled = false }: Props) {
  const t = useT();
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`sidebar-nav-item ${activeTab === tab ? "active" : ""}`}
            onClick={() => onTabChange(tab)}
            disabled={disabled}
          >
            {t(`tab.${tab}`)}
          </button>
        ))}
      </nav>
      <div className="sidebar-actions">
        <button className="sidebar-save-btn" onClick={onSave} disabled={disabled || !dirty}>
          {t("action.save")} {dirty ? "•" : ""}
        </button>
        <button className="sidebar-export-btn" onClick={onExport} disabled={disabled}>
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
        .sidebar-nav-item:disabled,
        .sidebar-export-btn:disabled {
          opacity: 0.35;
          cursor: default;
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
      `}</style>
    </aside>
  );
}
