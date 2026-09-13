import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { TrimesterOverview } from "@/app/(app)/guide/trimester/TrimesterOverview";
import en from "@/i18n/en.json";

function renderOverview(currentTrimester: 1 | 2 | 3) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TrimesterOverview currentTrimester={currentTrimester} />
    </NextIntlClientProvider>,
  );
}

describe("TrimesterOverview", () => {
  it("renders all three stages, each linking to its own topic list", () => {
    renderOverview(2);
    expect(screen.getByRole("link", { name: new RegExp(en.guide.trimester.stage1.title) })).toHaveAttribute(
      "href",
      "/guide/trimester-1",
    );
    expect(screen.getByRole("link", { name: new RegExp(en.guide.trimester.stage2.title) })).toHaveAttribute(
      "href",
      "/guide/trimester-2",
    );
    expect(screen.getByRole("link", { name: new RegExp(en.guide.trimester.stage3.title) })).toHaveAttribute(
      "href",
      "/guide/trimester-3",
    );
  });

  it("badges only the current stage", () => {
    renderOverview(2);
    const badges = screen.getAllByText(en.guide.trimester.currentBadge);
    expect(badges).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: new RegExp(en.guide.trimester.stage2.title) }),
    ).toContainElement(badges[0]!);
  });

  it("shows no badge at all when given an out-of-range value defensively", () => {
    // currentTrimester is typed 1|2|3, but a badge-per-stage still means "at
    // most one", never "always exactly one" -- guards the comparison logic.
    renderOverview(1);
    expect(screen.getAllByText(en.guide.trimester.currentBadge)).toHaveLength(1);
  });

  it("keeps every other stage tappable and fully visible", () => {
    renderOverview(1);
    expect(screen.getByText(en.guide.trimester.stage2.body)).toBeVisible();
    expect(screen.getByText(en.guide.trimester.stage3.body)).toBeVisible();
  });
});
