interface Props {
  dirty: boolean;
  onSave: () => void;
  onExport: () => void;
}

export default function Sidebar({ dirty, onSave, onExport }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-text">Opentree</span>
        {dirty && <span className="dirty-dot" title="저장되지 않은 변경사항" />}
      </div>
      <nav className="sidebar-nav">
        <button className="sidebar-nav-item active">Links</button>
      </nav>
      <div className="sidebar-actions">
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
        .sidebar-nav { flex: 1; }
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
