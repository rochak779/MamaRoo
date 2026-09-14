import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { BackButton } from "@/components/patterns/BackButton";

describe("BackButton", () => {
  it("links to the given destination", () => {
    render(<BackButton href="/care" label="Back to Care" />);
    expect(screen.getByRole("link", { name: "Back to Care" })).toHaveAttribute("href", "/care");
  });

  it("meets the touch target size", () => {
    render(<BackButton href="/me" label="Back to Me" />);
    expect(screen.getByRole("link").className).toContain("tap-target");
  });

  it("can perform an in-place back action without changing route semantics", async () => {
    const onClick = vi.fn();
    render(<BackButton onClick={onClick} label="Back" />);
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
