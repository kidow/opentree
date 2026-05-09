import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { useAppStore } from "../store";

interface DeployResult {
  url: string;
  id: string;
  state: string;
}

interface DnsRecord {
  record_type: string;
  name: string;
  value: string;
}

interface DomainStatus {
  verified: boolean;
  dns_records: DnsRecord[];
}

interface Props {
  store: ReturnType<typeof useAppStore>;
  projectPath: string;
}

type Provider = "vercel" | "cloudflare" | "github";

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "vercel", label: "Vercel" },
  { id: "cloudflare", label: "Cloudflare Pages" },
  { id: "github", label: "GitHub Pages" },
];

export default function Publish({ store, projectPath }: Props) {
  const { config } = store;
  const [provider, setProvider] = useState<Provider>("vercel");
  const [connected, setConnected] = useState<Record<Provider, boolean>>({
    vercel: false,
    cloudflare: false,
    github: false,
  });
  const [projectName, setProjectName] = useState("opentree-site");
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<DeployResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollState, setPollState] = useState<string | null>(null);

  // Domain
  const domainRef = useRef<HTMLInputElement>(null);
  const [domainStatus, setDomainStatus] = useState<DomainStatus | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainLoading, setDomainLoading] = useState(false);
  const [addingDomain, setAddingDomain] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    setResult(null);
    setError(null);
    setPollState(null);
    setDomainStatus(null);
    setDomainError(null);
  }, [provider]);

  const loadConnections = async () => {
    const next = { ...connected };
    for (const p of ["vercel", "cloudflare", "github"] as Provider[]) {
      try {
        const val = await invoke<string | null>("get_token", { provider: p });
        next[p] = !!val;
      } catch {
        next[p] = false;
      }
    }
    setConnected(next);
  };

  const handleDeploy = useCallback(async () => {
    if (!config || !connected[provider]) return;
    setDeploying(true);
    setError(null);
    setResult(null);
    setPollState(null);
    try {
      let res: DeployResult;
      if (provider === "vercel") {
        res = await invoke("deploy_vercel", {
          config,
          projectName: projectName.trim() || "opentree-site",
          projectPath,
        });
        if (res.state !== "READY") pollVercel(res.id);
      } else if (provider === "cloudflare") {
        res = await invoke("deploy_cloudflare", {
          config,
          projectName: projectName.trim() || "opentree-site",
          projectPath,
        });
      } else {
        res = await invoke("deploy_github_pages", { config, projectPath });
      }
      setResult(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setDeploying(false);
    }
  }, [config, connected, provider, projectName]);

  const pollVercel = async (id: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const state: string = await invoke("check_deploy_state", { deployId: id });
        setPollState(state);
        if (state === "READY" || state === "ERROR" || attempts > 30) clearInterval(interval);
      } catch {
        clearInterval(interval);
      }
    }, 3000);
  };

  const handleAddDomain = useCallback(async () => {
    const domain = domainRef.current?.value.trim();
    if (!domain || !config) return;
    setAddingDomain(true);
    setDomainError(null);
    setDomainStatus(null);
    try {
      await invoke("add_domain", { provider, projectName, domain });
      store.update({ ...config, domain });
      const status: DomainStatus = await invoke("check_domain", {
        provider,
        projectName,
        domain,
      });
      setDomainStatus(status);
    } catch (e) {
      setDomainError(String(e));
    } finally {
      setAddingDomain(false);
    }
  }, [config, provider, projectName, store]);

  const handleCheckDomain = useCallback(async () => {
    const domain = config?.domain ?? domainRef.current?.value.trim();
    if (!domain) return;
    setDomainLoading(true);
    setDomainError(null);
    try {
      const status: DomainStatus = await invoke("check_domain", {
        provider,
        projectName,
        domain,
      });
      setDomainStatus(status);
    } catch (e) {
      setDomainError(String(e));
    } finally {
      setDomainLoading(false);
    }
  }, [config, provider, projectName]);

  const deployState = pollState ?? result?.state;

  return (
    <main className="publish">
      <div className="publish-header">
        <h2 className="publish-title">Publish</h2>
      </div>
      <div className="publish-body">

        {/* Provider tabs */}
        <div className="provider-tabs">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              className={`provider-tab${provider === p.id ? " active" : ""}${connected[p.id] ? " connected" : ""}`}
              onClick={() => setProvider(p.id)}
            >
              {p.label}
              {connected[p.id] && <span className="tab-dot" />}
            </button>
          ))}
        </div>

        {!connected[provider] ? (
          <div className="not-connected">
            <p>Settings → 연결에서 {PROVIDERS.find((p) => p.id === provider)?.label}을 연결하세요.</p>
          </div>
        ) : (
          <>
            {/* Project name (not needed for GitHub — repo is in connection) */}
            {provider !== "github" && (
              <section className="pub-section">
                <h3 className="pub-section-title">프로젝트</h3>
                <div className="pub-field">
                  <label className="pub-label">프로젝트 이름</label>
                  <p className="pub-hint">소문자, 숫자, 하이픈만 허용.</p>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) =>
                      setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                    }
                    placeholder="opentree-site"
                  />
                </div>
              </section>
            )}

            <button
              className="deploy-btn"
              onClick={handleDeploy}
              disabled={deploying || !config}
            >
              {deploying ? "배포 중…" : `${PROVIDERS.find((p) => p.id === provider)?.label}에 배포`}
            </button>

            {error && <div className="pub-error">⚠ {error}</div>}

            {result && (
              <section className="pub-result">
                <h3 className="pub-section-title">배포 결과</h3>
                <div className="pub-result-card">
                  <div className="result-state" data-state={deployState}>
                    {deployState === "READY" ? "✓ 배포 완료" :
                     deployState === "ERROR" ? "✕ 배포 실패" :
                     "⏳ 배포 중…"}
                  </div>
                  {(deployState === "READY" || provider !== "vercel") && (
                    <a className="result-url" href={result.url} target="_blank" rel="noopener noreferrer">
                      {result.url}
                    </a>
                  )}
                  {result.id !== "gh-pages" && (
                    <div className="result-id">ID: {result.id}</div>
                  )}
                </div>
              </section>
            )}

            {/* Custom domain */}
            <section className="pub-section">
              <h3 className="pub-section-title">커스텀 도메인</h3>
              <div className="pub-field">
                <label className="pub-label">도메인</label>
                <p className="pub-hint">example.com 또는 www.example.com</p>
                <div className="domain-row">
                  <input
                    ref={domainRef}
                    type="text"
                    defaultValue={config?.domain ?? ""}
                    placeholder="yourdomain.com"
                  />
                  <button
                    className="domain-add-btn"
                    onClick={handleAddDomain}
                    disabled={addingDomain}
                  >
                    {addingDomain ? "연결 중…" : "연결"}
                  </button>
                  {config?.domain && (
                    <button
                      className="domain-check-btn"
                      onClick={handleCheckDomain}
                      disabled={domainLoading}
                    >
                      {domainLoading ? "확인 중…" : "검증"}
                    </button>
                  )}
                </div>
                {domainError && <span className="domain-error">{domainError}</span>}
              </div>

              {domainStatus && (
                <div className="dns-card">
                  <div className={`dns-status${domainStatus.verified ? " ok" : " pending"}`}>
                    {domainStatus.verified ? "✓ 도메인 활성화됨" : "⏳ DNS 설정 대기 중"}
                  </div>
                  {!domainStatus.verified && (
                    <>
                      <p className="dns-label">DNS 레코드를 아래와 같이 설정하세요:</p>
                      <table className="dns-table">
                        <thead>
                          <tr><th>타입</th><th>이름</th><th>값</th></tr>
                        </thead>
                        <tbody>
                          {domainStatus.dns_records.map((r, i) => (
                            <tr key={i}>
                              <td>{r.record_type}</td>
                              <td>{r.name}</td>
                              <td className="dns-value">{r.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              )}
            </section>
          </>
        )}

      </div>
      <style>{`
        .publish { display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }
        .publish-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); background: var(--surface); }
        .publish-title { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
        .publish-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
        .provider-tabs { display: flex; gap: 6px; }
        .provider-tab { padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; border: 1px solid var(--border); color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
        .provider-tab.active { background: var(--accent); color: white; border-color: var(--accent); }
        .provider-tab:not(.active):hover { background: var(--surface); }
        .tab-dot { width: 6px; height: 6px; border-radius: 50%; background: #16a34a; }
        .provider-tab.active .tab-dot { background: white; }
        .not-connected { padding: 32px 0; text-align: center; color: var(--text-muted); font-size: 13px; }
        .pub-section { display: flex; flex-direction: column; gap: 10px; }
        .pub-section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); }
        .pub-field { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 6px; }
        .pub-label { font-size: 13px; font-weight: 600; }
        .pub-hint { font-size: 11px; color: var(--text-muted); }
        .pub-field input { font-size: 13px; }
        .deploy-btn { padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 700; background: var(--accent); color: white; transition: opacity 0.15s; }
        .deploy-btn:disabled { opacity: 0.4; cursor: default; }
        .deploy-btn:hover:not(:disabled) { opacity: 0.85; }
        .pub-error { padding: 12px 14px; background: #fef2f2; color: #dc2626; font-size: 13px; border-radius: 8px; border: 1px solid #fecaca; }
        .pub-result-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
        .result-state { font-size: 14px; font-weight: 700; }
        .result-state[data-state="READY"] { color: #16a34a; }
        .result-state[data-state="ERROR"] { color: #dc2626; }
        .result-url { font-size: 13px; color: var(--accent); text-decoration: underline; word-break: break-all; }
        .result-id { font-size: 11px; color: var(--text-muted); font-family: 'SFMono-Regular', monospace; }
        .domain-row { display: flex; gap: 6px; align-items: center; }
        .domain-row input { flex: 1; font-size: 13px; }
        .domain-add-btn, .domain-check-btn { padding: 7px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; white-space: nowrap; }
        .domain-add-btn { background: var(--accent); color: white; }
        .domain-add-btn:disabled { opacity: 0.4; cursor: default; }
        .domain-check-btn { border: 1px solid var(--border); color: var(--text); }
        .domain-check-btn:hover:not(:disabled) { background: var(--bg); }
        .domain-error { font-size: 12px; color: #dc2626; }
        .dns-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
        .dns-status { font-size: 13px; font-weight: 600; }
        .dns-status.ok { color: #16a34a; }
        .dns-status.pending { color: #d97706; }
        .dns-label { font-size: 12px; color: var(--text-muted); }
        .dns-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .dns-table th { text-align: left; color: var(--text-muted); font-weight: 500; padding: 4px 8px 4px 0; border-bottom: 1px solid var(--border); }
        .dns-table td { padding: 6px 8px 6px 0; vertical-align: top; }
        .dns-value { font-family: 'SFMono-Regular', monospace; word-break: break-all; }
      `}</style>
    </main>
  );
}
