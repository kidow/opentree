import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Block, Profile } from "../types";

interface Props {
  block: Block;
  profile: Profile;
  projectPath: string;
  onUpdate: (patch: Partial<Block>) => void;
  onRemove?: () => void;
  onToggle: () => void;
}

export default function BlockCard({ block, profile, projectPath, onUpdate, onRemove, onToggle }: Props) {
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
      {editing && <BlockEditor block={block} profile={profile} projectPath={projectPath} onUpdate={onUpdate} />}
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
        .block-add-item-btn { font-size: 12px; color: var(--accent); padding: 4px 0; text-align: left; }
        .block-file-btn { font-size: 12px; padding: 6px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text); }
        .block-file-btn:hover { background: var(--surface); }
        .block-row { display: flex; gap: 6px; align-items: center; }
        .block-row input { flex: 1; }
        .block-row-del { color: #ef4444; font-size: 12px; padding: 4px; flex-shrink: 0; }
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
    case "socials":
      return (
        <>
          <span className="block-type-label">Socials</span>
          <span className="block-value">{block.items.length}개 소셜 링크</span>
        </>
      );
    case "image":
      return (
        <>
          <span className="block-type-label">Image</span>
          <span className="block-value">{block.alt || "(alt 없음)"}</span>
          {block.assetPath && <span className="block-url">{block.assetPath}</span>}
        </>
      );
    case "footer":
      return (
        <>
          <span className="block-type-label">Footer</span>
          <span className="block-value">{block.text || "(푸터 텍스트)"}</span>
        </>
      );
    case "affiliate":
      return (
        <>
          <span className="block-type-label">Affiliate</span>
          <span className="block-value">{block.title || "(제목 없음)"}</span>
          <span className="block-url">{block.url}</span>
        </>
      );
    case "sponsored":
      return (
        <>
          <span className="block-type-label">Sponsored</span>
          <span className="block-value">{block.title || "(제목 없음)"}</span>
          <span className="block-url">{block.url}</span>
        </>
      );
    case "custom-html":
      return (
        <>
          <span className="block-type-label">Custom HTML</span>
          <span className="block-value" style={{ fontFamily: "monospace", fontSize: "12px" }}>
            {block.html.slice(0, 60) || "(HTML 없음)"}
          </span>
        </>
      );
    case "music":
      return (
        <>
          <span className="block-type-label">Music</span>
          <span className="block-value">{block.oembedCache?.title || "(URL 입력 필요)"}</span>
          {block.url && <span className="block-url">{block.url}</span>}
        </>
      );
    case "video":
      return (
        <>
          <span className="block-type-label">Video</span>
          <span className="block-value">{block.oembedCache?.title || "(URL 입력 필요)"}</span>
          {block.url && <span className="block-url">{block.url}</span>}
        </>
      );
    case "pinterest":
      return (
        <>
          <span className="block-type-label">Pinterest</span>
          <span className="block-value">{block.url || "(URL 입력 필요)"}</span>
        </>
      );
    case "collection":
      return (
        <>
          <span className="block-type-label">Collection · {block.layout}</span>
          <span className="block-value">{block.children.length}개 항목</span>
        </>
      );
    case "form":
      return (
        <>
          <span className="block-type-label">Form · Formspree</span>
          <span className="block-value">{block.title || "(제목 없음)"} · {block.fields.length}개 필드</span>
          {block.formspreeId && <span className="block-url">formspree.io/f/{block.formspreeId}</span>}
        </>
      );
    case "email":
      return (
        <>
          <span className="block-type-label">Email · ConvertKit</span>
          <span className="block-value">{block.title || "(제목 없음)"}</span>
          {block.convertkitFormId && <span className="block-url">form: {block.convertkitFormId}</span>}
        </>
      );
  }
}

