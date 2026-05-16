import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SettingsModal from "./SettingsModal";
import { useAppStore } from "../store";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(null),
}));

function Harness({ open }: { open: boolean }) {
  const store = useAppStore(null);
  return <SettingsModal open={open} onOpenChange={() => {}} store={store} />;
}

describe("SettingsModal", () => {
  it("renders nothing when closed", () => {
    render(<Harness open={false} />);
    expect(screen.queryByText("Connections")).not.toBeInTheDocument();
  });

  it("renders the Settings title and connection providers when open", () => {
    render(<Harness open />);
    expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);
    expect(screen.getByText("Vercel")).toBeInTheDocument();
    expect(screen.getByText("GitHub Pages")).toBeInTheDocument();
  });

  it("shows the keyboard shortcut hint in the footer", () => {
    render(<Harness open />);
    expect(screen.getByText(/⌘, to open settings/)).toBeInTheDocument();
  });
});
