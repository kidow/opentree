import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Welcome from "./Welcome";

describe("Welcome", () => {
  it("renders title and description", () => {
    render(<Welcome onOpen={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Opentree");
    expect(screen.getByText(/링크인바이오/)).toBeInTheDocument();
  });

  it("invokes onOpen when the CTA button is clicked", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<Welcome onOpen={onOpen} />);
    await user.click(screen.getByRole("button", { name: /프로젝트 폴더 열기/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
