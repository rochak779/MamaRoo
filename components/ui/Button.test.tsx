import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders its label and fires onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("defaults to the primary variant", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", "primary");
  });

  it("renders a secondary variant when asked", () => {
    render(<Button variant="secondary">Back</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", "secondary");
  });

  it("keeps the label in the DOM while loading so the button never changes size", () => {
    render(<Button loading>Saving now</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveTextContent("Saving now");
    expect(screen.getByTestId("button-spinner")).toBeInTheDocument();
  });

  it("does not fire onClick while loading", async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("explains why it is disabled instead of being silently dead", () => {
    render(
      <Button disabled disabledReason="Add a medicine name first">
        Save
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription("Add a medicine name first");
  });

  it("meets the minimum touch target", () => {
    render(<Button>Ok</Button>);
    expect(screen.getByRole("button").className).toContain("tap-target");
  });

  it("wraps a long label rather than truncating it", () => {
    render(<Button>गर्भावस्था की जानकारी सहेजें और आगे बढ़ें</Button>);
    const cls = screen.getByRole("button").className;
    expect(cls).not.toContain("truncate");
    expect(cls).not.toContain("whitespace-nowrap");
  });

  it("stays full-width and pinned above the bottom nav when sticky", () => {
    render(<Button sticky>Add medicine</Button>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("sticky");
    expect(cls).toContain("bottom-[96px]");
    expect(cls).toContain("w-full");
  });

  it("stays in normal flow by default", () => {
    render(<Button>Add medicine</Button>);
    expect(screen.getByRole("button").className).not.toContain("sticky");
  });
});
