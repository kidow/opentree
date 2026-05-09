import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderHook, act } from "@testing-library/react";
import { mockIPC } from "@tauri-apps/api/mocks";
import Publish from "./Publish";
import { useAppStore } from "../store";
import type { Config } from "../types";

function makeConfig(): Config {
  return {
    schemaVersion: 14,
    profile: { name: "Pub User" },
    blocks: [{ id: "p1", type: "profile", enabled: true }],
    theme: {
      accentColor: "#000",
      backgroundColor: "#fff",
      textColor: "#111",
      buttonStyle: "outline",
      layout: "classic",
    },
    connections: [],
  };
}

function setupStore(config: Config) {
  const { result } = renderHook(() => useAppStore(null));
  act(() => result.current.setConfig(config));
  return result;
}

describe("Publish", () => {
  beforeEach(() => mockIPC(() => null));

  it("renders three provider tabs", async () => {
    const store = setupStore(makeConfig());
    render(<Publish store={store.current} projectPath="/tmp/p" />);
    await waitFor(() => screen.getByText("Vercel"));
    expect(screen.getByText("Cloudflare Pages")).toBeInTheDocument();
    expect(screen.getByText("GitHub Pages")).toBeInTheDocument();
  });

  it("shows 'connect in Settings' when active provider is unconnected", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_token") return null;
      return null;
    });
    const store = setupStore(makeConfig());
    render(<Publish store={store.current} projectPath="/tmp/p" />);
    await waitFor(() => {
      expect(screen.getByText(/Settings.*연결.*Vercel.*연결하세요/)).toBeInTheDocument();
    });
  });

  it("shows project name input + deploy button when provider is connected (Vercel)", async () => {
    mockIPC((cmd, args) => {
      if (cmd === "get_token" && (args as { provider?: string })?.provider === "vercel") return "v-tok";
      return null;
    });
    const store = setupStore(makeConfig());
    render(<Publish store={store.current} projectPath="/tmp/p" />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText("opentree-site")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Vercel.*배포/ })).toBeInTheDocument();
  });

  it("clicking Deploy invokes deploy_vercel with config + projectName + projectPath", async () => {
    const calls: { cmd: string; args: unknown }[] = [];
    mockIPC((cmd, args) => {
      calls.push({ cmd, args });
      if (cmd === "get_token") return "v-tok";
      if (cmd === "deploy_vercel") {
        return { url: "https://opentree-site.vercel.app", id: "dpl_1", state: "READY" };
      }
      return null;
    });
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Publish store={store.current} projectPath="/tmp/proj" />);

    await waitFor(() => screen.getByPlaceholderText("opentree-site"));
    await user.click(screen.getByRole("button", { name: /Vercel.*배포/ }));

    await waitFor(() => {
      expect(calls.some((c) => c.cmd === "deploy_vercel")).toBe(true);
    });
    const dep = calls.find((c) => c.cmd === "deploy_vercel");
    const args = dep!.args as { projectName: string; projectPath: string; config: Config };
    expect(args.projectName).toBe("opentree-site");
    expect(args.projectPath).toBe("/tmp/proj");
    expect(args.config).toBeTruthy();
  });

  it("displays the deploy result URL after a READY response", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_token") return "v-tok";
      if (cmd === "deploy_vercel") {
        return { url: "https://opentree-site.vercel.app", id: "dpl_1", state: "READY" };
      }
      return null;
    });
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Publish store={store.current} projectPath="/tmp/p" />);
    await waitFor(() => screen.getByPlaceholderText("opentree-site"));
    await user.click(screen.getByRole("button", { name: /Vercel.*배포/ }));

    await waitFor(() => {
      expect(screen.getByText("https://opentree-site.vercel.app")).toBeInTheDocument();
    });
    expect(screen.getByText(/배포 완료/)).toBeInTheDocument();
  });

  it("renders deploy error when invoke throws", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_token") return "v-tok";
      if (cmd === "deploy_vercel") throw new Error("Vercel down");
      return null;
    });
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Publish store={store.current} projectPath="/tmp/p" />);
    await waitFor(() => screen.getByPlaceholderText("opentree-site"));
    await user.click(screen.getByRole("button", { name: /Vercel.*배포/ }));
    await waitFor(() => {
      expect(screen.getByText(/Vercel down/)).toBeInTheDocument();
    });
  });

  it("project name is sanitised to lowercase + dashes", async () => {
    mockIPC((cmd) => (cmd === "get_token" ? "v-tok" : null));
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Publish store={store.current} projectPath="/tmp/p" />);
    await waitFor(() => screen.getByPlaceholderText("opentree-site"));
    const input = screen.getByPlaceholderText("opentree-site") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "MY Project!");
    expect(input.value).toMatch(/^[a-z0-9-]+$/);
  });

  it("switching provider clears the previous deploy result", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_token") return "tok";
      if (cmd === "deploy_vercel") {
        return { url: "https://x.vercel.app", id: "1", state: "READY" };
      }
      return null;
    });
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Publish store={store.current} projectPath="/tmp/p" />);
    await waitFor(() => screen.getByPlaceholderText("opentree-site"));
    await user.click(screen.getByRole("button", { name: /Vercel.*배포/ }));
    await waitFor(() => screen.getByText("https://x.vercel.app"));

    await user.click(screen.getByText("Cloudflare Pages"));
    expect(screen.queryByText("https://x.vercel.app")).not.toBeInTheDocument();
  });
});
