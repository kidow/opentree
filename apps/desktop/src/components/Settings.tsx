import { useRef, useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { useAppStore } from "../store";
import type { LocaleVariant } from "../types";
import { useT, useLang, type Lang } from "../i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface Props {
  store: ReturnType<typeof useAppStore>;
  projectPath: string;
}

type Provider = "vercel" | "cloudflare" | "github" | "plausible" | "anthropic" | "openai" | "unsplash";
type SettingsTab = "connections" | "analytics" | "seo" | "variants" | "language" | "site" | "project" | "info";

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
    if (missing) {
      setError(`${missing.label}을(를) 입력하세요.`);
      return;
    }
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
    try {
      await onDisconnect();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
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
          <button className="provider-disconnect-btn" onClick={handleDisconnect} disabled={loading}>
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
          <button className="provider-connect-btn" onClick={handleConnect} disabled={loading}>
            {loading ? "확인 중…" : "연결"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Settings({ store, projectPath }: Props) {
  const { config } = store;
  const t = useT();
  const [lang, setLang] = useLang();
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("connections");
  const siteUrlRef = useRef<HTMLInputElement>(null);
  const [connections, setConnections] = useState<Record<Provider, ConnState>>({
    vercel: { connected: false, masked: "" },
    cloudflare: { connected: false, masked: "" },
    github: { connected: false, masked: "" },
    plausible: { connected: false, masked: "" },
    anthropic: { connected: false, masked: "" },
    openai: { connected: false, masked: "" },
    unsplash: { connected: false, masked: "" },
  });

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    const providers: Provider[] = ["vercel", "cloudflare", "github", "plausible", "anthropic", "openai", "unsplash"];
    const next = { ...connections };
    for (const p of providers) {
      try {
        const val = await invoke<string | null>("get_token", { provider: p });
        if (val) {
          let masked = "";
          if (p === "vercel" || p === "anthropic" || p === "openai" || p === "unsplash") {
            masked = `토큰: ${mask(val)}`;
          } else {
            try {
              const obj = JSON.parse(val);
              if (p === "cloudflare") masked = `토큰: ${mask(obj.token ?? "")} / Account ID: ${mask(obj.accountId ?? "")}`;
              if (p === "github") masked = `토큰: ${mask(obj.token ?? "")} / Repo: ${obj.repo ?? ""}`;
              if (p === "plausible") masked = `토큰: ${mask(obj.token ?? "")}${obj.baseUrl ? ` / Base: ${obj.baseUrl}` : ""}`;
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
        <h2 className="settings-title">{t("settings.title")}</h2>
      </div>
      <div className="settings-body">
        <Tabs value={settingsTab} onValueChange={(v) => setSettingsTab(v as SettingsTab)} className="settings-tabs">
          <TabsList variant="line" className="settings-tabs-list">
            <TabsTrigger value="connections">연결</TabsTrigger>
            <TabsTrigger value="analytics">분석</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="variants">다국어</TabsTrigger>
            <TabsTrigger value="language">언어</TabsTrigger>
            <TabsTrigger value="site">사이트</TabsTrigger>
            <TabsTrigger value="project">프로젝트</TabsTrigger>
            <TabsTrigger value="info">정보</TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="settings-panel">
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
            <ProviderCard
              label="Plausible Analytics"
              hint="plausible.io/settings/api-keys 에서 발급. self-host 사용 시 base URL 입력 (예: https://stats.example.com)."
              fields={[
                { key: "token", label: "API 토큰", placeholder: "Plausible API Key", sensitive: true },
                { key: "baseUrl", label: "Base URL (self-host)", placeholder: "비워두면 plausible.io 사용" },
              ]}
              conn={connections.plausible}
              onConnect={handleConnect("plausible")}
              onDisconnect={handleDisconnect("plausible")}
            />
            <ProviderCard
              label="Anthropic (Claude)"
              hint="console.anthropic.com 에서 API 키 발급. AI Chat 편집 기능에 사용. 사용량은 사용자 본인 구독에서 차감됩니다."
              fields={[{ key: "token", label: "API 키", placeholder: "sk-ant-...", sensitive: true }]}
              conn={connections.anthropic}
              onConnect={handleConnect("anthropic")}
              onDisconnect={handleDisconnect("anthropic")}
            />
            <ProviderCard
              label="OpenAI"
              hint="platform.openai.com/api-keys 에서 발급. AI Chat 편집 기능에 사용. 사용량은 사용자 본인 구독에서 차감됩니다."
              fields={[{ key: "token", label: "API 키", placeholder: "sk-...", sensitive: true }]}
              conn={connections.openai}
              onConnect={handleConnect("openai")}
              onDisconnect={handleDisconnect("openai")}
            />
            <ProviderCard
              label="Unsplash"
              hint="unsplash.com/oauth/applications 에서 신규 앱 등록 후 Access Key 사용. Design → 배경 → 이미지에서 사진 검색 + 자동 어트리뷰션."
              fields={[{ key: "token", label: "Access Key", placeholder: "Unsplash Access Key", sensitive: true }]}
              conn={connections.unsplash}
              onConnect={handleConnect("unsplash")}
              onDisconnect={handleDisconnect("unsplash")}
            />
          </TabsContent>

          <TabsContent value="analytics" className="settings-panel">
            <div className="settings-field">
              <label className="settings-label">Provider</label>
              <p className="settings-hint">
                선택 시 배포된 페이지 head에 해당 추적 스크립트가 주입됩니다. 클릭 추적은 Plausible과 GA4에서만 자동 발송
                (BlockClick 이벤트).
              </p>
              <select
                value={config.analytics?.provider ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    store.update({ ...config, analytics: undefined });
                    return;
                  }
                  const a = config.analytics ?? { provider: v, domain: "" };
                  store.update({ ...config, analytics: { ...a, provider: v } });
                }}
              >
                <option value="">사용 안 함</option>
                <option value="plausible">Plausible (Stats 탭에서 대시보드 제공)</option>
                <option value="umami">Umami</option>
                <option value="fathom">Fathom</option>
                <option value="ga4">Google Analytics 4</option>
                <option value="cf-analytics">Cloudflare Web Analytics</option>
              </select>
            </div>
            {config.analytics?.provider && (
              <>
                <div className="settings-field">
                  <label className="settings-label">
                    {config.analytics.provider === "plausible"
                      ? "Site ID (도메인)"
                      : config.analytics.provider === "umami"
                        ? "Website ID"
                        : config.analytics.provider === "fathom"
                          ? "Site ID"
                          : config.analytics.provider === "ga4"
                            ? "Measurement ID (G-XXXXXXX)"
                            : config.analytics.provider === "cf-analytics"
                              ? "Beacon Token"
                              : "ID"}
                  </label>
                  <p className="settings-hint">
                    {config.analytics.provider === "plausible"
                      ? "Plausible 등록된 사이트 도메인 (예: yourname.com)"
                      : config.analytics.provider === "umami"
                        ? "Umami 대시보드 → Settings → Websites에서 확인"
                        : config.analytics.provider === "fathom"
                          ? "Fathom 대시보드 → Site → Site ID"
                          : config.analytics.provider === "ga4"
                            ? "G-로 시작하는 Measurement ID"
                            : "Cloudflare Web Analytics 토큰"}
                  </p>
                  <input
                    type="text"
                    defaultValue={config.analytics.domain}
                    onBlur={(e) => {
                      const a = config.analytics!;
                      store.update({ ...config, analytics: { ...a, domain: e.target.value.trim() } });
                    }}
                  />
                </div>
                {(config.analytics.provider === "plausible" || config.analytics.provider === "umami") && (
                  <div className="settings-field">
                    <label className="settings-label">Self-host Base URL (선택)</label>
                    <p className="settings-hint">자체 호스팅 인스턴스 URL. 비우면 공식 클라우드 사용.</p>
                    <input
                      type="url"
                      defaultValue={config.analytics.selfHostUrl ?? ""}
                      placeholder={config.analytics.provider === "plausible" ? "https://plausible.io" : "https://cloud.umami.is"}
                      onBlur={(e) => {
                        const a = config.analytics!;
                        const v = e.target.value.trim();
                        store.update({ ...config, analytics: { ...a, selfHostUrl: v || undefined } });
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="seo" className="settings-panel">
            <div className="settings-field">
              <label className="settings-label">{t("seo.metaTitle")}</label>
              <p className="settings-hint">{t("seo.metaTitleHint")}</p>
              <input
                type="text"
                defaultValue={config.seo?.title ?? ""}
                placeholder={config.profile.name}
                onBlur={(e) => {
                  const v = e.target.value.trim() || undefined;
                  store.update({ ...config, seo: { ...(config.seo ?? {}), title: v } });
                }}
              />
            </div>
            <div className="settings-field">
              <label className="settings-label">{t("seo.metaDescription")}</label>
              <p className="settings-hint">{t("seo.metaDescriptionHint")}</p>
              <input
                type="text"
                defaultValue={config.seo?.description ?? ""}
                placeholder=""
                onBlur={(e) => {
                  const v = e.target.value.trim() || undefined;
                  store.update({ ...config, seo: { ...(config.seo ?? {}), description: v } });
                }}
              />
            </div>
            <div className="settings-field">
              <label className="settings-label">{t("seo.ogImage")}</label>
              <p className="settings-hint">{t("seo.ogImageHint")}</p>
              <input
                type="url"
                defaultValue={config.seo?.ogImage ?? ""}
                placeholder="https://..."
                onBlur={(e) => {
                  const v = e.target.value.trim() || undefined;
                  store.update({ ...config, seo: { ...(config.seo ?? {}), ogImage: v } });
                }}
              />
            </div>
            <div className="settings-field">
              <label className="settings-label">{t("seo.locale")}</label>
              <p className="settings-hint">{t("seo.localeHint")}</p>
              <input
                type="text"
                defaultValue={config.locale ?? ""}
                placeholder="en"
                maxLength={5}
                onBlur={(e) => {
                  const v = e.target.value.trim() || undefined;
                  store.update({ ...config, locale: v });
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="variants" className="settings-panel">
            <div className="settings-field">
              <p className="settings-hint">
                각 variant는 추가 locale의 페이지를 <code>/{`{path}`}/index.html</code>에 생성합니다. Profile 오버라이드만 UI에서 편집 가능.
                Block-level 번역은 advanced — opentree.config.json 직접 편집. LanguageSwitcher 블록 추가 시 페이지 간 링크 노출.
              </p>
              {(config.localeVariants ?? []).map((v, i) => (
                <div
                  key={i}
                  style={{
                    borderTop: i > 0 ? "1px solid var(--border)" : "none",
                    paddingTop: i > 0 ? 12 : 0,
                    marginTop: i > 0 ? 12 : 0,
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 6, marginBottom: 6 }}>
                    <input
                      type="text"
                      defaultValue={v.code}
                      placeholder="code (ko)"
                      onBlur={(e) => {
                        const next = [...(config.localeVariants ?? [])];
                        next[i] = { ...next[i], code: e.target.value.trim() };
                        store.update({ ...config, localeVariants: next });
                      }}
                    />
                    <input
                      type="text"
                      defaultValue={v.path}
                      placeholder="path (ko)"
                      onBlur={(e) => {
                        const next = [...(config.localeVariants ?? [])];
                        next[i] = { ...next[i], path: e.target.value.trim().replace(/^\/+|\/+$/g, "") };
                        store.update({ ...config, localeVariants: next });
                      }}
                    />
                    <input
                      type="text"
                      defaultValue={v.label ?? ""}
                      placeholder="label (한국어)"
                      onBlur={(e) => {
                        const next = [...(config.localeVariants ?? [])];
                        next[i] = { ...next[i], label: e.target.value.trim() || undefined };
                        store.update({ ...config, localeVariants: next });
                      }}
                    />
                    <button
                      style={{ color: "#dc2626", fontSize: 12, padding: "0 8px" }}
                      onClick={() => {
                        const next = (config.localeVariants ?? []).filter((_, j) => j !== i);
                        store.update({ ...config, localeVariants: next });
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    <input
                      type="text"
                      defaultValue={v.profile?.name ?? ""}
                      placeholder="profile name override"
                      onBlur={(e) => {
                        const next = [...(config.localeVariants ?? [])];
                        const p = { ...(next[i].profile ?? {}), name: e.target.value || undefined };
                        next[i] = { ...next[i], profile: p };
                        store.update({ ...config, localeVariants: next });
                      }}
                    />
                    <input
                      type="text"
                      defaultValue={v.profile?.bio ?? ""}
                      placeholder="profile bio override"
                      onBlur={(e) => {
                        const next = [...(config.localeVariants ?? [])];
                        const p = { ...(next[i].profile ?? {}), bio: e.target.value || undefined };
                        next[i] = { ...next[i], profile: p };
                        store.update({ ...config, localeVariants: next });
                      }}
                    />
                    <input
                      type="text"
                      defaultValue={v.profile?.avatarUrl ?? ""}
                      placeholder="avatar URL override"
                      onBlur={(e) => {
                        const next = [...(config.localeVariants ?? [])];
                        const p = { ...(next[i].profile ?? {}), avatarUrl: e.target.value || undefined };
                        next[i] = { ...next[i], profile: p };
                        store.update({ ...config, localeVariants: next });
                      }}
                    />
                  </div>
                </div>
              ))}
              <button
                className="provider-connect-btn"
                style={{ marginTop: 8, alignSelf: "flex-start", padding: "6px 14px" }}
                onClick={() => {
                  const variants: LocaleVariant[] = [...(config.localeVariants ?? []), { code: "", path: "", label: "" }];
                  store.update({ ...config, localeVariants: variants });
                }}
              >
                + Locale 추가
              </button>
            </div>
          </TabsContent>

          <TabsContent value="language" className="settings-panel">
            <div className="settings-field">
              <p className="settings-hint">{t("settings.languageHint")}</p>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                {(["ko", "en"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    className="provider-connect-btn"
                    style={{
                      background: lang === l ? "var(--accent)" : "var(--surface)",
                      color: lang === l ? "white" : "var(--text)",
                      border: "1px solid var(--border)",
                      padding: "6px 14px",
                    }}
                    onClick={() => setLang(l)}
                  >
                    {l === "ko" ? "한국어" : "English"}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="site" className="settings-panel">
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
          </TabsContent>

          <TabsContent value="project" className="settings-panel">
            <div className="settings-field">
              <label className="settings-label">프로젝트 폴더</label>
              <div className="settings-path">{projectPath}</div>
            </div>
          </TabsContent>

          <TabsContent value="info" className="settings-panel">
            <div className="settings-info-row">
              <span className="settings-info-key">버전</span>
              <span className="settings-info-val">0.1.0</span>
            </div>
            <div className="settings-info-row">
              <span className="settings-info-key">Schema version</span>
              <span className="settings-info-val">{config.schemaVersion}</span>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <style>{`
        .settings { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; background: var(--bg); }
        .settings-header {
          height: 52px;
          padding: 0 24px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .settings-title { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
        .settings-body { flex: 1; min-height: 0; overflow: hidden; padding: 0; display: flex; flex-direction: column; gap: 0; }
        .settings-tabs { display: flex; flex-direction: column; min-height: 0; flex: 1; }
        .settings-tabs-list { padding: 6px 24px 0; }
        .settings-panel { display: flex; flex: 1; flex-direction: column; gap: 10px; min-height: 0; padding: 0; overflow-y: auto; }
        .settings-panel > * { flex-shrink: 0; }
        .settings-field { background: var(--surface); border: 1px solid var(--border); border-radius: 0; padding: 14px; display: flex; flex-direction: column; gap: 6px; }
        .settings-label { font-size: 13px; font-weight: 600; }
        .settings-hint { font-size: 11px; color: var(--text-muted); line-height: 1.4; }
        .settings-field input { font-size: 13px; margin-top: 2px; }
        .settings-path { font-size: 12px; color: var(--text-muted); font-family: 'SFMono-Regular', monospace; word-break: break-all; background: var(--bg); padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border); }
        .settings-info-row { display: flex; justify-content: space-between; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: 0; padding: 12px 14px; }
        .settings-info-key { font-size: 13px; font-weight: 500; }
        .settings-info-val { font-size: 13px; color: var(--text-muted); font-family: 'SFMono-Regular', monospace; }
        .provider-card { background: var(--surface); border: 1px solid var(--border); border-radius: 0; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
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
