import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PhonePreview from "./PhonePreview";
import type { Config } from "../types";

function makeConfig(overrides?: Partial<Config>): Config {
  return {
    schemaVersion: 14,
    profile: { name: "Alice", bio: "hi", avatarUrl: undefined },
    blocks: [
      { id: "p1", type: "profile", enabled: true },
      { id: "h1", type: "heading", enabled: true, text: "Section" },
      { id: "l1", type: "link", enabled: true, title: "GitHub", url: "https://gh.com" },
      { id: "t1", type: "text", enabled: true, content: "Body" },
    ],
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

describe("PhonePreview", () => {
  it("renders profile name + bio when profile block is enabled", () => {
    render(<PhonePreview config={makeConfig()} viewMode="phone" />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("hi")).toBeInTheDocument();
  });

  it("renders link title for link blocks", () => {
    render(<PhonePreview config={makeConfig()} viewMode="phone" />);
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("renders heading and text blocks", () => {
    render(<PhonePreview config={makeConfig()} viewMode="phone" />);
    expect(screen.getByText("Section")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("hides disabled blocks", () => {
    const c = makeConfig();
    c.blocks = c.blocks.map((b) => b.id === "l1" ? { ...b, enabled: false } : b);
    render(<PhonePreview config={c} viewMode="phone" />);
    expect(screen.queryByText("GitHub")).not.toBeInTheDocument();
  });

  it("renders avatar img when avatarUrl is set, placeholder otherwise", () => {
    const { container, rerender } = render(<PhonePreview config={makeConfig()} viewMode="phone" />);
    expect(container.querySelector("img")).toBeNull();

    rerender(<PhonePreview config={makeConfig({ profile: { name: "Alice", avatarUrl: "https://x/a.png" } })} viewMode="phone" />);
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("falls back to placeholder name when profile.name is empty", () => {
    const c = makeConfig({ profile: { name: "" } });
    render(<PhonePreview config={c} viewMode="phone" />);
    expect(screen.getByText("이름")).toBeInTheDocument();
  });

  it("applies theme background/accent colors via inline styles", () => {
    const c = makeConfig({ theme: { ...makeConfig().theme, accentColor: "#ff0000", backgroundColor: "#00ff00", textColor: "#0000ff" } });
    render(<PhonePreview config={c} viewMode="phone" />);
    const surface = screen.getByTestId("preview-surface");
    expect(surface.style.background).toMatch(/rgb\(0,\s*255,\s*0\)|#00ff00/i);
    const link = screen.getByText("GitHub");
    expect(link.style.borderColor).toMatch(/rgb\(255,\s*0,\s*0\)|#ff0000/i);
  });

  it("renders a browser mockup with the page background in desktop mode", () => {
    const c = makeConfig({ theme: { ...makeConfig().theme, backgroundColor: "#00ff00" } });
    render(<PhonePreview config={c} viewMode="desktop" />);
    const surface = screen.getByTestId("preview-surface");
    expect(surface.style.background).toMatch(/rgb\(0,\s*255,\s*0\)|#00ff00/i);
    expect(screen.getByText(/opentree\.me\/Alice/)).toBeInTheDocument();
  });

  it("renders nothing for unsupported block types (e.g. socials)", () => {
    const c = makeConfig();
    c.blocks = [
      { id: "p1", type: "profile", enabled: true },
      { id: "s1", type: "socials", enabled: true, items: [] },
    ];
    const { container } = render(<PhonePreview config={c} viewMode="phone" />);
    expect(container.querySelectorAll("a")).toHaveLength(0);
    expect(screen.queryByText("Section")).not.toBeInTheDocument();
  });
});
