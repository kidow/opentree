import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { useAppStore } from "../store";

interface PlausibleStats {
  visitors: number;
  pageviews: number;
  bounce_rate: number;
  visit_duration: number;
  top_blocks: { block_id: string; visitors: number }[];
}

interface Props {
  store: ReturnType<typeof useAppStore>;
}

type Period = "day" | "7d" | "30d" | "6mo" | "12mo";

const PERIODS: { id: Period; label: string }[] = [
  { id: "day", label: "Today" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "6mo", label: "6mo" },
  { id: "12mo", label: "12mo" },
];

export default function Stats({ store }: Props) {
  const { config } = store;
  const [period, setPeriod] = useState<Period>("7d");
  const [stats, setStats] = useState<PlausibleStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenConnected, setTokenConnected] = useState<boolean | null>(null);

  const enabled = config?.analytics?.provider === "plausible" && !!config?.analytics?.domain;
  const siteId = config?.analytics?.domain ?? "";

  const fetchStats = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res: PlausibleStats = await invoke("fetch_plausible_stats", { siteId, period });
      setStats(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled, siteId, period]);

  useEffect(() => {
    invoke<string | null>("get_token", { provider: "plausible" })
      .then((v) => setTokenConnected(!!v))
      .catch(() => setTokenConnected(false));
  }, []);

  useEffect(() => {
    if (enabled && tokenConnected) fetchStats();
  }, [enabled, tokenConnected, period, fetchStats]);

  const blockMap = new Map(config?.blocks.map((b) => [b.id, b]) ?? []);

  const formatDuration = (s: number) => {
    if (s <= 0) return "0s";
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <main className="stats">
      <div className="stats-header">
        <h2 className="stats-title">Stats</h2>
        <button className="stats-refresh" onClick={fetchStats} disabled={loading || !enabled || !tokenConnected}>
          {loading ? "불러오는 중…" : "새로고침"}
        </button>
      </div>
      <div className="stats-body">
        {!enabled && (
          <div className="stats-empty">
            <p>Settings → Analytics에서 Plausible 추적을 활성화하고 Site ID를 입력하세요.</p>
          </div>
        )}
        {enabled && tokenConnected === false && (
          <div className="stats-empty">
            <p>Settings → 연결에서 Plausible API 토큰을 연결하세요.</p>
          </div>
        )}
        {enabled && tokenConnected && (
          <>
            <div className="stats-period">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  className={`stats-period-btn${period === p.id ? " active" : ""}`}
                  onClick={() => setPeriod(p.id)}
                >{p.label}</button>
              ))}
            </div>

            {error && <div className="stats-error">⚠ {error}</div>}

            {stats && (
              <>
                <div className="stats-kpis">
                  <div className="stats-kpi">
                    <span className="stats-kpi-label">Unique Visitors</span>
                    <span className="stats-kpi-value">{stats.visitors.toLocaleString()}</span>
                  </div>
                  <div className="stats-kpi">
                    <span className="stats-kpi-label">Pageviews</span>
                    <span className="stats-kpi-value">{stats.pageviews.toLocaleString()}</span>
                  </div>
                  <div className="stats-kpi">
                    <span className="stats-kpi-label">Bounce Rate</span>
                    <span className="stats-kpi-value">{stats.bounce_rate.toFixed(0)}%</span>
                  </div>
                  <div className="stats-kpi">
                    <span className="stats-kpi-label">Avg Duration</span>
                    <span className="stats-kpi-value">{formatDuration(stats.visit_duration)}</span>
                  </div>
                </div>

                <section className="stats-section">
                  <h3 className="stats-section-title">Top Blocks</h3>
                  {stats.top_blocks.length === 0 ? (
                    <p className="stats-empty-msg">아직 BlockClick 이벤트가 없습니다. Plausible 대시보드에서 Custom Events 활성화 + 사이트가 배포되어 있어야 합니다.</p>
                  ) : (
                    <table className="stats-table">
                      <thead>
                        <tr><th>Block</th><th>Type</th><th style={{ textAlign: "right" }}>Visitors</th></tr>
                      </thead>
                      <tbody>
                        {stats.top_blocks.map((b) => {
                          const block = blockMap.get(b.block_id);
                          const label = block && "title" in block ? block.title :
                                        block && "label" in block ? block.label :
                                        block && "text" in block ? block.text :
                                        block?.id ?? b.block_id;
                          return (
                            <tr key={b.block_id}>
                              <td className="stats-block-label">{label || b.block_id.slice(0, 8)}</td>
                              <td className="stats-block-type">{block?.type ?? "?"}</td>
                              <td style={{ textAlign: "right" }}>{b.visitors.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>
      <style>{`
        .stats { display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }
        .stats-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 16px; border-bottom: 1px solid var(--border); background: var(--surface); }
        .stats-title { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
        .stats-refresh { padding: 7px 14px; font-size: 12px; font-weight: 600; border: 1px solid var(--border); border-radius: 6px; color: var(--text); }
        .stats-refresh:hover:not(:disabled) { background: var(--bg); }
        .stats-refresh:disabled { opacity: 0.4; cursor: default; }
        .stats-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; }
        .stats-empty { padding: 48px 0; text-align: center; color: var(--text-muted); font-size: 13px; }
        .stats-empty-msg { font-size: 12px; color: var(--text-muted); padding: 16px 0; text-align: center; }
        .stats-period { display: flex; gap: 4px; }
        .stats-period-btn { padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; border: 1px solid var(--border); color: var(--text-muted); }
        .stats-period-btn.active { background: var(--accent); color: white; border-color: var(--accent); }
        .stats-error { padding: 12px 14px; background: #fef2f2; color: #dc2626; font-size: 13px; border-radius: 8px; border: 1px solid #fecaca; }
        .stats-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
        .stats-kpi { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 4px; }
        .stats-kpi-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; }
        .stats-kpi-value { font-size: 22px; font-weight: 700; }
        .stats-section { display: flex; flex-direction: column; gap: 10px; }
        .stats-section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); }
        .stats-table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
        .stats-table th { text-align: left; color: var(--text-muted); font-weight: 500; padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
        .stats-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); }
        .stats-table tr:last-child td { border-bottom: 0; }
        .stats-block-label { font-weight: 500; }
        .stats-block-type { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
      `}</style>
    </main>
  );
}
