interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CloseConfirmDialog({ onConfirm, onCancel }: Props) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog">
        <h3 className="confirm-title">저장하지 않고 닫으시겠습니까?</h3>
        <p className="confirm-desc">저장되지 않은 변경사항이 사라집니다.</p>
        <div className="confirm-actions">
          <button className="confirm-cancel" onClick={onCancel}>취소</button>
          <button className="confirm-ok" onClick={onConfirm}>닫기</button>
        </div>
      </div>
      <style>{`
        .confirm-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 200;
        }
        .confirm-dialog {
          background: var(--surface);
          border-radius: 12px;
          padding: 24px;
          width: 320px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }
        .confirm-title {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .confirm-desc {
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 20px;
        }
        .confirm-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        .confirm-cancel {
          padding: 8px 16px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }
        .confirm-cancel:hover { background: var(--bg); }
        .confirm-ok {
          padding: 8px 16px;
          background: #ef4444;
          color: white;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
        }
        .confirm-ok:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}
