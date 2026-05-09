import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderHook, act } from "@testing-library/react";
import { mockIPC } from "@tauri-apps/api/mocks";
import ChatSidebar from "./ChatSidebar";
import { useAppStore } from "../store";
import type { Config } from "../types";

function makeConfig(): Config {
  return {
    schemaVersion: 14,
    profile: { name: "Chat User" },
    blocks: [
      { id: "p1", type: "profile", enabled: true },
      { id: "l1", type: "link", enabled: true, title: "GitHub", url: "https://gh.com" },
    ],
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

describe("ChatSidebar", () => {
  beforeEach(() => mockIPC(() => null));

  it("renders title and provider dropdown", async () => {
    const store = setupStore(makeConfig());
    render(<ChatSidebar store={store.current} />);
    await waitFor(() => screen.getByText("AI Chat"));
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows usage hints when there are no messages", () => {
    const store = setupStore(makeConfig());
    render(<ChatSidebar store={store.current} />);
    expect(screen.getByText(/자연어로 페이지를 편집/)).toBeInTheDocument();
    expect(screen.getByText(/블랙프라이데이/)).toBeInTheDocument();
  });

  it("send button is disabled while input is empty", () => {
    const store = setupStore(makeConfig());
    render(<ChatSidebar store={store.current} />);
    const sendBtn = screen.getByRole("button", { name: /전송/ });
    expect(sendBtn).toBeDisabled();
  });

  it("blocks send when no provider connected and surfaces an error", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_token") return null;
      return null;
    });
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<ChatSidebar store={store.current} />);

    const ta = screen.getByPlaceholderText(/요청을 입력/);
    await user.type(ta, "Hello");
    await user.click(screen.getByRole("button", { name: /전송/ }));

    await waitFor(() => {
      expect(screen.getByText(/Settings.*연결.*Anthropic/)).toBeInTheDocument();
    });
  });

  it("invokes chat_send with messages + config when sending", async () => {
    const calls: { cmd: string; args: unknown }[] = [];
    mockIPC((cmd, args) => {
      calls.push({ cmd, args });
      if (cmd === "get_token") return "TOK";
      if (cmd === "chat_send") {
        return { text: "Done.", tool_calls: [] };
      }
      return null;
    });
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<ChatSidebar store={store.current} />);

    await waitFor(() => screen.getByText("AI Chat"));
    const ta = screen.getByPlaceholderText(/요청을 입력/);
    await user.type(ta, "Add a link to my Github");
    await user.click(screen.getByRole("button", { name: /전송/ }));

    await waitFor(() => {
      expect(calls.some((c) => c.cmd === "chat_send")).toBe(true);
    });
    const payload = calls.find((c) => c.cmd === "chat_send")!.args as {
      provider: string;
      messages: { role: string; content: string }[];
      config: Config;
    };
    expect(payload.provider).toBe("anthropic");
    expect(payload.messages[payload.messages.length - 1]?.content).toBe("Add a link to my Github");
    expect(payload.config.profile.name).toBe("Chat User");
  });

  it("shows assistant text reply after chat_send returns", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_token") return "TOK";
      if (cmd === "chat_send") return { text: "Got it!", tool_calls: [] };
      return null;
    });
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<ChatSidebar store={store.current} />);
    await waitFor(() => screen.getByText("AI Chat"));
    await user.type(screen.getByPlaceholderText(/요청을 입력/), "hi");
    await user.click(screen.getByRole("button", { name: /전송/ }));
    await waitFor(() => {
      expect(screen.getByText("Got it!")).toBeInTheDocument();
    });
  });

  it("renders pending tool call summary and Apply/Cancel buttons", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_token") return "TOK";
      if (cmd === "chat_send") {
        return {
          text: "Adding link.",
          tool_calls: [{
            id: "t1",
            name: "add_block",
            args: { block: { type: "link", title: "X", url: "https://x" } },
          }],
        };
      }
      return null;
    });
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<ChatSidebar store={store.current} />);
    await waitFor(() => screen.getByText("AI Chat"));
    await user.type(screen.getByPlaceholderText(/요청을 입력/), "add link");
    await user.click(screen.getByRole("button", { name: /전송/ }));

    await waitFor(() => {
      expect(screen.getByText(/블록 추가 \(link\)/)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("Cancel reverts pending preview", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_token") return "TOK";
      if (cmd === "chat_send") {
        return {
          text: "Doing it",
          tool_calls: [{
            id: "t1",
            name: "delete_block",
            args: { id: "l1" },
          }],
        };
      }
      return null;
    });
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    const before = store.current.config?.blocks.length;
    render(<ChatSidebar store={store.current} />);
    await waitFor(() => screen.getByText("AI Chat"));
    await user.type(screen.getByPlaceholderText(/요청을 입력/), "delete");
    await user.click(screen.getByRole("button", { name: /전송/ }));
    await waitFor(() => screen.getByRole("button", { name: "Cancel" }));

    // pending applied — preview blocks reduced
    expect(store.current.config?.blocks.length).toBe(before! - 1);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // Cancel restores snapshot
    expect(store.current.config?.blocks.length).toBe(before);
  });

  it("Apply dismisses the pending UI", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_token") return "TOK";
      if (cmd === "chat_send") {
        return {
          text: "Done.",
          tool_calls: [{
            id: "t1",
            name: "update_profile",
            args: { name: "Renamed" },
          }],
        };
      }
      return null;
    });
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<ChatSidebar store={store.current} />);
    await waitFor(() => screen.getByText("AI Chat"));
    await user.type(screen.getByPlaceholderText(/요청을 입력/), "rename");
    await user.click(screen.getByRole("button", { name: /전송/ }));
    await waitFor(() => screen.getByRole("button", { name: "Apply" }));

    await user.click(screen.getByRole("button", { name: "Apply" }));

    // Pending UI cleared
    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("Enter without shift submits the message", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_token") return "TOK";
      if (cmd === "chat_send") return { text: "ok", tool_calls: [] };
      return null;
    });
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<ChatSidebar store={store.current} />);
    await waitFor(() => screen.getByText("AI Chat"));
    const ta = screen.getByPlaceholderText(/요청을 입력/) as HTMLTextAreaElement;
    await user.type(ta, "hello");
    fireEvent.keyDown(ta, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByText("ok")).toBeInTheDocument();
    });
  });

  it("displays an error block when chat_send throws", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_token") return "TOK";
      if (cmd === "chat_send") throw new Error("API limit");
      return null;
    });
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<ChatSidebar store={store.current} />);
    await waitFor(() => screen.getByText("AI Chat"));
    await user.type(screen.getByPlaceholderText(/요청을 입력/), "hi");
    await user.click(screen.getByRole("button", { name: /전송/ }));
    await waitFor(() => {
      expect(screen.getByText(/API limit/)).toBeInTheDocument();
    });
  });
});