function BlockEditor({
  block,
  profile,
  projectPath,
  onUpdate,
}: {
  block: Block;
  profile: Profile;
  projectPath: string;
  onUpdate: (p: Partial<Block>) => void;
}) {
  switch (block.type) {
    case "profile":
      return (
        <div className="block-edit-form">
          <div>
            <div className="block-edit-label">이름</div>
            <input
              defaultValue={profile.name}
              placeholder="이름"
              onChange={() => {}}
              onBlur={(e) => {
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
    case "socials":
      return (
        <div className="block-edit-form">
          {block.items.map((item, i) => (
            <div key={i} className="block-row">
              <input
                defaultValue={item.platform}
                placeholder="플랫폼 (instagram, twitter…)"
                style={{ flex: 1 }}
                onBlur={(e) => {
                  const items = block.items.map((it, j) =>
                    j === i ? { ...it, platform: e.target.value } : it
                  );
                  onUpdate({ items } as Partial<Block>);
                }}
              />
              <input
                defaultValue={item.url}
                placeholder="https://..."
                style={{ flex: 2 }}
                onBlur={(e) => {
                  const items = block.items.map((it, j) =>
                    j === i ? { ...it, url: e.target.value } : it
                  );
                  onUpdate({ items } as Partial<Block>);
                }}
              />
              <button
                className="block-row-del"
                onClick={() => onUpdate({ items: block.items.filter((_, j) => j !== i) } as Partial<Block>)}
              >✕</button>
            </div>
          ))}
          <button
            className="block-add-item-btn"
            onClick={() => onUpdate({ items: [...block.items, { platform: "", url: "" }] } as Partial<Block>)}
          >+ 소셜 추가</button>
        </div>
      );
    case "image":
      return (
        <div className="block-edit-form">
          <div>
            <div className="block-edit-label">Alt 텍스트</div>
            <input
              defaultValue={block.alt}
              placeholder="이미지 설명"
              onBlur={(e) => onUpdate({ alt: e.target.value } as Partial<Block>)}
            />
          </div>
          <div>
            <div className="block-edit-label">이미지 파일</div>
            <button
              className="block-file-btn"
              onClick={async () => {
                const file = await open({
                  multiple: false,
                  filters: [{ name: "Image", extensions: ["jpg", "jpeg", "png", "gif", "webp"] }],
                });
                if (!file || typeof file !== "string") return;
                try {
                  const assetPath: string = await invoke("import_asset", {
                    srcPath: file,
                    projectPath,
                    role: "image",
                  });
                  onUpdate({ assetPath } as Partial<Block>);
                } catch (e) {
                  alert(String(e));
                }
              }}
            >파일 선택</button>
            {block.assetPath && <span className="block-url" style={{ marginTop: "4px" }}>{block.assetPath}</span>}
          </div>
          <div>
            <div className="block-edit-label">링크 URL (선택)</div>
            <input
              defaultValue={block.url ?? ""}
              placeholder="https://..."
              onBlur={(e) => onUpdate({ url: e.target.value || undefined } as Partial<Block>)}
            />
          </div>
        </div>
      );
    case "footer":
      return (
        <div className="block-edit-form">
          <div>
            <div className="block-edit-label">텍스트</div>
            <input
              defaultValue={block.text}
              placeholder="© 2025 이름"
              onBlur={(e) => onUpdate({ text: e.target.value } as Partial<Block>)}
            />
          </div>
          <div>
            <div className="block-edit-label">링크</div>
            {block.links.map((link, i) => (
              <div key={i} className="block-row" style={{ marginBottom: "4px" }}>
                <input
                  defaultValue={link.label}
                  placeholder="라벨"
                  onBlur={(e) => {
                    const links = block.links.map((lk, j) =>
                      j === i ? { ...lk, label: e.target.value } : lk
                    );
                    onUpdate({ links } as Partial<Block>);
                  }}
                />
                <input
                  defaultValue={link.url}
                  placeholder="https://..."
                  style={{ flex: 2 }}
                  onBlur={(e) => {
                    const links = block.links.map((lk, j) =>
                      j === i ? { ...lk, url: e.target.value } : lk
                    );
                    onUpdate({ links } as Partial<Block>);
                  }}
                />
                <button
                  className="block-row-del"
                  onClick={() => onUpdate({ links: block.links.filter((_, j) => j !== i) } as Partial<Block>)}
                >✕</button>
              </div>
            ))}
            <button
              className="block-add-item-btn"
              onClick={() => onUpdate({ links: [...block.links, { label: "", url: "" }] } as Partial<Block>)}
            >+ 링크 추가</button>
          </div>
        </div>
      );
    case "affiliate":
      return (
        <div className="block-edit-form">
          <div>
            <div className="block-edit-label">제목</div>
            <input defaultValue={block.title} placeholder="제품명" onBlur={(e) => onUpdate({ title: e.target.value } as Partial<Block>)} />
          </div>
          <div>
            <div className="block-edit-label">URL</div>
            <input defaultValue={block.url} placeholder="https://..." onBlur={(e) => onUpdate({ url: e.target.value } as Partial<Block>)} />
          </div>
          <div>
            <div className="block-edit-label">UTM Source</div>
            <input defaultValue={block.utmSource ?? ""} placeholder="opentree" onBlur={(e) => onUpdate({ utmSource: e.target.value || undefined } as Partial<Block>)} />
          </div>
          <div>
            <div className="block-edit-label">UTM Medium</div>
            <input defaultValue={block.utmMedium ?? ""} placeholder="affiliate" onBlur={(e) => onUpdate({ utmMedium: e.target.value || undefined } as Partial<Block>)} />
          </div>
          <div>
            <div className="block-edit-label">UTM Campaign</div>
            <input defaultValue={block.utmCampaign ?? ""} placeholder="campaign" onBlur={(e) => onUpdate({ utmCampaign: e.target.value || undefined } as Partial<Block>)} />
          </div>
        </div>
      );
    case "sponsored":
      return (
        <div className="block-edit-form">
          <div>
            <div className="block-edit-label">제목</div>
            <input defaultValue={block.title} placeholder="스폰서 제목" onBlur={(e) => onUpdate({ title: e.target.value } as Partial<Block>)} />
          </div>
          <div>
            <div className="block-edit-label">URL</div>
            <input defaultValue={block.url} placeholder="https://..." onBlur={(e) => onUpdate({ url: e.target.value } as Partial<Block>)} />
          </div>
        </div>
      );
    case "custom-html":
      return (
        <div className="block-edit-form">
          <div>
            <div className="block-edit-label">HTML</div>
            <textarea
              defaultValue={block.html}
              placeholder="<div>...</div>"
              rows={5}
              onBlur={(e) => onUpdate({ html: e.target.value } as Partial<Block>)}
            />
          </div>
        </div>
      );
    case "music":
      return (
        <div className="block-edit-form">
          <div>
            <div className="block-edit-label">음악 URL</div>
            <input
              defaultValue={block.url}
              placeholder="https://open.spotify.com/... · soundcloud.com/... · music.apple.com/..."
              onBlur={(e) => onUpdate({ url: e.target.value } as Partial<Block>)}
            />
          </div>
        </div>
      );
    case "video":
      return (
        <div className="block-edit-form">
          <div>
            <div className="block-edit-label">영상 URL</div>
            <input
              defaultValue={block.url}
              placeholder="https://youtube.com/watch?v=... 또는 vimeo.com/..."
              onBlur={(e) => onUpdate({ url: e.target.value } as Partial<Block>)}
            />
          </div>
        </div>
      );
    case "pinterest":
      return (
        <div className="block-edit-form">
          <div>
            <div className="block-edit-label">Pinterest URL</div>
            <input
              defaultValue={block.url}
              placeholder="https://pinterest.com/... (핀/보드)"
              onBlur={(e) => onUpdate({ url: e.target.value } as Partial<Block>)}
            />
          </div>
        </div>
      );
    case "form": {
      const fields = block.fields;
      return (
        <div className="block-edit-form">
          <div>
            <div className="block-edit-label">Formspree Form ID</div>
            <input
              defaultValue={block.formspreeId}
              placeholder="xpzgkqyz (formspree.io 대시보드에서 복사)"
              onBlur={(e) => onUpdate({ formspreeId: e.target.value.trim() } as Partial<Block>)}
            />
          </div>
          <div>
            <div className="block-edit-label">제목</div>
            <input
              defaultValue={block.title}
              placeholder="문의하기"
              onBlur={(e) => onUpdate({ title: e.target.value } as Partial<Block>)}
            />
          </div>
          <div>
            <div className="block-edit-label">전송 버튼 라벨</div>
            <input
              defaultValue={block.submitLabel}
              placeholder="Send"
              onBlur={(e) => onUpdate({ submitLabel: e.target.value } as Partial<Block>)}
            />
          </div>
          <div>
            <div className="block-edit-label">필드</div>
            {fields.map((field, i) => (
              <div key={i} className="block-row" style={{ marginBottom: 4, flexWrap: "wrap" }}>
                <input
                  defaultValue={field.name}
                  placeholder="name (필드 이름)"
                  style={{ flex: 1 }}
                  onBlur={(e) => {
                    const next = fields.map((f, j) => j === i ? { ...f, name: e.target.value } : f);
                    onUpdate({ fields: next } as Partial<Block>);
                  }}
                />
                <input
                  defaultValue={field.label}
                  placeholder="라벨 (placeholder)"
                  style={{ flex: 1 }}
                  onBlur={(e) => {
                    const next = fields.map((f, j) => j === i ? { ...f, label: e.target.value } : f);
                    onUpdate({ fields: next } as Partial<Block>);
                  }}
                />
                <select
                  defaultValue={field.fieldType}
                  onChange={(e) => {
                    const next = fields.map((f, j) => j === i ? { ...f, fieldType: e.target.value as "text" | "email" | "textarea" } : f);
                    onUpdate({ fields: next } as Partial<Block>);
                  }}
                >
                  <option value="text">text</option>
                  <option value="email">email</option>
                  <option value="textarea">textarea</option>
                </select>
                <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 2 }}>
                  <input
                    type="checkbox"
                    defaultChecked={field.required}
                    onChange={(e) => {
                      const next = fields.map((f, j) => j === i ? { ...f, required: e.target.checked } : f);
                      onUpdate({ fields: next } as Partial<Block>);
                    }}
                  />필수
                </label>
                <button
                  className="block-row-del"
                  onClick={() => onUpdate({ fields: fields.filter((_, j) => j !== i) } as Partial<Block>)}
                >✕</button>
              </div>
            ))}
            <button
              className="block-add-item-btn"
              onClick={() => onUpdate({
                fields: [...fields, { name: "", label: "", fieldType: "text", required: false }],
              } as Partial<Block>)}
            >+ 필드 추가</button>
          </div>
        </div>
      );
    }
    case "email":
      return (
        <div className="block-edit-form">
          <div>
            <div className="block-edit-label">ConvertKit/Kit Form ID</div>
            <input
              defaultValue={block.convertkitFormId}
              placeholder="1234567 (Kit 대시보드 → Form → Embed에서 확인)"
              onBlur={(e) => onUpdate({ convertkitFormId: e.target.value.trim() } as Partial<Block>)}
            />
          </div>
          <div>
            <div className="block-edit-label">제목</div>
            <input
              defaultValue={block.title}
              placeholder="뉴스레터 가입"
              onBlur={(e) => onUpdate({ title: e.target.value } as Partial<Block>)}
            />
          </div>
          <div>
            <div className="block-edit-label">이메일 placeholder</div>
            <input
              defaultValue={block.placeholder}
              placeholder="you@example.com"
              onBlur={(e) => onUpdate({ placeholder: e.target.value } as Partial<Block>)}
            />
          </div>
          <div>
            <div className="block-edit-label">전송 버튼 라벨</div>
            <input
              defaultValue={block.submitLabel}
              placeholder="Subscribe"
              onBlur={(e) => onUpdate({ submitLabel: e.target.value } as Partial<Block>)}
            />
          </div>
        </div>
      );
    case "collection": {
      const children = block.children;
      return (
        <div className="block-edit-form">
          <div>
            <div className="block-edit-label">레이아웃</div>
            <select
              defaultValue={block.layout}
              onChange={(e) => onUpdate({ layout: e.target.value as "grid" | "carousel" } as Partial<Block>)}
            >
              <option value="grid">Grid</option>
              <option value="carousel">Carousel</option>
            </select>
          </div>
          <div>
            <div className="block-edit-label">자식 항목 (Link 만 UI 편집 지원)</div>
            {children.map((child, i) => {
              if (child.type !== "link") {
                return (
                  <div key={child.id} className="block-row" style={{ marginBottom: 4 }}>
                    <span className="block-url" style={{ flex: 1 }}>
                      {child.type} (UI 편집 미지원)
                    </span>
                    <button
                      className="block-row-del"
                      onClick={() => onUpdate({ children: children.filter((_, j) => j !== i) } as Partial<Block>)}
                    >✕</button>
                  </div>
                );
              }
              return (
                <div key={child.id} className="block-row" style={{ marginBottom: 4 }}>
                  <input
                    defaultValue={child.title}
                    placeholder="제목"
                    onBlur={(e) => {
                      const next = children.map((c, j) =>
                        j === i && c.type === "link" ? { ...c, title: e.target.value } : c
                      );
                      onUpdate({ children: next } as Partial<Block>);
                    }}
                  />
                  <input
                    defaultValue={child.url}
                    placeholder="https://..."
                    style={{ flex: 2 }}
                    onBlur={(e) => {
                      const next = children.map((c, j) =>
                        j === i && c.type === "link" ? { ...c, url: e.target.value } : c
                      );
                      onUpdate({ children: next } as Partial<Block>);
                    }}
                  />
                  <button
                    className="block-row-del"
                    onClick={() => onUpdate({ children: children.filter((_, j) => j !== i) } as Partial<Block>)}
                  >✕</button>
                </div>
              );
            })}
            <button
              className="block-add-item-btn"
              onClick={() => onUpdate({
                children: [
                  ...children,
                  { id: crypto.randomUUID(), type: "link", enabled: true, title: "", url: "" },
                ],
              } as Partial<Block>)}
            >+ 링크 추가</button>
          </div>
        </div>
      );
    }
  }
}
