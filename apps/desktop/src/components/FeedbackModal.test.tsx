import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import FeedbackModal from "./FeedbackModal";

const openExternal = vi.fn().mockResolvedValue(undefined);
vi.mock("@tauri-apps/plugin-shell", () => ({ open: (...a: unknown[]) => openExternal(...a) }));

describe("FeedbackModal", () => {
  beforeEach(() => openExternal.mockClear());

  it("renders nothing when closed", () => {
    render(<FeedbackModal open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText(/Share feedback/)).not.toBeInTheDocument();
  });

  it("renders title, body and actions when open", () => {
    render(<FeedbackModal open onOpenChange={vi.fn()} />);
    expect(screen.getByText(/Share feedback/)).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
    expect(screen.getByText("Go to Issues")).toBeInTheDocument();
  });

  it("opens the issues page externally and closes when Go to Issues is clicked", async () => {
    const onOpenChange = vi.fn();
    render(<FeedbackModal open onOpenChange={onOpenChange} />);
    screen.getByText("Go to Issues").click();
    expect(openExternal).toHaveBeenCalledWith("https://github.com/kidow/opentree/issues");
    await Promise.resolve();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes without opening a browser when Close is clicked", () => {
    const onOpenChange = vi.fn();
    render(<FeedbackModal open onOpenChange={onOpenChange} />);
    screen.getByText("Close").click();
    expect(openExternal).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
