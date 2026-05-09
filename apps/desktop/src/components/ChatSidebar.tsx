import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { useAppStore } from "../store";
import type { Block, Config } from "../types";

interface Props {
  store: ReturnType<typeof useAppStore>;
}

interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

interface ChatResponse {
  text: string;
  tool_calls: ToolCall[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  pending?: boolean;
}

type Provider = "anthropic" | "openai";

function summarizeCall(call: ToolCall): string {
  const a = call.args as Record<string, unknown>;
  switch (call.name) {
    case "add_block": {
      const block = a.block as Record<string, unknown> | undefined;
      return `블록 추가 (${block?.type ?? "?"})`;
    }
    case "edit_block": return `블록 수정 (id: ${String(a.id ?? "").slice(0, 8)}…)`;
    case "delete_block": return `블록 삭제 (id: ${String(a.id ?? "").slice(0, 8)}…)`;
    case "reorder_blocks": {
      const ids = (a.ids as string[] | undefined) ?? [];
      return `블록 순서 변경 (${ids.length}개)`;
    }
    case "toggle_block": return `블록 ${a.enabled ? "활성화" : "비활성화"} (id: ${String(a.id ?? "").slice(0, 8)}…)`;
    case "update_theme": return `테마 변경 (${Object.keys(a).join(", ")})`;
    case "update_profile": return `프로필 변경 (${Object.keys(a).join(", ")})`;
    case "set_schedule": {
      const p = a.publishAt ? `→ ${a.publishAt}` : "";
      const u = a.unpublishAt ? `~ ${a.unpublishAt}` : "";
      return `스케줄 설정 (id: ${String(a.id ?? "").slice(0, 8)}…) ${p} ${u}`.trim();
    }
    default: return call.name;
  }
}

function applyCalls(config: Config, calls: ToolCall[]): Config {
  let next = { ...config, blocks: [...config.blocks], profile: { ...config.profile }, theme: { ...config.theme } };
  for (const call of calls) {
    const a = call.args as Record<string, unknown>;
    switch (call.name) {
      case "add_block": {
        const block = a.block as Block | undefined;
        if (!block) break;
        if (!block.id) (block as { id: string }).id = crypto.randomUUID();
        next = { ...next, blocks: [...next.blocks, block] };
        break;
      }
      case "edit_block": {
        const id = a.id as string;
        const patch = (a.patch ?? {}) as Partial<Block>;
        next = {
          ...next,
          blocks: next.blocks.map((b) => b.id === id ? ({ ...b, ...patch } as Block) : b),
        };
        break;
      }
      case "delete_block": {
        const id = a.id as string;
        next = { ...next, blocks: next.blocks.filter((b) => b.id !== id) };
        break;
      }
      case "reorder_blocks": {
        const ids = (a.ids as string[] | undefined) ?? [];
        const map = new Map(next.blocks.map((b) => [b.id, b]));
        const ordered = ids.map((id) => map.get(id)).filter((b): b is Block => !!b);
        const missing = next.blocks.filter((b) => !ids.includes(b.id));
        next = { ...next, blocks: [...ordered, ...missing] };
        break;
      }
      case "toggle_block": {
        const id = a.id as string;
        const enabled = a.enabled as boolean;
        next = {
          ...next,
          blocks: next.blocks.map((b) => b.id === id ? ({ ...b, enabled } as Block) : b),
        };
        break;
      }
      case "update_theme": {
        next = { ...next, theme: { ...next.theme, ...(a as Partial<typeof next.theme>) } };
        break;
      }
      case "update_profile": {
        next = { ...next, profile: { ...next.profile, ...(a as Partial<typeof next.profile>) } };
        break;
      }
      case "set_schedule": {
        const id = a.id as string;
        const publishAt = a.publishAt as string | undefined;
        const unpublishAt = a.unpublishAt as string | undefined;
        const schedules = { ...(next.schedules ?? {}) };
        if (!publishAt && !unpublishAt) {
          delete schedules[id];
        } else {
          schedules[id] = { publishAt, unpublishAt };
        }
        next = { ...next, schedules };
        break;
      }
    }
  }
  return next;
}

export default function ChatSidebar({ store }: Props) {
  const { config } = store;
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [providerConnected, setProviderConnected] = useState<Record<Provider, boolean>>({
    anthropic: false,
    openai: false,
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCalls, setPendingCalls] = useState<ToolCall[] | null>(null);
  const [snapshot, setSnapshot] = useState<Config | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const next = { ...providerConnected };
      for (const p of ["anthropic", "openai"] as Provider[]) {
        try {
          const v = await invoke<string | null>("get_token", { provider: p });
          next[p] = !!v;
        } catch { next[p] = false; }
      }
      setProviderConnected(next);
      if (!next.anthropic && next.openai) setProvider("openai");
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, pendingCalls]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !config || loading) return;
    if (!providerConnected[provider]) {
      setError(`Settings → 연결에서 ${provider === "anthropic" ? "Anthropic" : "OpenAI"} API 키를 추가하세요.`);
      return;
    }
    if (pendingCalls) {
      setError("먼저 대기 중인 변경을 Apply 또는 Cancel 하세요.");
      return;
    }
    const userMsg: Message = { role: "user", content: input.trim() };
    const apiMessages = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, userMsg, { role: "assistant", content: "", pending: true }]);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res: ChatResponse = await invoke("chat_send", {
        provider,
        messages: apiMessages,
        config,
      });
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = {
          role: "assistant",
          content: res.text,
          toolCalls: res.tool_calls,
        };
        return next;
      });
      if (res.tool_calls && res.tool_calls.length > 0) {
        setSnapshot(config);
        setPendingCalls(res.tool_calls);
        const preview = applyCalls(config, res.tool_calls);
        store.setConfig(preview);
      }
    } catch (e) {
      setError(String(e));
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [input, config, loading, provider, providerConnected, messages, pendingCalls, store]);

  const handleApply = useCallback(() => {
    if (!pendingCalls || !snapshot) return;
    const final = config;
    if (!final) return;
    store.setConfig(snapshot);
    store.update(final);
    setPendingCalls(null);
    setSnapshot(null);
  }, [pendingCalls, snapshot, config, store]);

  const handleCancel = useCallback(() => {
    if (!snapshot) return;
    store.setConfig(snapshot);
    setPendingCalls(null);
    setSnapshot(null);
  }, [snapshot, store]);

  return (
    <aside className="chat-sidebar">
      <div className="chat-header">
        <h3 className="chat-title">AI Chat</h3>
        <select
          className="chat-provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as Provider)}
        >
          <option value="anthropic">Claude{providerConnected.anthropic ? " ●" : ""}</option>
          <option value="openai">OpenAI{providerConnected.openai ? " ●" : ""}</option>
        </select>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-hint">
            <p>자연어로 페이지를 편집할 수 있습니다.</p>
            <ul>
              <li>"블랙프라이데이 링크 추가, URL https://..."</li>
              <li>"배경색 어두운 톤으로"</li>
              <li>"Spotify 블록을 맨 위로"</li>
              <li>"이메일 수집 폼 추가"</li>
            </ul>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg-${m.role}`}>
            <div className="chat-msg-role">{m.role === "user" ? "You" : provider === "anthropic" ? "Claude" : "OpenAI"}</div>
            <div className="chat-msg-content">
              {m.pending ? <em style={{ opacity: 0.5 }}>생각 중…</em> : m.content || <em style={{ opacity: 0.5 }}>(텍스트 없음)</em>}
              {m.toolCalls && m.toolCalls.length > 0 && (
                <ul className="chat-tool-list">
                  {m.toolCalls.map((c) => (
                    <li key={c.id}>{summarizeCall(c)}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      {pendingCalls && (
        <div className="chat-pending">
          <div className="chat-pending-msg">
            {pendingCalls.length}개 변경 미리보기 중. Apply하면 undo 스택에 저장됩니다.
          </div>
          <div className="chat-pending-actions">
            <button className="chat-cancel-btn" onClick={handleCancel}>Cancel</button>
            <button className="chat-apply-btn" onClick={handleApply}>Apply</button>
          </div>
        </div>
      )}

      {error && <div className="chat-error">⚠ {error}</div>}

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          rows={2}
          placeholder="요청을 입력하세요…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={loading || !!pendingCalls}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={loading || !input.trim() || !!pendingCalls}
        >
          {loading ? "…" : "전송"}
        </button>
      </div>

      <style>{`
        .chat-sidebar { display: flex; flex-direction: column; background: var(--surface); border-left: 1px solid var(--border); }
        .chat-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid var(--border); }
        .chat-title { font-size: 14px; font-weight: 700; }
        .chat-provider { font-size: 12px; padding: 4px 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); }
        .chat-messages { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 14px; }
        .chat-hint { font-size: 12px; color: var(--text-muted); padding: 12px; background: var(--bg); border-radius: 8px; }
        .chat-hint ul { margin-top: 6px; padding-left: 16px; }
        .chat-hint li { margin-bottom: 4px; }
        .chat-msg { display: flex; flex-direction: column; gap: 4px; }
        .chat-msg-role { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
        .chat-msg-content { font-size: 13px; line-height: 1.5; padding: 10px 12px; border-radius: 8px; white-space: pre-wrap; word-break: break-word; }
        .chat-msg-user .chat-msg-content { background: var(--accent); color: white; align-self: flex-end; max-width: 85%; }
        .chat-msg-user { align-items: flex-end; }
        .chat-msg-assistant .chat-msg-content { background: var(--bg); }
        .chat-tool-list { margin-top: 8px; padding-left: 16px; font-size: 12px; opacity: 0.8; }
        .chat-tool-list li { margin-bottom: 2px; }
        .chat-pending { padding: 12px 16px; background: rgba(245, 158, 11, 0.08); border-top: 1px solid rgba(245, 158, 11, 0.4); display: flex; flex-direction: column; gap: 8px; }
        .chat-pending-msg { font-size: 12px; color: #92400e; }
        .chat-pending-actions { display: flex; gap: 6px; }
        .chat-cancel-btn { flex: 1; padding: 7px; border-radius: 6px; font-size: 12px; font-weight: 600; border: 1px solid var(--border); color: var(--text); }
        .chat-cancel-btn:hover { background: var(--bg); }
        .chat-apply-btn { flex: 1; padding: 7px; border-radius: 6px; font-size: 12px; font-weight: 700; background: var(--accent); color: white; }
        .chat-apply-btn:hover { opacity: 0.85; }
        .chat-error { padding: 10px 14px; background: #fef2f2; color: #dc2626; font-size: 12px; border-top: 1px solid #fecaca; }
        .chat-input-row { display: flex; gap: 6px; padding: 10px 12px; border-top: 1px solid var(--border); }
        .chat-input { flex: 1; resize: none; font-size: 13px; padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text); font-family: inherit; }
        .chat-send-btn { padding: 0 14px; background: var(--accent); color: white; border-radius: 6px; font-size: 12px; font-weight: 600; }
        .chat-send-btn:disabled { opacity: 0.4; cursor: default; }
      `}</style>
    </aside>
  );
}
