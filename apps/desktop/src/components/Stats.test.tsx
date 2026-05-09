import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockIPC } from "@tauri-apps/api/mocks";
import Stats from "./Stats";
import { useAppStore } from "../store";
import { renderHook, act } from "@testing-library/react";
import type { Config } from "../types";

function configWithAnalytics(): Config {
  return {
    schemaVersion: 14,
    profile: { name: "X" },
    blocks: [
      { id: "p1", type: "profile", enabled: true },
      { id: "l1", type: "link", enabled: true, title: "GitHub", url: "https://gh.com" },
    ],
    theme: {
      accentColor: "#000", backgroundColor: "#fff", textColor: "#000",
      buttonStyle: "outline", layout: "classic",
    },
    connections: [],
    analytics: { provider: "plausible", domain: "example.com" },
  };
}

function configWithoutAnalytics(): Config {
  const c = configWithAnalytics();
  delete c.analytics;
  return c;
}

function setupStore(config: Config | null) {
  const { result } = renderHook(() => useAppStore(null));
  if (config) act(() => result.current.setConfig(config));
  return result;
}

describe("Stats", () => {
  beforeEach(() => {
    mockIPC(() => null);
  });

  it("shows 'enable analytics' message when analytics is unset", () => {
    const store = setupStore(configWithoutAnalytics());
    render(<Stats store={store.current} />);
    expect(screen.getByText(/Plausible 추적을 활성화/)).toBeInTheDocument();
  });

  it("shows 'connect Plausible token' when analytics is on but token missing", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_token") return null;
      return null;
    });
    const store = setupStore(configWithAnalytics());
    render(<Stats store={store.current} />);
    await waitFor(() => {
      expect(screen.getByText(/Plausible API 토큰을 연결하세요/)).toBeInTheDocument();
    });
  });

  it("renders KPI numbers from fetch_plausible_stats", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_token") return "tok-123";
      if (cmd === "fetch_plausible_stats") {
        return {
          visitors: 1234,
          pageviews: 5678,
          bounce_rate: 42.5,
          visit_duration: 125,
          top_blocks: [{ block_id: "l1", visitors: 99 }],
        };
      }
      return null;
    });
    const store = setupStore(configWithAnalytics());
    render(<Stats store={store.current} />);

    await waitFor(() => {
      expect(screen.getByText("1,234")).toBeInTheDocument();
      expect(screen.getByText("5,678")).toBeInTheDocument();
    });
    expect(screen.getByText("43%")).toBeInTheDocument();
    expect(screen.getByText("2m 5s")).toBeInTheDocument();
    expect(screen.getByText("99")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("re-fetches when period changes", async () => {
    const calls: { cmd: string; args: unknown }[] = [];
    mockIPC((cmd, args) => {
      calls.push({ cmd, args });
      if (cmd === "get_token") return "tok-123";
      if (cmd === "fetch_plausible_stats") {
        return { visitors: 0, pageviews: 0, bounce_rate: 0, visit_duration: 0, top_blocks: [] };
      }
      return null;
    });
    const user = userEvent.setup();
    const store = setupStore(configWithAnalytics());
    render(<Stats store={store.current} />);

    await waitFor(() => {
      expect(calls.some((c) => c.cmd === "fetch_plausible_stats")).toBe(true);
    });
    const initialFetches = calls.filter((c) => c.cmd === "fetch_plausible_stats").length;

    await user.click(screen.getByText("30d"));
    await waitFor(() => {
      const after = calls.filter((c) => c.cmd === "fetch_plausible_stats").length;
      expect(after).toBeGreaterThan(initialFetches);
    });

    const fetchCalls = calls.filter((c) => c.cmd === "fetch_plausible_stats");
    const lastFetch = fetchCalls[fetchCalls.length - 1];
    expect((lastFetch?.args as { period?: string })?.period).toBe("30d");
  });

  it("displays an error when fetch fails", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_token") return "tok-123";
      if (cmd === "fetch_plausible_stats") {
        throw new Error("API down");
      }
      return null;
    });
    const store = setupStore(configWithAnalytics());
    render(<Stats store={store.current} />);
    await waitFor(() => {
      expect(screen.getByText(/API down/)).toBeInTheDocument();
    });
  });

  it("refresh button calls fetch_plausible_stats again", async () => {
    let fetches = 0;
    mockIPC((cmd) => {
      if (cmd === "get_token") return "tok-123";
      if (cmd === "fetch_plausible_stats") {
        fetches += 1;
        return { visitors: 0, pageviews: 0, bounce_rate: 0, visit_duration: 0, top_blocks: [] };
      }
      return null;
    });
    const user = userEvent.setup();
    const store = setupStore(configWithAnalytics());
    render(<Stats store={store.current} />);
    await waitFor(() => expect(fetches).toBeGreaterThan(0));
    const before = fetches;
    await user.click(screen.getByRole("button", { name: /새로고침/ }));
    await waitFor(() => expect(fetches).toBeGreaterThan(before));
  });
});
