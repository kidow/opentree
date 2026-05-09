interface ImportedLink {
  title: string;
  url: string;
}

interface Props {
  links: ImportedLink[];
  onAppend: () => void;
  onReplace: () => void;
  onClose: () => void;
}

export default function ImportModal({ links, onAppend, onReplace, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="import-modal">
        <div className="import-header">
          <h3>링크 가져오기</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <p className="import-desc">
          <strong>{links.length}개</strong>의 링크를 가져옵니다.
        </p>
        <ul className="import-list">
          {links.map((link, i) => (
            <li key={i} className="import-item">
              <span className="import-title">{link.title || "(제목 없음)"}</span>
              <span className="import-url">{link.url}</span>
            </li>
          ))}
        </ul>
        <div className="import-actions">
          <button className="import-btn-replace" onClick={onReplace}>
            기존 링크 대체
          </button>
          <button className="import-btn-append" onClick={onAppend}>
            기존에 추가
          </button>
        </div>
      </div>
      <style>{`
        .import-modal {
          background: var(--surface);
          border-radius: 12px;
          width: 420px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        .import-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          font-weight: 600;
          flex-shrink: 0;
        }
        .import-desc {
          padding: 12px 20px;
          font-size: 13px;
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .import-list {
          flex: 1;
          overflow-y: auto;
          padding: 0 12px;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .import-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 10px 10px;
          border-radius: 8px;
          background: var(--bg);
        }
        .import-title { font-size: 13px; font-weight: 600; }
        .import-url { font-size: 11px; color: var(--text-muted); word-break: break-all; }
        .import-actions {
          display: flex;
          gap: 8px;
          padding: 16px 20px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }
        .import-btn-replace {
          flex: 1; padding: 9px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 13px; font-weight: 500;
        }
        .import-btn-replace:hover { background: var(--bg); }
        .import-btn-append {
          flex: 1; padding: 9px;
          background: var(--accent);
          color: white;
          border-radius: 6px;
          font-size: 13px; font-weight: 600;
        }
        .import-btn-append:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}
