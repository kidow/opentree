import { useRef } from "react";
import type { Block } from "../types";

interface Props {
  onAdd: (block: Block) => void;
  onClose: () => void;
}

function newId() {
  return crypto.randomUUID();
}

const BLOCK_TYPES = [
  { type: "link", label: "Link", desc: "URL 링크 추가" },
  { type: "heading", label: "Heading", desc: "섹션 제목" },
  { type: "text", label: "Text", desc: "텍스트 단락" },
] as const;

export default function AddBlockModal({ onAdd, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleAdd = (type: "link" | "heading" | "text") => {
    const base = { id: newId(), enabled: true };
    switch (type) {
      case "link":
        onAdd({ ...base, type: "link", title: "", url: "" });
        break;
      case "heading":
        onAdd({ ...base, type: "heading", text: "" });
        break;
      case "text":
        onAdd({ ...base, type: "text", content: "" });
        break;
    }
  };

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="modal">
        <div className="modal-header">
          <h3>블록 추가</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-list">
          {BLOCK_TYPES.map(({ type, label, desc }) => (
            <button key={type} className="modal-item" onClick={() => handleAdd(type)}>
              <span className="modal-item-label">{label}</span>
              <span className="modal-item-desc">{desc}</span>
            </button>
          ))}
        </div>
      </div>
      <style>{`
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
          z-index: 100;
        }
        .modal {
          background: var(--surface);
          border-radius: 12px;
          width: 360px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          font-weight: 600;
        }
        .modal-list { padding: 8px; display: flex; flex-direction: column; gap: 2px; }
        .modal-item {
          display: flex; flex-direction: column; align-items: flex-start;
          gap: 2px; padding: 12px 14px; border-radius: 8px; text-align: left;
          transition: background 0.1s;
        }
        .modal-item:hover { background: var(--bg); }
        .modal-item-label { font-weight: 600; font-size: 14px; }
        .modal-item-desc { font-size: 12px; color: var(--text-muted); }
      `}</style>
    </div>
  );
}
