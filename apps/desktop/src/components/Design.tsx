import { useState } from "react";
import type { useAppStore } from "../store";
import type { Background, ButtonStyle, LayoutStyle, Theme } from "../types";

interface Props {
  store: ReturnType<typeof useAppStore>;
}

const COLOR_FIELDS: { key: keyof Theme; label: string; desc: string; optional?: boolean }[] = [
  { key: "accentColor", label: "Accent", desc: "버튼 / 강조색" },
  { key: "backgroundColor", label: "Background", desc: "페이지 배경 (단색)" },
  { key: "textColor", label: "Text", desc: "기본 글자색" },
  { key: "borderColor", label: "Border", desc: "버튼/입력 테두리 (선택)", optional: true },
  { key: "mutedColor", label: "Muted", desc: "보조 텍스트 (선택)", optional: true },
  { key: "hoverColor", label: "Hover", desc: "버튼 hover (선택)", optional: true },
];

const BUTTON_PRESETS: { id: ButtonStyle; label: string }[] = [
  { id: "outline", label: "Outline" },
  { id: "pill", label: "Pill" },
  { id: "rounded", label: "Rounded" },
  { id: "square", label: "Square" },
  { id: "soft", label: "Soft" },
];

const LAYOUTS: { id: LayoutStyle; label: string; desc: string }[] = [
  { id: "classic", label: "Classic", desc: "균등한 카드" },
  { id: "featured", label: "Featured", desc: "첫 카드 강조 + 그림자" },
];

const BG_TYPES = ["solid", "gradient", "image"] as const;

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

