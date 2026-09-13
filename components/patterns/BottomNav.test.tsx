import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";
import { BottomNav } from "@/components/patterns/BottomNav";
import { EVENTS } from "@/lib/analytics/events";

const track = vi.fn();
vi.mock("@/components/AnalyticsProvider", () => ({ track: (...args: unknown[]) => track(...args) }));

beforeEach(() => {
  track.mockReset();
});

function renderNav(activePath: string) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <BottomNav activePath={activePath} />
    </NextIntlClientProvider>,
  );
}

describe("BottomNav", () => {
  it("renders exactly the five tabs, in order", () => {
    renderNav("/today");
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/today",
      "/baby",
      "/care",
      "/guide",
      "/me",
    ]);
  });

  it("marks the active tab for assistive technology", () => {
    renderNav("/care");
    expect(screen.getByRole("link", { name: /^care$/i })).toHaveAttribute("aria-current", "page");
  });

  it("signals the active tab with a weight change as well as colour", () => {
    renderNav("/care");
    expect(screen.getByRole("link", { name: /^care$/i }).className).toContain("font-medium");
  });

  it("treats a sub-route as its parent tab", () => {
    renderNav("/care/medicines");
    expect(screen.getByRole("link", { name: /^care$/i })).toHaveAttribute("aria-current", "page");
  });

  it("meets the touch target on every tab", () => {
    renderNav("/today");
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toContain("tap-target");
    }
  });

  it("respects the home-indicator safe area", () => {
    renderNav("/today");
    expect(screen.getByRole("navigation").className).toContain("safe-bottom");
  });

  it("labels every tab in Hindi too", () => {
    render(
      <NextIntlClientProvider locale="hi" messages={hi}>
        <BottomNav activePath="/today" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("link", { name: "आज" })).toBeInTheDocument();
  });

  it("captures tab_viewed with the tapped tab", async () => {
    const user = userEvent.setup();
    renderNav("/today");
    await user.click(screen.getByRole("link", { name: /^care$/i }));
    expect(track).toHaveBeenCalledWith(EVENTS.tab_viewed, { tab: "care" });
  });
});
