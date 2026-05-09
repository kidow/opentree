import { useRef } from "react";
import type { Block } from "../types";

interface Props {
  onAdd: (block: Block) => void;
  onClose: () => void;
}

function newId() {
  return crypto.randomUUID();
}

type BlockType =
  | "link" | "heading" | "text" | "socials"
  | "image" | "footer" | "affiliate" | "sponsored" | "custom-html"
  | "music" | "video" | "pinterest" | "collection"
  | "form" | "email";

const BLOCK_TYPES: { type: BlockType; label: string; desc: string }[] = [
  { type: "link", label: "Link", desc: "URL 링크 추가" },
  { type: "heading", label: "Heading", desc: "섹션 제목" },
  { type: "text", label: "Text", desc: "텍스트 단락" },
  { type: "socials", label: "Socials", desc: "소셜 미디어 링크 모음" },
  { type: "image", label: "Image", desc: "이미지 블록" },
  { type: "music", label: "Music", desc: "Spotify / Apple Music / SoundCloud" },
  { type: "video", label: "Video", desc: "YouTube / Vimeo 임베드" },
  { type: "pinterest", label: "Pinterest", desc: "Pinterest 핀/보드 임베드" },
  { type: "collection", label: "Collection", desc: "여러 링크/이미지를 그리드/캐러셀로" },
  { type: "form", label: "Form", desc: "Formspree 컨택트 폼" },
  { type: "email", label: "Email Signup", desc: "ConvertKit/Kit 뉴스레터 가입 폼" },
  { type: "footer", label: "Footer", desc: "페이지 하단 푸터" },
  { type: "affiliate", label: "Affiliate", desc: "제휴 링크 (UTM 지원)" },
  { type: "sponsored", label: "Sponsored", desc: "스폰서 링크" },
  { type: "custom-html", label: "Custom HTML", desc: "직접 HTML 삽입" },
];

export default function AddBlockModal({ onAdd, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleAdd = (type: BlockType) => {
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
      case "socials":
        onAdd({ ...base, type: "socials", items: [] });
        break;
      case "image":
        onAdd({ ...base, type: "image", assetPath: "", alt: "" });
        break;
      case "footer":
        onAdd({ ...base, type: "footer", text: "", links: [] });
        break;
      case "affiliate":
        onAdd({ ...base, type: "affiliate", title: "", url: "" });
        break;
      case "sponsored":
        onAdd({ ...base, type: "sponsored", title: "", url: "" });
        break;
      case "custom-html":
        onAdd({ ...base, type: "custom-html", html: "" });
        break;
      case "music":
        onAdd({ ...base, type: "music", url: "" });
        break;
      case "video":
        onAdd({ ...base, type: "video", url: "" });
        break;
      case "pinterest":
        onAdd({ ...base, type: "pinterest", url: "" });
        break;
      case "collection":
        onAdd({ ...base, type: "collection", layout: "grid", children: [] });
        break;
      case "form":
        onAdd({
          ...base,
          type: "form",
          formspreeId: "",
          title: "",
          submitLabel: "Send",
          fields: [
            { name: "email", label: "이메일", fieldType: "email", required: true },
            { name: "message", label: "메시지", fieldType: "textarea", required: true },
          ],
        });
        break;
      case "email":
        onAdd({
          ...base,
          type: "email",
          convertkitFormId: "",
          title: "",
          submitLabel: "Subscribe",
          placeholder: "you@example.com",
        });
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
        .modal-list { padding: 8px; display: flex; flex-direction: column; gap: 2px; max-height: 480px; overflow-y: auto; }
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
