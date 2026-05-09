import { useRef, useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { useAppStore } from "../store";

interface Props {
  store: ReturnType<typeof useAppStore>;
  projectPath: string;
}

type Provider = "vercel" | "cloudflare" | "github";

interface ConnState {
  connected: boolean;
  masked: string;
}

function mask(val: string) {
  return val.length <= 4 ? "****" : "*".repeat(Math.min(val.length - 4, 12)) + val.slice(-4);
}

function ProviderCard({
  label,
  hint,
  fields,
  onConnect,
  onDisconnect,
  conn,
}: {
  label: string;
  hint: string;
  fields: { key: string; label: string; placeholder: string; sensitive?: boolean }[];
  onConnect: (data: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  conn: ConnState;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    setError(null);
    const missing = fields.find((f) => !values[f.key]?.trim());
    if (missing) { setError(`${missing.label}을(를) 입력하세요.`); return; }
    setLoading(true);
    try {
      await onConnect(
        fields.length === 1
          ? values[fields[0].key].trim()
          : JSON.stringify(Object.fromEntries(fields.map((f) => [f.key, values[f.key].trim()])))
      );
      setValues({});
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [values, fields, onConnect]);

  const handleDisconnect = useCallback(async () => {
    setLoading(true);
    try { await onDisconnect(); } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [onDisconnect]);

  return (
    <div className="provider-card">
      <div className="provider-header">
        <span className="provider-name">{label}</span>
        {conn.connected && <span className="provider-badge">연결됨 ✓</span>}
      </div>
      <p className="provider-hint">{hint}</p>
      {conn.connected ? (
        <div className="provider-connected">
          <span className="provider-masked">{conn.masked}</span>
          <button
            className="provider-disconnect-btn"
            onClick={handleDisconnect}
            disabled={loading}
          >
            연결 해제
          </button>
        </div>
      ) : (
        <div className="provider-form">
          {fields.map((f) => (
            <input
              key={f.key}
              type={f.sensitive ? "password" : "text"}
              placeholder={f.placeholder}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          ))}
          {error && <span className="provider-error">{error}</span>}
          <button
            className="provider-connect-btn"
            onClick={handleConnect}
            disabled={loading}
          >
            {loading ? "확인 중…" : "연결"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Settings({ store, projectPath }: Props) {
  const { config } = store;
  const siteUrlRef = useRef<HTMLInputElement>(null);
  const [connections, setConnections] = useState<Record<Provider, ConnState>>({
    vercel: { connected: false, masked: "" },
    cloudflare: { connected: false, masked: "" },
    github: { connected: false, masked: "" },
  });

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    const providers: Provider[] = ["vercel", "cloudflare", "github"];
    const next = { ...connections };
    for (const p of providers) {
      try {
        const val = await invoke<string | null>("get_token", { provider: p });
        if (val) {
          let masked = "";
          if (p === "vercel") {
            masked = `토큰: ${mask(val)}`;
          } else {
            try {
              const obj = JSON.parse(val);
              if (p === "cloudflare") masked = `토큰: ${mask(obj.token ?? "")} / Account ID: ${mask(obj.accountId ?? "")}`;
              if (p === "github") masked = `토큰: ${mask(obj.token ?? "")} / Repo: ${obj.repo ?? ""}`;
            } catch {
              masked = mask(val);
            }
          }
          next[p] = { connected: true, masked };
        } else {
          next[p] = { connected: false, masked: "" };
        }
      } catch {
        next[p] = { connected: false, masked: "" };
      }
    }
    setConnections(next);
  };

  const handleConnect = useCallback(
    (provider: Provider) => async (data: string) => {
      await invoke("verify_connection", { provider, data });
      await invoke("set_token", { provider, token: data });
      await loadConnections();
    },
    []
  );

  const handleDisconnect = useCallback(
    (provider: Provider) => async () => {
      await invoke("delete_token", { provider });
      await loadConnections();
    },
    []
  );

  const handleSiteUrlBlur = () => {
    if (!config) return;
    const val = siteUrlRef.current?.value.trim() ?? "";
    const next = val === "" ? undefined : val;
    if (next !== config.siteUrl) store.update({ ...config, siteUrl: next });
  };

  if (!config) return null;

  return (
    <main className="settings">
      <div className="settings-header">
        <h2 className="settings-title">Settings</h2>
      </div>
      <div className="settings-body">

        <section className="settings-section">
          <h3 className="settings-section-title">연결</h3>
          <ProviderCard
            label="Vercel"
            hint="vercel.com/account/tokens 에서 발급한 토큰"
            fields={[{ key: "token", label: "API 토큰", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxx", sensitive: true }]}
            conn={connections.vercel}
            onConnect={handleConnect("vercel")}
            onDisconnect={handleDisconnect("vercel")}
          />
          <ProviderCard
            label="Cloudflare Pages"
            hint="dash.cloudflare.com → My Profile → API Tokens에서 발급. Account ID는 Workers & Pages 대시보드 우측에서 확인."
            fields={[
              { key: "token", label: "API 토큰", placeholder: "Cloudflare API Token", sensitive: true },
              { key: "accountId", label: "Account ID", placeholder: "32자리 Account ID" },
            ]}
            conn={connections.cloudflare}
            onConnect={handleConnect("cloudflare")}
            onDisconnect={handleDisconnect("cloudflare")}
          />
          <ProviderCard
            label="GitHub Pages"
            hint="github.com/settings/tokens 에서 repo 권한 포함 토큰 발급. 저장소는 자동 생성됩니다."
            fields={[
              { key: "token", label: "Personal Access Token", placeholder: "ghp_xxxxxxxxxxxxxxxxxxxx", sensitive: true },
              { key: "repo", label: "저장소 (owner/repo)", placeholder: "username/my-site" },
            ]}
            conn={connections.github}
            onConnect={handleConnect("github")}
            onDisconnect={handleDisconnect("github")}
          />
        </section>

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
        .settings { display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }
        .settings-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); background: var(--surface); }
        .settings-title { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
        .settings-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 24px; }
        .settings-section { display: flex; flex-direction: column; gap: 10px; }
        .settings-section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); }
        .settings-field { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 6px; }
        .settings-label { font-size: 13px; font-weight: 600; }
        .settings-hint { font-size: 11px; color: var(--text-muted); line-height: 1.4; }
        .settings-field input { font-size: 13px; margin-top: 2px; }
        .settings-path { font-size: 12px; color: var(--text-muted); font-family: 'SFMono-Regular', monospace; word-break: break-all; background: var(--bg); padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border); }
        .settings-info-row { display: flex; justify-content: space-between; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
        .settings-info-key { font-size: 13px; font-weight: 500; }
        .settings-info-val { font-size: 13px; color: var(--text-muted); font-family: 'SFMono-Regular', monospace; }
        /* Provider cards */
        .provider-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
        .provider-header { display: flex; align-items: center; justify-content: space-between; }
        .provider-name { font-size: 13px; font-weight: 600; }
        .provider-badge { font-size: 11px; font-weight: 600; color: #16a34a; background: #dcfce7; padding: 2px 8px; border-radius: 99px; }
        .provider-hint { font-size: 11px; color: var(--text-muted); line-height: 1.5; }
        .provider-connected { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .provider-masked { font-size: 12px; color: var(--text-muted); font-family: 'SFMono-Regular', monospace; }
        .provider-disconnect-btn { font-size: 12px; font-weight: 500; color: #dc2626; border: 1px solid #fecaca; border-radius: 6px; padding: 4px 10px; white-space: nowrap; }
        .provider-disconnect-btn:hover { background: #fef2f2; }
        .provider-disconnect-btn:disabled { opacity: 0.4; cursor: default; }
        .provider-form { display: flex; flex-direction: column; gap: 6px; }
        .provider-form input { font-size: 13px; }
        .provider-error { font-size: 12px; color: #dc2626; }
        .provider-connect-btn { align-self: flex-end; padding: 7px 16px; background: var(--accent); color: white; border-radius: 6px; font-size: 13px; font-weight: 600; }
        .provider-connect-btn:disabled { opacity: 0.4; cursor: default; }
      `}</style>
    </main>
  );
}
