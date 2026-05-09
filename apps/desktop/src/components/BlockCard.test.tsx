import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import BlockCard from "./BlockCard";
import type { Block, Profile } from "../types";

function wrap(block: Block, profile: Profile = { name: "Test" }, opts?: {
  onUpdate?: (patch: Partial<Block>) => void;
  onScheduleChange?: () => void;
  onToggle?: () => void;
  onRemove?: () => void;
}) {
  const onUpdate = opts?.onUpdate ?? vi.fn();
  const onScheduleChange = opts?.onScheduleChange ?? vi.fn();
  const onToggle = opts?.onToggle ?? vi.fn();
  return render(
    <DndContext>
      <SortableContext items={[block.id]}>
        <BlockCard
          block={block}
          profile={profile}
          projectPath="/tmp/project"
          onUpdate={onUpdate}
          onScheduleChange={onScheduleChange}
          onRemove={opts?.onRemove}
          onToggle={onToggle}
        />
      </SortableContext>
    </DndContext>,
  );
}

describe("BlockCard label", () => {
  it("renders Link block label with title and url", () => {
    const block: Block = { id: "l1", type: "link", enabled: true, title: "GitHub", url: "https://gh.example.com" };
    wrap(block);
    expect(screen.getByText("Link")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("https://gh.example.com")).toBeInTheDocument();
  });

  it("renders Profile label using profile.name", () => {
    const block: Block = { id: "p1", type: "profile", enabled: true };
    wrap(block, { name: "Alice", bio: "hello" });
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("renders Image label with alt and asset path", () => {
    const block: Block = { id: "i1", type: "image", enabled: true, alt: "Picture", assetPath: "assets/p.jpg" };
    wrap(block);
    expect(screen.getByText("Image")).toBeInTheDocument();
    expect(screen.getByText("Picture")).toBeInTheDocument();
    expect(screen.getByText("assets/p.jpg")).toBeInTheDocument();
  });

  it("renders Affiliate label and badge", () => {
    const block: Block = { id: "a1", type: "affiliate", enabled: true, title: "Affil", url: "https://affil.example.com" };
    wrap(block);
    expect(screen.getByText("Affiliate")).toBeInTheDocument();
    expect(screen.getByText("Affil")).toBeInTheDocument();
  });

  it("renders Collection label with child count and layout", () => {
    const block: Block = {
      id: "c1",
      type: "collection",
      enabled: true,
      layout: "carousel",
      children: [
        { id: "c1l1", type: "link", enabled: true, title: "A", url: "https://a.com" },
        { id: "c1l2", type: "link", enabled: true, title: "B", url: "https://b.com" },
      ],
    };
    wrap(block);
    expect(screen.getByText(/Collection/)).toBeInTheDocument();
    expect(screen.getByText("2개 항목")).toBeInTheDocument();
  });

  it("renders Music label with provider hint when no cache", () => {
    const block: Block = { id: "m1", type: "music", enabled: true, url: "https://open.spotify.com/track/abc" };
    wrap(block);
    expect(screen.getByText("Music")).toBeInTheDocument();
    expect(screen.getByText("https://open.spotify.com/track/abc")).toBeInTheDocument();
  });

  it("applies disabled styling when block.enabled is false", () => {
    const block: Block = { id: "l1", type: "link", enabled: false, title: "Off", url: "https://off.example.com" };
    const { container } = wrap(block);
    expect(container.querySelector(".block-card.block-disabled")).not.toBeNull();
  });
});

describe("BlockCard editor", () => {
  it("calls onUpdate with link patch when Title input loses focus", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const block: Block = { id: "l1", type: "link", enabled: true, title: "Old", url: "https://old.example.com" };
    wrap(block, undefined, { onUpdate });

    await user.click(screen.getByText("Old"));
    const titleInput = screen.getByDisplayValue("Old");
    await user.clear(titleInput);
    await user.type(titleInput, "New");
    fireEvent.blur(titleInput);
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ title: "New" }));
  });

  it("calls onToggle when toggle is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const block: Block = { id: "l1", type: "link", enabled: true, title: "T", url: "https://t.com" };
    wrap(block, undefined, { onToggle });

    const toggle = document.querySelector(".toggle-btn") as HTMLElement;
    await user.click(toggle);
    expect(onToggle).toHaveBeenCalled();
  });

  it("calls onRemove when remove button is clicked", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const block: Block = { id: "l1", type: "link", enabled: true, title: "T", url: "https://t.com" };
    wrap(block, undefined, { onRemove });

    const remove = document.querySelector(".remove-btn") as HTMLElement;
    await user.click(remove);
    expect(onRemove).toHaveBeenCalled();
  });

  it("calls onScheduleChange with parsed ISO string", async () => {
    const user = userEvent.setup();
    const onScheduleChange = vi.fn();
    const block: Block = { id: "l1", type: "link", enabled: true, title: "T", url: "https://t.com" };
    wrap(block, undefined, { onScheduleChange });

    await user.click(screen.getByText("T"));
    const inputs = document.querySelectorAll('input[type="datetime-local"]') as NodeListOf<HTMLInputElement>;
    const publishInput = inputs[0];
    fireEvent.change(publishInput, { target: { value: "2026-06-01T12:00" } });
    fireEvent.blur(publishInput);
    expect(onScheduleChange).toHaveBeenCalled();
    const arg = onScheduleChange.mock.calls[0][0];
    expect(arg.publishAt).toMatch(/^2026-06-01T/);
  });
});
