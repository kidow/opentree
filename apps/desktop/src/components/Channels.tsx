import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openExternal } from "@tauri-apps/plugin-shell";

const GUIDE_URL = "https://opentree.page/docs/channels";

interface ChannelAccount {
  id: string;
  platform: string;
  handle: string;
  title: string;
  thumbnailUrl: string;
  url: string;
}

interface ChannelSnapshot {
  accountId: string;
  date: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  fetchedAt: string;
}

interface ChannelVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  url: string;
}

interface ChannelStore {
  accounts: ChannelAccount[];
  snapshots: ChannelSnapshot[];
  videos: Record<string, ChannelVideo[]>;
}

const AUTO_REFRESH_MS = 6 * 60 * 60 * 1000;

function snapshotsFor(store: ChannelStore, accountId: string): ChannelSnapshot[] {
  return store.snapshots
    .filter((s) => s.accountId === accountId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 240;
  const h = 44;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / span) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg className="ch-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts.join(" ")} fill="none" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}

function formatNum(n: number): string {
  return n.toLocaleString();
}

function formatDelta(n: number): string {
  if (n === 0) return "0";
  return n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString();
}

export default function Channels() {
  const [store, setStore] = useState<ChannelStore | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [channelUrl, setChannelUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  const refresh = useCallback(async (accountId: string) => {
    setRefreshing(accountId);
    setError(null);
    try {
      const next: ChannelStore = await invoke("channels_refresh", { accountId });
      setStore(next);
    } catch (e) {
      setError(String(e));
    } finally {
      setRefreshing(null);
    }
  }, []);

  useEffect(() => {
    invoke<ChannelStore>("channels_list")
      .then((s) => {
        setStore(s);
        if (autoRan.current) return;
        autoRan.current = true;
        const now = Date.now();
        for (const acc of s.accounts) {
          const snaps = snapshotsFor(s, acc.id);
          const last = snaps[snaps.length - 1];
          const stale = !last || now - new Date(last.fetchedAt).getTime() > AUTO_REFRESH_MS;
          if (stale) void refresh(acc.id);
        }
      })
      .catch((e) => setError(String(e)));
  }, [refresh]);

  const connect = useCallback(async () => {
    if (!apiKey.trim() || !channelUrl.trim()) return;
    setConnecting(true);
    setError(null);
    try {
      const next: ChannelStore = await invoke("channels_connect_youtube", {
        apiKey: apiKey.trim(),
        channelUrl: channelUrl.trim(),
      });
      setStore(next);
      setApiKey("");
      setChannelUrl("");
    } catch (e) {
      setError(String(e));
    } finally {
      setConnecting(false);
    }
  }, [apiKey, channelUrl]);

  const disconnect = useCallback(async (accountId: string) => {
    setError(null);
    try {
      const next: ChannelStore = await invoke("channels_disconnect", { accountId });
      setStore(next);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const accounts = store?.accounts ?? [];

  return (
    <main className="channels">
      <div className="channels-header">
        <h2 className="channels-title">Channels</h2>
      </div>
      <div className="channels-body">
        {error && <div className="channels-error">⚠ {error}</div>}

        {accounts.map((acc) => {
          const snaps = store ? snapshotsFor(store, acc.id) : [];
          const last = snaps[snaps.length - 1];
          const prev = snaps[snaps.length - 2];
          const videos = store?.videos[acc.id] ?? [];
          return (
            <section key={acc.id} className="ch-card">
              <div className="ch-card-head">
                {acc.thumbnailUrl && (
                  <img className="ch-avatar" src={acc.thumbnailUrl} alt="" />
                )}
                <div className="ch-id">
                  <a className="ch-name" href={acc.url} target="_blank" rel="noreferrer">
                    {acc.title}
                  </a>
                  <span className="ch-handle">{acc.handle}</span>
                </div>
                <span className="ch-platform">YouTube</span>
                <button
                  className="ch-btn"
                  onClick={() => void refresh(acc.id)}
                  disabled={refreshing === acc.id}
                >
                  {refreshing === acc.id ? "불러오는 중…" : "새로고침"}
                </button>
                <button className="ch-btn ch-btn-danger" onClick={() => void disconnect(acc.id)}>
                  연결 해제
                </button>
              </div>

              {last && (
                <div className="ch-metrics">
                  <div className="ch-metric">
                    <span className="ch-metric-label">구독자</span>
                    <span className="ch-metric-value">{formatNum(last.subscribers)}</span>
                    {prev && (
                      <span className="ch-metric-delta">
                        {formatDelta(last.subscribers - prev.subscribers)}
                      </span>
                    )}
                  </div>
                  <div className="ch-metric">
                    <span className="ch-metric-label">총 조회수</span>
                    <span className="ch-metric-value">{formatNum(last.totalViews)}</span>
                  </div>
                  <div className="ch-metric">
                    <span className="ch-metric-label">영상 수</span>
                    <span className="ch-metric-value">{formatNum(last.videoCount)}</span>
                  </div>
                </div>
              )}

              {snaps.length >= 2 && (
                <div className="ch-section">
                  <h3 className="ch-section-title">구독자 추이</h3>
                  <Sparkline values={snaps.map((s) => s.subscribers)} />
                  <span className="ch-spark-range">
                    {snaps[0].date} → {snaps[snaps.length - 1].date}
                  </span>
                </div>
              )}

              {videos.length > 0 && (
                <div className="ch-section">
                  <h3 className="ch-section-title">최신 영상</h3>
                  <div className="ch-videos">
                    {videos.map((v) => (
                      <a
                        key={v.id}
                        className="ch-video"
                        href={v.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {v.thumbnailUrl && (
                          <img className="ch-video-thumb" src={v.thumbnailUrl} alt="" />
                        )}
                        <span className="ch-video-title">{v.title}</span>
                        <span className="ch-video-date">{v.publishedAt.slice(0, 10)}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}

        <section className="ch-card ch-connect">
          <h3 className="ch-section-title">YouTube 채널 연결</h3>
          <p className="ch-connect-hint">
            Google Cloud Console에서 YouTube Data API v3를 활성화하고 API 키를 발급하세요.{" "}
            <button
              type="button"
              className="ch-guide-link"
              onClick={() => { void openExternal(GUIDE_URL).catch(() => {}); }}
            >
              연결 가이드 보기 →
            </button>
          </p>
          <label className="ch-field">
            <span className="ch-field-label">API 키</span>
            <input
              className="ch-input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza…"
              spellCheck={false}
            />
          </label>
          <label className="ch-field">
            <span className="ch-field-label">채널 URL</span>
            <input
              className="ch-input"
              type="text"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder="https://www.youtube.com/@핸들"
              spellCheck={false}
            />
          </label>
          <button
            className="ch-btn ch-btn-primary"
            onClick={() => void connect()}
            disabled={connecting || !apiKey.trim() || !channelUrl.trim()}
          >
            {connecting ? "연결 중…" : "연결"}
          </button>
        </section>
      </div>
      <style>{`
        .channels { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; background: var(--bg); }
        .channels-header {
          height: 52px; padding: 0 24px; border-bottom: 1px solid var(--border);
          background: var(--surface); box-sizing: border-box; display: flex; align-items: center;
        }
        .channels-title { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
        .channels-body { flex: 1; min-height: 0; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
        .channels-error { padding: 12px 14px; background: #fef2f2; color: #dc2626; font-size: 13px; border: 1px solid #fecaca; border-radius: 8px; }
        .ch-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
        .ch-card-head { display: flex; align-items: center; gap: 10px; }
        .ch-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
        .ch-id { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .ch-name { font-size: 14px; font-weight: 700; color: var(--text); text-decoration: none; }
        .ch-name:hover { text-decoration: underline; }
        .ch-handle { font-size: 12px; color: var(--text-muted); }
        .ch-platform { margin-left: auto; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .ch-btn { padding: 6px 12px; font-size: 12px; font-weight: 600; border: 1px solid var(--border); border-radius: 6px; color: var(--text); }
        .ch-btn:hover:not(:disabled) { background: var(--bg); }
        .ch-btn:disabled { opacity: 0.4; cursor: default; }
        .ch-btn-danger { color: #dc2626; }
        .ch-btn-primary { background: var(--accent); color: white; border-color: var(--accent); align-self: flex-start; }
        .ch-btn-primary:hover:not(:disabled) { opacity: 0.9; background: var(--accent); }
        .ch-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
        .ch-metric { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 3px; }
        .ch-metric-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
        .ch-metric-value { font-size: 20px; font-weight: 700; }
        .ch-metric-delta { font-size: 12px; font-weight: 600; color: var(--accent); }
        .ch-section { display: flex; flex-direction: column; gap: 8px; }
        .ch-section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); }
        .ch-spark { width: 100%; max-width: 320px; height: 44px; }
        .ch-spark-range { font-size: 11px; color: var(--text-muted); }
        .ch-videos { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
        .ch-video { display: flex; flex-direction: column; gap: 4px; text-decoration: none; color: var(--text); }
        .ch-video-thumb { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 6px; border: 1px solid var(--border); }
        .ch-video-title { font-size: 12px; font-weight: 500; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .ch-video:hover .ch-video-title { text-decoration: underline; }
        .ch-video-date { font-size: 11px; color: var(--text-muted); }
        .ch-connect-hint { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
        .ch-guide-link { font-size: 12px; font-weight: 600; color: var(--accent); }
        .ch-guide-link:hover { text-decoration: underline; }
        .ch-field { display: flex; flex-direction: column; gap: 4px; }
        .ch-field-label { font-size: 12px; font-weight: 600; color: var(--text); }
        .ch-input { padding: 8px 10px; font-size: 13px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text); }
        .ch-input:focus { outline: none; border-color: var(--accent); }
      `}</style>
    </main>
  );
}