function relativeLuminance([r, g, b]: [number, number, number]) {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: string, b: string): number | null {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return null;
  const la = relativeLuminance(ra);
  const lb = relativeLuminance(rb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export default function Design({ store }: Props) {
  const { config } = store;
  const [bundleText, setBundleText] = useState("");
  const [bundleError, setBundleError] = useState<string | null>(null);
  if (!config) return null;
  const theme: Theme = config.theme;

  const updateTheme = (patch: Partial<Theme>) => store.updateTheme(patch);

  const setBg = (bg: Background | undefined) => updateTheme({ background: bg });

  const wcag = contrast(theme.textColor, theme.backgroundColor);
  const wcagBad = wcag !== null && wcag < 4.5;

  const exportBundle = () => {
    setBundleText(JSON.stringify(theme, null, 2));
    setBundleError(null);
  };

  const importBundle = () => {
    try {
      const parsed: Theme = JSON.parse(bundleText);
      if (typeof parsed !== "object" || !parsed.accentColor) throw new Error("Invalid theme bundle");
      store.update({ ...config, theme: parsed });
      setBundleError(null);
    } catch (e) {
      setBundleError(String(e));
    }
  };

  return (
    <main className="design">
      <div className="design-header">
        <h2 className="design-title">Design</h2>
      </div>
      <div className="design-body">

        <section className="design-section">
          <h3 className="design-section-title">색상</h3>
          {wcagBad && (
            <div className="design-warn">
              ⚠ Text/Background 대비 {wcag?.toFixed(2)}:1 — WCAG AA (4.5:1) 미달
            </div>
          )}
          <div className="color-list">
            {COLOR_FIELDS.map(({ key, label, desc, optional }) => {
              const val = (theme[key as keyof Theme] as string | undefined) ?? "";
              return (
                <div key={key} className="color-row">
                  <div className="color-swatch-wrap">
                    <input
                      type="color"
                      className="color-input"
                      value={val || "#000000"}
                      onChange={(e) => updateTheme({ [key]: e.target.value } as Partial<Theme>)}
                    />
                    <span className="color-swatch" style={{ background: val || "transparent" }} />
                  </div>
                  <div className="color-info">
                    <span className="color-label">{label}</span>
                    <span className="color-desc">{desc}</span>
                  </div>
                  <input
                    type="text"
                    className="color-hex"
                    value={val}
                    placeholder={optional ? "auto" : ""}
                    maxLength={7}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^#[0-9a-fA-F]{0,6}$/.test(v)) {
                        updateTheme({ [key]: v || undefined } as Partial<Theme>);
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="design-section">
          <h3 className="design-section-title">버튼 스타일</h3>
          <div className="preset-row">
            {BUTTON_PRESETS.map((p) => (
              <button
                key={p.id}
                className={`preset-btn${theme.buttonStyle === p.id ? " active" : ""}`}
                onClick={() => updateTheme({ buttonStyle: p.id })}
              >{p.label}</button>
            ))}
          </div>
        </section>

        <section className="design-section">
          <h3 className="design-section-title">레이아웃</h3>
          <div className="preset-row">
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                className={`preset-btn layout-preset${theme.layout === l.id ? " active" : ""}`}
                onClick={() => updateTheme({ layout: l.id })}
              >
                <span style={{ fontWeight: 700 }}>{l.label}</span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>{l.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="design-section">
          <h3 className="design-section-title">배경</h3>
          <div className="preset-row">
            <button
              className={`preset-btn${!theme.background ? " active" : ""}`}
              onClick={() => setBg(undefined)}
            >단색 (기본)</button>
            {BG_TYPES.map((t) => (
              <button
                key={t}
                className={`preset-btn${theme.background?.type === t ? " active" : ""}`}
                onClick={() => {
                  if (t === "solid") setBg({ type: "solid", color: theme.backgroundColor });
                  if (t === "gradient") setBg({ type: "gradient", from: theme.backgroundColor, to: theme.accentColor, direction: "to bottom" });
                  if (t === "image") setBg({ type: "image", assetPath: "", opacity: 1 });
                }}
              >{t}</button>
            ))}
          </div>

          {theme.background?.type === "solid" && (
            <div className="design-field">
              <label className="design-label">색상</label>
              <input
                type="text"
                value={theme.background.color}
                onChange={(e) => setBg({ type: "solid", color: e.target.value })}
              />
            </div>
          )}
          {theme.background?.type === "gradient" && (
            <div className="design-field">
              <label className="design-label">From</label>
              <input
                type="text"
                value={theme.background.from}
                onChange={(e) => setBg({ ...theme.background as Extract<Background, { type: "gradient" }>, from: e.target.value })}
              />
              <label className="design-label" style={{ marginTop: 8 }}>To</label>
              <input
                type="text"
                value={theme.background.to}
                onChange={(e) => setBg({ ...theme.background as Extract<Background, { type: "gradient" }>, to: e.target.value })}
              />
              <label className="design-label" style={{ marginTop: 8 }}>Direction</label>
              <input
                type="text"
                value={theme.background.direction}
                placeholder="to bottom · to right · 135deg"
                onChange={(e) => setBg({ ...theme.background as Extract<Background, { type: "gradient" }>, direction: e.target.value })}
              />
            </div>
          )}
          {theme.background?.type === "image" && (
            <div className="design-field">
              <label className="design-label">이미지 URL 또는 assets/...</label>
              <input
                type="text"
                value={theme.background.url ?? theme.background.assetPath}
                placeholder="https://... 또는 assets/bg.jpg"
                onChange={(e) => {
                  const v = e.target.value;
                  setBg({
                    type: "image",
                    assetPath: v.startsWith("assets/") ? v : "",
                    url: v.startsWith("http") ? v : undefined,
                    opacity: theme.background?.type === "image" ? theme.background.opacity : 1,
                  });
                }}
              />
              <label className="design-label" style={{ marginTop: 8 }}>Opacity ({((theme.background.opacity ?? 1) * 100).toFixed(0)}%)</label>
              <input
                type="range" min="0" max="100" step="5"
                value={(theme.background.opacity ?? 1) * 100}
                onChange={(e) => setBg({ ...theme.background as Extract<Background, { type: "image" }>, opacity: Number(e.target.value) / 100 })}
              />
            </div>
          )}
        </section>

        <section className="design-section">
          <h3 className="design-section-title">폰트 (Google Fonts)</h3>
          <div className="design-field">
            <label className="design-label">Font family 이름</label>
            <p className="design-hint">예: Inter, Pretendard, Roboto, Noto Sans KR. fonts.google.com 정확한 이름 사용. 비우면 시스템 폰트.</p>
            <input
              type="text"
              defaultValue={theme.fontFamily ?? ""}
              placeholder="Inter"
              onBlur={(e) => updateTheme({ fontFamily: e.target.value.trim() || undefined })}
            />
          </div>
        </section>

        <section className="design-section">
          <h3 className="design-section-title">Custom CSS</h3>
          <div className="design-field">
            <p className="design-hint">렌더링된 페이지의 &lt;style&gt;에 추가됩니다. 책임은 본인.</p>
            <textarea
              rows={6}
              defaultValue={theme.customCss ?? ""}
              placeholder=".link-card { letter-spacing: 0.02em; }"
              style={{ fontFamily: "'SFMono-Regular', monospace", fontSize: 12 }}
              onBlur={(e) => updateTheme({ customCss: e.target.value || undefined })}
            />
          </div>
        </section>

        <section className="design-section">
          <h3 className="design-section-title">Theme Bundle</h3>
          <div className="design-field">
            <p className="design-hint">현재 테마를 JSON으로 내보내거나, JSON을 붙여넣어 적용.</p>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <button className="preset-btn" onClick={exportBundle}>내보내기</button>
              <button className="preset-btn" onClick={importBundle} disabled={!bundleText.trim()}>적용</button>
            </div>
            <textarea
              rows={8}
              value={bundleText}
              placeholder='{"accentColor":"#000000",...}'
              style={{ fontFamily: "'SFMono-Regular', monospace", fontSize: 11 }}
              onChange={(e) => setBundleText(e.target.value)}
            />
            {bundleError && <span className="design-warn" style={{ marginTop: 6 }}>⚠ {bundleError}</span>}
          </div>
        </section>

      </div>
      <style>{`
        .design { display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }
        .design-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); background: var(--surface); }
        .design-title { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
        .design-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 24px; }
        .design-section { display: flex; flex-direction: column; gap: 10px; }
        .design-section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); }
        .design-warn { padding: 8px 12px; background: rgba(245, 158, 11, 0.1); color: #92400e; font-size: 12px; border-radius: 6px; border: 1px solid rgba(245, 158, 11, 0.3); }
        .design-field { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 4px; }
        .design-label { font-size: 12px; font-weight: 600; }
        .design-hint { font-size: 11px; color: var(--text-muted); line-height: 1.5; margin-bottom: 4px; }
        .design-field input, .design-field textarea { font-size: 13px; }
        .color-list { display: flex; flex-direction: column; gap: 2px; }
        .color-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; }
        .color-swatch-wrap { position: relative; width: 36px; height: 36px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); cursor: pointer; flex-shrink: 0; }
        .color-input { position: absolute; inset: -4px; width: calc(100% + 8px); height: calc(100% + 8px); opacity: 0; cursor: pointer; border: none; padding: 0; }
        .color-swatch { display: block; width: 100%; height: 100%; }
        .color-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .color-label { font-size: 13px; font-weight: 600; }
        .color-desc { font-size: 11px; color: var(--text-muted); }
        .color-hex { width: 86px; font-size: 12px; font-family: 'SFMono-Regular', monospace; padding: 6px 8px; text-align: center; flex-shrink: 0; }
        .preset-row { display: flex; flex-wrap: wrap; gap: 6px; }
        .preset-btn { padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 500; border: 1px solid var(--border); color: var(--text); background: var(--surface); }
        .preset-btn:hover:not(:disabled) { background: var(--bg); }
        .preset-btn.active { background: var(--accent); color: white; border-color: var(--accent); }
        .preset-btn:disabled { opacity: 0.4; cursor: default; }
        .layout-preset { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-width: 120px; }
      `}</style>
    </main>
  );
}
