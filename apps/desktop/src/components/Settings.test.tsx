import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderHook, act } from "@testing-library/react";
import { mockIPC } from "@tauri-apps/api/mocks";
import Settings from "./Settings";
import { useAppStore } from "../store";
import type { Config } from "../types";

function makeConfig(overrides?: Partial<Config>): Config {
  return {
    schemaVersion: 14,
    profile: { name: "Settings User" },
    blocks: [{ id: "p1", type: "profile", enabled: true }],
    theme: {
      accentColor: "#000",
      backgroundColor: "#fff",
      textColor: "#111",
      buttonStyle: "outline",
      layout: "classic",
    },
    connections: [],
    ...overrides,
  };
}

function setupStore(config: Config) {
  const { result } = renderHook(() => useAppStore(null));
  act(() => result.current.setConfig(config));
  return result;
}

describe("Settings", () => {
  beforeEach(() => {
    mockIPC(() => null);
  });

  it("renders all six provider connection cards", async () => {
    mockIPC(() => null);
    const store = setupStore(makeConfig());
    render(<Settings store={store.current} projectPath="/tmp/proj" />);
    await waitFor(() => {
      expect(screen.getByText("Vercel")).toBeInTheDocument();
    });
    expect(screen.getByText("Cloudflare Pages")).toBeInTheDocument();
    expect(screen.getByText("GitHub Pages")).toBeInTheDocument();
    expect(screen.getByText("Plausible Analytics")).toBeInTheDocument();
    expect(screen.getByText("Anthropic (Claude)")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("Unsplash")).toBeInTheDocument();
  });

  it("shows masked token when a provider is connected", async () => {
    mockIPC((cmd, args) => {
      if (cmd === "get_token" && (args as { provider?: string })?.provider === "vercel") {
        return "abcdefghij1234567890";
      }
      return null;
    });
    const store = setupStore(makeConfig());
    render(<Settings store={store.current} projectPath="/tmp/proj" />);
    await waitFor(() => {
      const masked = screen.getAllByText(/토큰: \*+7890/);
      expect(masked.length).toBeGreaterThan(0);
    });
  });

  it("connect button calls verify_connection then set_token", async () => {
    const calls: { cmd: string; args: unknown }[] = [];
    mockIPC((cmd, args) => {
      calls.push({ cmd, args });
      return null;
    });
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Settings store={store.current} projectPath="/tmp/proj" />);

    // Find the Vercel API token input
    await waitFor(() => screen.getByText("Vercel"));
    const tokenInputs = document.querySelectorAll('input[placeholder^="xxxxxxxxxxxxxxxx"]') as NodeListOf<HTMLInputElement>;
    expect(tokenInputs.length).toBe(1);
    await user.type(tokenInputs[0], "v-token");

    const connectBtns = screen.getAllByRole("button", { name: /^연결$/ });
    await user.click(connectBtns[0]);

    await waitFor(() => {
      expect(calls.some((c) => c.cmd === "verify_connection")).toBe(true);
      expect(calls.some((c) => c.cmd === "set_token")).toBe(true);
    });
  });

  it("Site URL field updates store on blur", async () => {
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Settings store={store.current} projectPath="/tmp/proj" />);

    await waitFor(() => screen.getByText(/Site URL/));
    const input = screen.getByPlaceholderText("https://yourname.vercel.app");
    await user.type(input, "https://opentree.example.com");
    input.blur();

    await waitFor(() => {
      expect(store.current.config?.siteUrl).toBe("https://opentree.example.com");
    });
  });

  it("Analytics provider dropdown sets analytics on Config", async () => {
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Settings store={store.current} projectPath="/tmp/proj" />);

    await waitFor(() => screen.getByText("Analytics"));
    const provider = screen.getByRole("combobox") as HTMLSelectElement;
    await user.selectOptions(provider, "umami");

    await waitFor(() => {
      expect(store.current.config?.analytics?.provider).toBe("umami");
    });
  });

  it("Locale variant '+ Locale 추가' appends an empty variant", async () => {
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Settings store={store.current} projectPath="/tmp/proj" />);

    await waitFor(() => screen.getByText("Locale Variants (다국어 페이지)"));
    expect(store.current.config?.localeVariants?.length ?? 0).toBe(0);
    await user.click(screen.getByRole("button", { name: /Locale 추가/ }));
    expect(store.current.config?.localeVariants?.length).toBe(1);
  });

  it("language picker updates app UI language", async () => {
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Settings store={store.current} projectPath="/tmp/proj" />);

    await waitFor(() => screen.getByText(/한국어/));
    await user.click(screen.getByRole("button", { name: "English" }));
    expect(window.localStorage.getItem("opentree-lang")).toBe("en");
  });

  it("displays project path and schema version under '프로젝트' / '앱 정보'", async () => {
    const store = setupStore(makeConfig());
    render(<Settings store={store.current} projectPath="/tmp/my-project" />);
    await waitFor(() => screen.getByText("/tmp/my-project"));
    expect(screen.getByText("14")).toBeInTheDocument();
  });
});
