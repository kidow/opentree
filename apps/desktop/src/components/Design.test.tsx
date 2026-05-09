import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderHook, act } from "@testing-library/react";
import { mockIPC } from "@tauri-apps/api/mocks";
import Design from "./Design";
import { useAppStore } from "../store";
import type { Config } from "../types";

function makeConfig(overrides?: Partial<Config>): Config {
  return {
    schemaVersion: 14,
    profile: { name: "Designer" },
    blocks: [{ id: "p1", type: "profile", enabled: true }],
    theme: {
      accentColor: "#000000",
      backgroundColor: "#ffffff",
      textColor: "#222222",
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

describe("Design", () => {
  beforeEach(() => mockIPC(() => null));

  it("renders all six color rows", () => {
    const store = setupStore(makeConfig());
    render(<Design store={store.current} />);
    expect(screen.getByText("Accent")).toBeInTheDocument();
    expect(screen.getByText("Background")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
    expect(screen.getByText("Border")).toBeInTheDocument();
    expect(screen.getByText("Muted")).toBeInTheDocument();
    expect(screen.getByText("Hover")).toBeInTheDocument();
  });

  it("typing a hex into accent updates store", async () => {
    const store = setupStore(makeConfig());
    render(<Design store={store.current} />);
    const hexInputs = document.querySelectorAll("input.color-hex") as NodeListOf<HTMLInputElement>;
    expect(hexInputs.length).toBe(6);
    fireEvent.change(hexInputs[0], { target: { value: "#ff0000" } });
    expect(store.current.config?.theme.accentColor).toBe("#ff0000");
  });

  it("WCAG warning shows when text/background contrast is poor", () => {
    const store = setupStore(makeConfig({
      theme: {
        accentColor: "#888",
        backgroundColor: "#cccccc",
        textColor: "#bbbbbb", // low contrast vs background
        buttonStyle: "outline",
        layout: "classic",
      },
    }));
    render(<Design store={store.current} />);
    expect(screen.getByText(/WCAG AA/)).toBeInTheDocument();
  });

  it("button preset switching updates theme.buttonStyle", async () => {
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Design store={store.current} />);
    await user.click(screen.getByRole("button", { name: "Pill" }));
    expect(store.current.config?.theme.buttonStyle).toBe("pill");
  });

  it("layout preset switching updates theme.layout", async () => {
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Design store={store.current} />);
    await user.click(screen.getByRole("button", { name: /Featured/ }));
    expect(store.current.config?.theme.layout).toBe("featured");
  });

  it("background type switch creates the matching variant", async () => {
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Design store={store.current} />);
    await user.click(screen.getByRole("button", { name: "gradient" }));
    expect(store.current.config?.theme.background?.type).toBe("gradient");

    await user.click(screen.getByRole("button", { name: "image" }));
    expect(store.current.config?.theme.background?.type).toBe("image");

    await user.click(screen.getByRole("button", { name: "video" }));
    expect(store.current.config?.theme.background?.type).toBe("video");

    await user.click(screen.getByRole("button", { name: /단색 \(기본\)/ }));
    expect(store.current.config?.theme.background).toBeUndefined();
  });

  it("font family input writes to theme.fontFamily on blur", async () => {
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Design store={store.current} />);
    const input = screen.getByPlaceholderText("Inter");
    await user.type(input, "Pretendard");
    fireEvent.blur(input);
    expect(store.current.config?.theme.fontFamily).toBe("Pretendard");
  });

  it("custom CSS textarea writes to theme.customCss on blur", () => {
    const store = setupStore(makeConfig());
    render(<Design store={store.current} />);
    const ta = screen.getByPlaceholderText(/letter-spacing/) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: ".x{display:block}" } });
    fireEvent.blur(ta);
    expect(store.current.config?.theme.customCss).toBe(".x{display:block}");
  });

  it("Theme Bundle export populates the textarea with current theme JSON", async () => {
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Design store={store.current} />);
    await user.click(screen.getByRole("button", { name: "내보내기" }));
    const ta = screen.getByPlaceholderText(/accentColor/);
    expect((ta as HTMLTextAreaElement).value).toContain("\"accentColor\"");
    expect((ta as HTMLTextAreaElement).value).toContain("#000000");
  });

  it("Theme Bundle import applies pasted JSON to store theme", async () => {
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Design store={store.current} />);
    const ta = screen.getByPlaceholderText(/accentColor/) as HTMLTextAreaElement;
    const payload = JSON.stringify({
      accentColor: "#333333",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      buttonStyle: "pill",
      layout: "featured",
    });
    fireEvent.change(ta, { target: { value: payload } });
    await user.click(screen.getByRole("button", { name: "적용" }));
    await waitFor(() => {
      expect(store.current.config?.theme.accentColor).toBe("#333333");
      expect(store.current.config?.theme.buttonStyle).toBe("pill");
      expect(store.current.config?.theme.layout).toBe("featured");
    });
  });

  it("Theme Bundle import surfaces an error for invalid JSON", async () => {
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Design store={store.current} />);
    const ta = screen.getByPlaceholderText(/accentColor/) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "not-json" } });
    await user.click(screen.getByRole("button", { name: "적용" }));
    await waitFor(() => {
      expect(screen.getByText(/⚠/)).toBeInTheDocument();
    });
  });

  it("Unsplash search button opens the picker modal", async () => {
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    const { rerender } = render(<Design store={store.current} />);
    await user.click(screen.getByRole("button", { name: "image" }));
    rerender(<Design store={store.current} />);
    const open = await screen.findByRole("button", { name: /Unsplash/ });
    await user.click(open);
    expect(screen.getByPlaceholderText(/검색어/)).toBeInTheDocument();
  });

  it("Unsplash search invokes unsplash_search and renders thumbnails", async () => {
    mockIPC((cmd, args) => {
      if (cmd === "unsplash_search") {
        const a = args as { query: string };
        expect(a.query).toBe("nature");
        return [{
          id: "1",
          thumb_url: "https://thumb",
          regular_url: "https://reg",
          full_url: "https://full",
          photographer: "Jane",
          photographer_url: "https://unsplash.com/@j?utm_source=opentree&utm_medium=referral",
          photo_url: "https://unsplash.com/photos/1?utm_source=opentree&utm_medium=referral",
          alt: "A photo",
        }];
      }
      return null;
    });
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    const { rerender } = render(<Design store={store.current} />);
    await user.click(screen.getByRole("button", { name: "image" }));
    rerender(<Design store={store.current} />);
    const open = await screen.findByRole("button", { name: /Unsplash/ });
    await user.click(open);
    const search = screen.getByPlaceholderText(/검색어/);
    await user.type(search, "nature");
    await user.click(screen.getByRole("button", { name: "검색" }));

    await waitFor(() => {
      expect(screen.getByText("Jane")).toBeInTheDocument();
    });
  });
});
