import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { GuideHome } from "@/app/(app)/guide/GuideHome";
import en from "@/i18n/en.json";

function renderHome() {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <GuideHome />
    </NextIntlClientProvider>,
  );
}

describe("GuideHome", () => {
  it("shows every card's label", () => {
    renderHome();
    expect(screen.getByText(en.guide.cards.trimester.label)).toBeInTheDocument();
    expect(screen.getByText(en.guide.cards.checkups.label)).toBeInTheDocument();
    expect(screen.getByText(en.guide.cards.eatingWell.label)).toBeInTheDocument();
    expect(screen.getByText(en.guide.cards.stayingActive.label)).toBeInTheDocument();
    expect(screen.getByText(en.guide.cards.medicines.label)).toBeInTheDocument();
    expect(screen.getByText(en.guide.cards.birth.label)).toBeInTheDocument();
    expect(screen.getByText(en.guide.cards.afterBirth.label)).toBeInTheDocument();
    expect(screen.getByText(en.guide.cards.commonQuestions.label)).toBeInTheDocument();
  });

  it("wires every card to its fixed route, including the ones later sessions build", () => {
    renderHome();
    expect(screen.getByRole("link", { name: new RegExp(en.guide.cards.trimester.label) })).toHaveAttribute(
      "href",
      "/guide/trimester",
    );
    expect(screen.getByRole("link", { name: new RegExp(en.guide.cards.checkups.label) })).toHaveAttribute(
      "href",
      "/guide/checkups",
    );
    expect(screen.getByRole("link", { name: new RegExp(en.guide.cards.eatingWell.label) })).toHaveAttribute(
      "href",
      "/guide/eating-well",
    );
    expect(screen.getByRole("link", { name: new RegExp(en.guide.cards.stayingActive.label) })).toHaveAttribute(
      "href",
      "/guide/staying-active",
    );
    expect(screen.getByRole("link", { name: new RegExp(en.guide.cards.medicines.label) })).toHaveAttribute(
      "href",
      "/guide/medicines",
    );
    expect(screen.getByRole("link", { name: new RegExp(en.guide.cards.birth.label) })).toHaveAttribute(
      "href",
      "/guide/birth",
    );
    expect(screen.getByRole("link", { name: new RegExp(en.guide.cards.afterBirth.label) })).toHaveAttribute(
      "href",
      "/guide/after-birth",
    );
    expect(screen.getByRole("link", { name: new RegExp(en.guide.cards.commonQuestions.label) })).toHaveAttribute(
      "href",
      "/guide/questions",
    );
  });

  it("never renders a Food Safety card of its own -- that's reached from the Eating Well topic list", () => {
    renderHome();
    expect(screen.queryByRole("link", { name: /food safety/i })).not.toBeInTheDocument();
  });
});
