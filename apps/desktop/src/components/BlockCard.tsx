import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Block, Profile } from "../types";

interface Props {
  block: Block;
  profile: Profile;
  onUpdate: (patch: Partial<Block>) => void;
  onRemove?: () => void;
  onToggle: () => void;
}

export default function BlockCard({ block, profile, onUpdate, onRemove, onToggle }: Props) {
  const [editing, setEditing] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id, disabled: block.type === "profile" });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`block-card ${!block.enabled ? "block-disabled" : ""}`}
    >
      <div className="block-drag-handle" {...(block.type !== "profile" ? { ...attributes, ...listeners } : {})}>
        {block.type !== "profile" && <span className="drag-icon">⠿</span>}
      </div>
      <div className="block-body" onClick={() => setEditing(!editing)}>
        <BlockLabel block={block} profile={profile} />
      </div>
      <div className="block-actions">
        <button
          className={`toggle-btn ${block.enabled ? "on" : "off"}`}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          title={block.enabled ? "비활성화" : "활성화"}
        >
          <span className="toggle-thumb" />
        </button>
        {onRemove && (
          <button className="remove-btn" onClick={(e) => { e.stopPropagation(); onRemove(); }} title="삭제">
            ✕
          </button>
        )}
      </div>
      {editing && <BlockEditor block={block} profile={profile} onUpdate={onUpdate} />}
      <style>{`
        .block-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
        }
        .block-card > :first-child, .block-body, .block-actions {
          display: flex;
        }
        .block-card { display: flex; align-items: center; gap: 0; }
        .block-drag-handle {
          padding: 16px 8px 16px 12px;
          color: var(--text-muted);
          cursor: grab;
          width: 32px;
          justify-content: center;
        }
        .drag-icon { font-size: 16px; user-select: none; }
        .block-body { flex: 1; padding: 14px 8px; flex-direction: column; gap: 2px; cursor: pointer; }
        .block-disabled { opacity: 0.45; }
        .block-actions { padding: 12px 12px 12px 0; align-items: center; gap: 8px; }
        .toggle-btn {
          width: 36px; height: 20px; border-radius: 10px; padding: 2px;
          background: var(--border); transition: background 0.2s; position: relative;
        }
        .toggle-btn.on { background: #22c55e; }
        .toggle-thumb {
          display: block; width: 16px; height: 16px; border-radius: 50%;
          background: white; transition: transform 0.2s; position: absolute;
          top: 2px; left: 2px;
        }
        .toggle-btn.on .toggle-thumb { transform: translateX(16px); }
        .remove-btn { color: var(--text-muted); font-size: 12px; padding: 4px; }
        .remove-btn:hover { color: #ef4444; }
        .block-type-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .block-value { font-size: 14px; font-weight: 500; }
        .block-url { font-size: 12px; color: var(--text-muted); }
        .block-edit-form { padding: 0 12px 14px 32px; display: flex; flex-direction: column; gap: 8px; width: 100%; }
        .block-edit-form input, .block-edit-form textarea { font-size: 13px; }
        .block-edit-label { font-size: 11px; color: var(--text-muted); margin-bottom: 2px; }
      `}</style>
    </div>
  );
}

function BlockLabel({ block, profile }: { block: Block; profile: Profile }) {
  switch (block.type) {
    case "profile":
      return (
        <>
          <span className="block-type-label">Profile</span>
          <span className="block-value">{profile.name || "(이름 없음)"}</span>
          {profile.bio && <span className="block-url">{profile.bio}</span>}
        </>
      );
    case "link":
      return (
        <>
          <span className="block-type-label">Link</span>
          <span className="block-value">{block.title || "(제목 없음)"}</span>
          <span className="block-url">{block.url}</span>
        </>
      );
    case "heading":
      return (
        <>
          <span className="block-type-label">Heading</span>
          <span className="block-value">{block.text || "(텍스트 없음)"}</span>
        </>
      );
    case "text":
      return (
        <>
          <span className="block-type-label">Text</span>
          <span className="block-value">{block.content || "(내용 없음)"}</span>
        </>
      );
  }
}

function BlockEditor({ block, profile, onUpdate }: { block: Block; profile: Profile; onUpdate: (p: Partial<Block>) => void }) {
  switch (block.type) {
    case "profile":
      return (
        <div className="block-edit-form">
          <div>
            <div className="block-edit-label">이름</div>
            <input
              defaultValue={profile.name}
              placeholder="이름"
              onChange={(e) => onUpdate({ } as Partial<Block>)}
              onBlur={(e) => {
                // profile fields are edited via updateProfile in parent
                // dispatch via custom event for simplicity
                window.dispatchEvent(new CustomEvent("profile-update", { detail: { name: e.target.value } }));
              }}
            />
          </div>
          <div>
            <div className="block-edit-label">Bio</div>
            <input
              defaultValue={profile.bio ?? ""}
              placeholder="한 줄 소개"
              onBlur={(e) => window.dispatchEvent(new CustomEvent("profile-update", { detail: { bio: e.target.value } }))}
            />
          </div>
          <div>
            <div className="block-edit-label">아바타 URL</div>
            <input
              defaultValue={profile.avatarUrl ?? ""}
              placeholder="https://..."
              onBlur={(e) => window.dispatchEvent(new CustomEvent("profile-update", { detail: { avatarUrl: e.target.value } }))}
            />
          </div>
        </div>
      );
    case "link":
      return (
        <div className="block-edit-form">
          <div>
            <div className="block-edit-label">제목</div>
            <input
              defaultValue={block.title}
              placeholder="링크 제목"
              onBlur={(e) => onUpdate({ title: e.target.value } as Partial<Block>)}
            />
          </div>
          <div>
            <div className="block-edit-label">URL</div>
            <input
              defaultValue={block.url}
              placeholder="https://..."
              onBlur={(e) => onUpdate({ url: e.target.value } as Partial<Block>)}
            />
          </div>
        </div>
      );
    case "heading":
      return (
        <div className="block-edit-form">
          <div>
            <div className="block-edit-label">텍스트</div>
            <input
              defaultValue={block.text}
              placeholder="헤딩 텍스트"
              onBlur={(e) => onUpdate({ text: e.target.value } as Partial<Block>)}
            />
          </div>
        </div>
      );
    case "text":
      return (
        <div className="block-edit-form">
          <div>
            <div className="block-edit-label">내용</div>
            <textarea
              defaultValue={block.content}
              placeholder="내용"
              rows={3}
              onBlur={(e) => onUpdate({ content: e.target.value } as Partial<Block>)}
            />
          </div>
        </div>
      );
  }
}
