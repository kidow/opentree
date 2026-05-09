import { useRef } from "react";
import type { useAppStore } from "../store";

interface Props {
  store: ReturnType<typeof useAppStore>;
  projectPath: string;
}

export default function Settings({ store, projectPath }: Props) {
  const { config } = store;
  if (!config) return null;

  const siteUrlRef = useRef<HTMLInputElement>(null);

  const handleSiteUrlBlur = () => {
    const val = siteUrlRef.current?.value.trim() ?? "";
    const next = val === "" ? undefined : val;
    if (next !== config.siteUrl) {
      store.update({ ...config, siteUrl: next });
    }
  };

  return (
    <main className="settings">
      <div className="settings-header">
        <h2 className="settings-title">Settings</h2>
      </div>
      <div className="settings-body">

        <section className="settings-section">
          <h3 className="settings-section-title">사이트</h3>
          <div className="settings-field">
            <label className="settings-label">Site URL</label>
            <p className="settings-hint">배포 후 실제 URL. sitemap.xml, og 태그에 사용됩니다.</p>
            <input
              ref={siteUrlRef}
              type="url"
              defaultValue={config.siteUrl ?? ""}
              placeholder="https://yourname.vercel.app"
              onBlur={handleSiteUrlBlur}
            />
          </div>
        </section>

        <section className="settings-section">
          <h3 className="settings-section-title">프로젝트</h3>
          <div className="settings-field">
            <label className="settings-label">프로젝트 폴더</label>
            <div className="settings-path">{projectPath}</div>
          </div>
        </section>

        <section className="settings-section">
          <h3 className="settings-section-title">앱 정보</h3>
          <div className="settings-info-row">
            <span className="settings-info-key">버전</span>
            <span className="settings-info-val">0.1.0</span>
          </div>
          <div className="settings-info-row">
            <span className="settings-info-key">Schema version</span>
            <span className="settings-info-val">{config.schemaVersion}</span>
          </div>
        </section>

      </div>
      <style>{`
        .settings {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg);
        }
        .settings-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
        }
        .settings-title {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .settings-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .settings-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .settings-section-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-muted);
        }
        .settings-field {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .settings-label {
          font-size: 13px;
          font-weight: 600;
        }
        .settings-hint {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .settings-field input {
          font-size: 13px;
          margin-top: 2px;
        }
        .settings-path {
          font-size: 12px;
          color: var(--text-muted);
          font-family: 'SFMono-Regular', monospace;
          word-break: break-all;
          background: var(--bg);
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid var(--border);
        }
        .settings-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 14px;
        }
        .settings-info-key {
          font-size: 13px;
          font-weight: 500;
        }
        .settings-info-val {
          font-size: 13px;
          color: var(--text-muted);
          font-family: 'SFMono-Regular', monospace;
        }
      `}</style>
    </main>
  );
}
