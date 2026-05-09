import type { useAppStore } from "../store";

interface Props {
  store: ReturnType<typeof useAppStore>;
}

const COLOR_FIELDS = [
  { key: "accentColor", label: "Accent", desc: "버튼 테두리 및 강조색" },
  { key: "backgroundColor", label: "Background", desc: "페이지 배경색" },
  { key: "textColor", label: "Text", desc: "기본 글자색" },
] as const;

export default function Design({ store }: Props) {
  const { config } = store;
  if (!config) return null;
  const { theme } = config;

  return (
    <main className="design">
      <div className="design-header">
        <h2 className="design-title">Design</h2>
      </div>
      <div className="design-body">
        <section className="design-section">
          <h3 className="design-section-title">색상</h3>
          <div className="color-list">
            {COLOR_FIELDS.map(({ key, label, desc }) => (
              <div key={key} className="color-row">
                <div className="color-swatch-wrap">
                  <input
                    type="color"
                    className="color-input"
                    value={theme[key]}
                    onChange={(e) =>
                      store.updateTheme({ [key]: e.target.value })
                    }
                    title={label}
                  />
                  <span
                    className="color-swatch"
                    style={{ background: theme[key] }}
                  />
                </div>
                <div className="color-info">
                  <span className="color-label">{label}</span>
                  <span className="color-desc">{desc}</span>
                </div>
                <input
                  type="text"
                  className="color-hex"
                  value={theme[key]}
                  maxLength={7}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                      store.updateTheme({ [key]: v });
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
      <style>{`
        .design {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg);
        }
        .design-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
        }
        .design-title {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .design-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
        }
        .design-section-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted);
          margin-bottom: 12px;
        }
        .color-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .color-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
        }
        .color-swatch-wrap {
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--border);
          cursor: pointer;
          flex-shrink: 0;
        }
        .color-input {
          position: absolute;
          inset: -4px;
          width: calc(100% + 8px);
          height: calc(100% + 8px);
          opacity: 0;
          cursor: pointer;
          border: none;
          padding: 0;
        }
        .color-swatch {
          display: block;
          width: 100%;
          height: 100%;
        }
        .color-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .color-label {
          font-size: 13px;
          font-weight: 600;
        }
        .color-desc {
          font-size: 11px;
          color: var(--text-muted);
        }
        .color-hex {
          width: 86px;
          font-size: 12px;
          font-family: 'SFMono-Regular', monospace;
          padding: 6px 8px;
          text-align: center;
          flex-shrink: 0;
        }
      `}</style>
    </main>
  );
}
