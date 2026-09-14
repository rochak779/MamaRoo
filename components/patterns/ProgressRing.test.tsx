import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressRing } from "@/components/patterns/ProgressRing";

describe("ProgressRing", () => {
  it("reports progress to assistive technology as a meter", () => {
    render(<ProgressRing fraction={0.5} label="4 of 8 done" />);
    const meter = screen.getByRole("progressbar");
    expect(meter).toHaveAttribute("aria-valuenow", "50");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
  });

  it("renders a fraction of 0 without a path error", () => {
    render(<ProgressRing fraction={0} label="Nothing done yet" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("renders a fraction of 1 without a path error", () => {
    render(<ProgressRing fraction={1} label="All done" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("clamps a fraction outside 0 to 1", () => {
    const { rerender } = render(<ProgressRing fraction={1.4} label="Over" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");

    rerender(<ProgressRing fraction={-0.2} label="Under" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("shows the supplied label as visible text rather than a hardcoded string", () => {
    render(<ProgressRing fraction={0.3} label="3 of 10 packed" />);
    expect(screen.getByText("3 of 10 packed")).toBeInTheDocument();

    render(<ProgressRing fraction={0.3} label="3 में से 10 पैक हुए" />);
    expect(screen.getByText("3 में से 10 पैक हुए")).toBeInTheDocument();
  });
});
