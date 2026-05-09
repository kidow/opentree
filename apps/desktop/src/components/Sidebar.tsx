type Tab = "links" | "design" | "settings" | "publish" | "stats";

interface Props {
  dirty: boolean;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onSave: () => void;
  onExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
}

export default function Sidebar({ dirty, activeTab, onTabChange, onSave, onExport, canUndo, canRedo, onUndo, onRedo, chatOpen, onToggleChat }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-text">Opentree</span>
        {dirty && <span className="dirty-dot" title="저장되지 않은 변경사항" />}
      </div>
      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav-item ${activeTab === "links" ? "active" : ""}`}
          onClick={() => onTabChange("links")}
        >
          Links
        </button>
        <button
          className={`sidebar-nav-item ${activeTab === "design" ? "active" : ""}`}
          onClick={() => onTabChange("design")}
        >
          Design
        </button>
        <button
          className={`sidebar-nav-item ${activeTab === "publish" ? "active" : ""}`}
          onClick={() => onTabChange("publish")}
        >
          Publish
        </button>
        <button
          className={`sidebar-nav-item ${activeTab === "stats" ? "active" : ""}`}
          onClick={() => onTabChange("stats")}
        >
          Stats
        </button>
        <button
          className={`sidebar-nav-item ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => onTabChange("settings")}
        >
          Settings
        </button>
      </nav>
      <div className="sidebar-actions">
        <button
          className={`sidebar-chat-btn${chatOpen ? " active" : ""}`}
          onClick={onToggleChat}
          title="AI Chat 토글"
        >
          {chatOpen ? "✕ Chat 닫기" : "✨ AI Chat"}
        </button>
        <div className="undo-redo-row">
          <button className="undo-redo-btn" onClick={onUndo} disabled={!canUndo} title="실행 취소 (⌘Z)">↩</button>
          <button className="undo-redo-btn" onClick={onRedo} disabled={!canRedo} title="다시 실행 (⌘⇧Z)">↪</button>
        </div>
        <button className="sidebar-save-btn" onClick={onSave} disabled={!dirty}>
          저장 {dirty ? "•" : ""}
        </button>
        <button className="sidebar-export-btn" onClick={onExport}>
          내보내기
        </button>
      </div>
      <style>{`
        .sidebar {
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border);
          background: var(--surface);
          padding: 16px 12px;
          gap: 8px;
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px 12px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 4px;
        }
        .sidebar-logo-text {
          font-weight: 700;
          font-size: 15px;
          letter-spacing: -0.02em;
        }
        .dirty-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #f59e0b;
          display: inline-block;
        }
        .sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 2px; }
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
        .undo-redo-row {
          display: flex; gap: 4px;
        }
        .undo-redo-btn {
          flex: 1; padding: 6px;
          border-radius: 6px;
          font-size: 15px;
          border: 1px solid var(--border);
          color: var(--text);
          transition: background 0.1s;
        }
        .undo-redo-btn:hover:not(:disabled) { background: var(--bg); }
        .undo-redo-btn:disabled { opacity: 0.3; cursor: default; }
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
