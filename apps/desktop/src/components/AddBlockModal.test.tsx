import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddBlockModal from "./AddBlockModal";
import type { Block } from "../types";

describe("AddBlockModal", () => {
  it("lists every supported block type", async () => {
    const onAdd = vi.fn();
    const onClose = vi.fn();
    render(<AddBlockModal onAdd={onAdd} onClose={onClose} />);

    const expected = [
      "Link", "Heading", "Text", "Socials", "Image", "Music",
      "Video", "Pinterest", "Collection", "Footer", "Affiliate",
      "Sponsored", "Custom HTML", "Form", "Email Signup",
      "Commerce", "Support Me", "Course", "Language Switcher",
    ];
    for (const label of expected) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("emits a Link block with title/url defaults when Link is clicked", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddBlockModal onAdd={onAdd} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /^Link/ }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    const block = onAdd.mock.calls[0][0] as Block;
    expect(block.type).toBe("link");
    if (block.type === "link") {
      expect(block.enabled).toBe(true);
      expect(block.title).toBe("");
      expect(block.url).toBe("");
      expect(block.id).toMatch(/^[0-9a-f-]+$/i);
    }
  });

  it("emits a Form block with default fields", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddBlockModal onAdd={onAdd} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /^Form/ }));
    const block = onAdd.mock.calls[0][0] as Block;
    expect(block.type).toBe("form");
    if (block.type === "form") {
      expect(block.fields.length).toBe(2);
      expect(block.fields[0].name).toBe("email");
      expect(block.fields[1].name).toBe("message");
    }
  });

  it("emits a Collection block with grid layout default", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddBlockModal onAdd={onAdd} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /^Collection/ }));
    const block = onAdd.mock.calls[0][0] as Block;
    if (block.type === "collection") {
      expect(block.layout).toBe("grid");
      expect(block.children).toEqual([]);
    } else {
      expect.fail("expected collection block");
    }
  });

  it("emits a Commerce block with stripe default", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddBlockModal onAdd={onAdd} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /^Commerce/ }));
    const block = onAdd.mock.calls[0][0] as Block;
    if (block.type === "commerce") {
      expect(block.provider).toBe("stripe");
    } else {
      expect.fail("expected commerce block");
    }
  });

  it("emits a Support block with kofi default", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddBlockModal onAdd={onAdd} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /^Support Me/ }));
    const block = onAdd.mock.calls[0][0] as Block;
    if (block.type === "support") {
      expect(block.provider).toBe("kofi");
    } else {
      expect.fail("expected support block");
    }
  });

  it("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AddBlockModal onAdd={vi.fn()} onClose={onClose} />);

    const header = screen.getByText("블록 추가").parentElement!;
    await user.click(within(header).getByText("✕"));
    expect(onClose).toHaveBeenCalled();
  });

  it("each generated block has a stable UUID id", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddBlockModal onAdd={onAdd} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /^Link/ }));
    await user.click(screen.getByRole("button", { name: /^Heading/ }));

    const ids = onAdd.mock.calls.map((c) => (c[0] as Block).id);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f-]+$/i);
    }
  });
});
