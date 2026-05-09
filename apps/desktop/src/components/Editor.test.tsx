import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderHook, act } from "@testing-library/react";
import Editor from "./Editor";
import { useAppStore } from "../store";
import type { Config } from "../types";

function makeConfig(): Config {
  return {
    schemaVersion: 14,
    profile: { name: "Editor User" },
    blocks: [
      { id: "p1", type: "profile", enabled: true },
      { id: "l1", type: "link", enabled: true, title: "GitHub", url: "https://gh.com" },
      { id: "h1", type: "heading", enabled: true, text: "Section" },
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

function setupStore(config: Config | null) {
  const { result } = renderHook(() => useAppStore(null));
  if (config) act(() => result.current.setConfig(config));
  return result;
}

describe("Editor", () => {
  it("returns nothing when config is null", () => {
    const store = setupStore(null);
    const { container } = render(<Editor store={store.current} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one BlockCard per block in config order", () => {
    const store = setupStore(makeConfig());
    render(<Editor store={store.current} />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("Section")).toBeInTheDocument();
  });

  it("opens AddBlockModal when '+ 추가' is clicked", async () => {
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Editor store={store.current} />);
    expect(screen.queryByText("블록 추가")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /추가/ }));
    expect(screen.getByText("블록 추가")).toBeInTheDocument();
  });

  it("appends a new block via AddBlockModal then closes the modal", async () => {
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Editor store={store.current} />);
    await user.click(screen.getByRole("button", { name: /추가/ }));
    await user.click(screen.getByRole("button", { name: /^Heading/ }));
    // modal closes
    expect(screen.queryByText("블록 추가")).not.toBeInTheDocument();
    // new heading block appended
    expect(store.current.config?.blocks.length).toBe(4);
    expect(store.current.config?.blocks[3].type).toBe("heading");
  });

  it("removing a non-profile block via its ✕ deletes it from store", async () => {
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Editor store={store.current} />);
    const removeButtons = document.querySelectorAll(".remove-btn") as NodeListOf<HTMLElement>;
    expect(removeButtons.length).toBe(2); // link + heading; profile has no remove
    await user.click(removeButtons[0]); // remove link
    expect(store.current.config?.blocks.find((b) => b.id === "l1")).toBeUndefined();
  });

  it("toggling a block updates its enabled flag in store", async () => {
    const user = userEvent.setup();
    const store = setupStore(makeConfig());
    render(<Editor store={store.current} />);
    const toggles = document.querySelectorAll(".toggle-btn") as NodeListOf<HTMLElement>;
    // toggle the link block
    const linkToggle = toggles[1];
    await user.click(linkToggle);
    const link = store.current.config?.blocks.find((b) => b.id === "l1");
    expect(link?.enabled).toBe(false);
  });
});
