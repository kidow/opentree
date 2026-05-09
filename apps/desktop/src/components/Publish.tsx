import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { useAppStore } from "../store";

interface DeployResult {
  url: string;
  id: string;
  state: string;
}

interface Props {
  store: ReturnType<typeof useAppStore>;
}

export default function Publish({ store }: Props) {
  const [token, setToken] = useState("");
  const [tokenSaved, setTokenSaved] = useState(false);
  const [projectName, setProjectName] = useState("opentree-site");
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<DeployResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollState, setPollState] = useState<string | null>(null);

  const { config } = store;

  useEffect(() => {
    invoke<string | null>("get_token", { provider: "vercel" }).then((t) => {
      if (t) { setToken(t); setTokenSaved(true); }
    }).catch(() => {});
  }, []);

  const handleSaveToken = useCallback(async () => {
    if (!token.trim()) return;
    await invoke("set_token", { provider: "vercel", token: token.trim() });
    setTokenSaved(true);
  }, [token]);

  const handleDeploy = useCallback(async () => {
    if (!config || !tokenSaved) return;
    setDeploying(true);
    setError(null);
    setResult(null);
    setPollState(null);
    try {
      const res: DeployResult = await invoke("deploy_vercel", {
        config,
        projectName: projectName.trim() || "opentree-site",
      });
      setResult(res);
      // Poll until READY
      if (res.state !== "READY") {
        pollDeployState(res.id);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setDeploying(false);
    }
  }, [config, tokenSaved, projectName]);

  const pollDeployState = async (id: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const state: string = await invoke("check_deploy_state", { deployId: id });
        setPollState(state);
        if (state === "READY" || state === "ERROR" || attempts > 30) {
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
      }
    }, 3000);
  };

  const deployState = pollState ?? result?.state;

  return (
    <main className="publish">
      <div className="publish-header">
        <h2 className="publish-title">Publish</h2>
      </div>
      <div className="publish-body">

        <section className="pub-section">
          <h3 className="pub-section-title">Vercel</h3>

          <div className="pub-field">
            <label className="pub-label">API 토큰</label>
            <p className="pub-hint">
              <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer">
                vercel.com/account/tokens
              </a>에서 발급
            </p>
            <div className="token-row">
              <input
                type="password"
                value={token}
                onChange={(e) => { setToken(e.target.value); setTokenSaved(false); }}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <button
                className="token-save-btn"
                onClick={handleSaveToken}
                disabled={!token.trim() || tokenSaved}
              >
                {tokenSaved ? "저장됨 ✓" : "저장"}
              </button>
            </div>
          </div>

          <div className="pub-field">
            <label className="pub-label">프로젝트 이름</label>
            <p className="pub-hint">Vercel 프로젝트명. 소문자, 하이픈만 허용.</p>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              placeholder="opentree-site"
            />
          </div>

          <button
            className="deploy-btn"
            onClick={handleDeploy}
            disabled={deploying || !tokenSaved || !config}
          >
            {deploying ? "배포 중…" : "Vercel에 배포"}
          </button>
        </section>

        {error && (
          <div className="pub-error">⚠ {error}</div>
        )}

        {result && (
          <section className="pub-result">
            <h3 className="pub-section-title">배포 결과</h3>
            <div className="pub-result-card">
              <div className="result-state" data-state={deployState}>
                {deployState === "READY" ? "✓ 배포 완료" :
                 deployState === "ERROR" ? "✕ 배포 실패" :
                 "⏳ 배포 중…"}
              </div>
              {deployState === "READY" && (
                <a
                  className="result-url"
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {result.url}
                </a>
              )}
              <div className="result-id">ID: {result.id}</div>
            </div>
          </section>
        )}

      </div>
      <style>{`
        .publish {
          display: flex; flex-direction: column;
          overflow: hidden; background: var(--bg);
        }
        .publish-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
        }
        .publish-title {
          font-size: 18px; font-weight: 700; letter-spacing: -0.02em;
        }
        .publish-body {
          flex: 1; overflow-y: auto; padding: 20px 24px;
          display: flex; flex-direction: column; gap: 20px;
        }
        .pub-section { display: flex; flex-direction: column; gap: 10px; }
        .pub-section-title {
          font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.07em; color: var(--text-muted);
        }
        .pub-field {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 10px; padding: 14px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .pub-label { font-size: 13px; font-weight: 600; }
        .pub-hint { font-size: 11px; color: var(--text-muted); }
        .pub-hint a { color: var(--accent); text-decoration: underline; }
        .token-row { display: flex; gap: 8px; align-items: center; }
        .token-row input { flex: 1; font-size: 13px; }
        .token-save-btn {
          padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: 600;
          background: var(--accent); color: white; white-space: nowrap;
          transition: opacity 0.15s;
        }
        .token-save-btn:disabled { opacity: 0.4; cursor: default; }
        .pub-field input { font-size: 13px; }
        .deploy-btn {
          padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 700;
          background: var(--accent); color: white; transition: opacity 0.15s;
        }
        .deploy-btn:disabled { opacity: 0.4; cursor: default; }
        .deploy-btn:hover:not(:disabled) { opacity: 0.85; }
        .pub-error {
          padding: 12px 14px; background: #fef2f2; color: #dc2626;
          font-size: 13px; border-radius: 8px; border: 1px solid #fecaca;
        }
        .pub-result-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 10px; padding: 16px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .result-state {
          font-size: 14px; font-weight: 700;
        }
        .result-state[data-state="READY"] { color: #16a34a; }
        .result-state[data-state="ERROR"] { color: #dc2626; }
        .result-url {
          font-size: 13px; color: var(--accent);
          text-decoration: underline; word-break: break-all;
        }
        .result-id {
          font-size: 11px; color: var(--text-muted);
          font-family: 'SFMono-Regular', monospace;
        }
      `}</style>
    </main>
  );
}
