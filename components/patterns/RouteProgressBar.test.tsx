import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RouteProgressBar, startRouteProgress } from "@/components/patterns/RouteProgressBar";

const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => mockUsePathname() }));

function renderWithLink(href: string, linkProps: Record<string, string> = {}) {
  return render(
    <>
      <RouteProgressBar />
      <a href={href} {...linkProps}>
        Go
      </a>
    </>,
  );
}

describe("RouteProgressBar", () => {
  it("is hidden on mount", () => {
    mockUsePathname.mockReturnValue("/today");
    renderWithLink("/baby");
    expect(screen.queryByTestId("route-progress-bar")).not.toBeInTheDocument();
  });

  it("appears when an internal link to a different page is clicked", () => {
    mockUsePathname.mockReturnValue("/today");
    renderWithLink("/baby");
    fireEvent.click(screen.getByText("Go"));
    expect(screen.getByTestId("route-progress-bar")).toBeInTheDocument();
  });

  it("disappears once the pathname actually changes, i.e. navigation completed", () => {
    mockUsePathname.mockReturnValue("/today");
    const { rerender } = renderWithLink("/baby");
    fireEvent.click(screen.getByText("Go"));
    expect(screen.getByTestId("route-progress-bar")).toBeInTheDocument();

    mockUsePathname.mockReturnValue("/baby");
    rerender(
      <>
        <RouteProgressBar />
        <a href="/baby">Go</a>
      </>,
    );
    expect(screen.queryByTestId("route-progress-bar")).not.toBeInTheDocument();
  });

  it("ignores a click on a link that opens a new tab", () => {
    mockUsePathname.mockReturnValue("/today");
    renderWithLink("/baby", { target: "_blank" });
    fireEvent.click(screen.getByText("Go"));
    expect(screen.queryByTestId("route-progress-bar")).not.toBeInTheDocument();
  });

  it("ignores a click on a link to the page already showing", () => {
    mockUsePathname.mockReturnValue("/today");
    renderWithLink("/today");
    fireEvent.click(screen.getByText("Go"));
    expect(screen.queryByTestId("route-progress-bar")).not.toBeInTheDocument();
  });

  it("ignores a click that isn't on a link at all", () => {
    mockUsePathname.mockReturnValue("/today");
    render(
      <>
        <RouteProgressBar />
        <button type="button">Toggle</button>
      </>,
    );
    fireEvent.click(screen.getByText("Toggle"));
    expect(screen.queryByTestId("route-progress-bar")).not.toBeInTheDocument();
  });

  it("is decorative, not announced to assistive technology", () => {
    mockUsePathname.mockReturnValue("/today");
    renderWithLink("/baby");
    fireEvent.click(screen.getByText("Go"));
    expect(screen.getByTestId("route-progress-bar")).toHaveAttribute("aria-hidden", "true");
  });

  // Sessions across the pre-auth funnel (Start, LanguageSelect, AuthForm,
  // OnboardingForm) navigate with router.push() from a plain button, not a
  // <Link> -- found 2026-09-15 missing the bar entirely because the
  // click-on-<a> detection above never fires for them.
  it("activates via startRouteProgress(), for a programmatic router.push() with no <a> click behind it", () => {
    mockUsePathname.mockReturnValue("/start");
    render(<RouteProgressBar />);
    expect(screen.queryByTestId("route-progress-bar")).not.toBeInTheDocument();

    act(() => startRouteProgress());
    expect(screen.getByTestId("route-progress-bar")).toBeInTheDocument();
  });

  it("clears a startRouteProgress()-activated bar once the pathname actually changes", () => {
    mockUsePathname.mockReturnValue("/start");
    const { rerender } = render(<RouteProgressBar />);
    act(() => startRouteProgress());
    expect(screen.getByTestId("route-progress-bar")).toBeInTheDocument();

    mockUsePathname.mockReturnValue("/signup");
    rerender(<RouteProgressBar />);
    expect(screen.queryByTestId("route-progress-bar")).not.toBeInTheDocument();
  });
});
