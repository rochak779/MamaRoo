import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { FoodSafetyLookup } from "@/app/(app)/guide/food-safety/FoodSafetyLookup";
import en from "@/i18n/en.json";
import { PRODUCT_NAME } from "@/lib/config";
import type { FoodSafetyItem } from "@/lib/domain/foodSafety";

const items: FoodSafetyItem[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    locale: "en",
    name: "Papaya (ripe)",
    status: "safe",
    short_text: "Ripe papaya is fine in normal amounts.",
    long_text: "Raw or unripe papaya is the one to skip.",
    sort_order: 1,
    is_active: true,
    created_at: "2026-09-13T00:00:00Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    locale: "en",
    name: "Papad and pickles",
    status: "moderation",
    short_text: "Fine occasionally, but easy to overdo on salt.",
    long_text: "A small serving now and then is not a concern.",
    sort_order: 2,
    is_active: true,
    created_at: "2026-09-13T00:00:00Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    locale: "en",
    name: "Raw sprouts",
    status: "avoid",
    short_text: "Better to avoid raw sprouts, cooked ones are fine.",
    long_text: "Raw sprouts can carry bacteria that are riskier during pregnancy.",
    sort_order: 3,
    is_active: true,
    created_at: "2026-09-13T00:00:00Z",
  },
];

function renderScreen(initialItems: FoodSafetyItem[] = items) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <FoodSafetyLookup items={initialItems} />
    </NextIntlClientProvider>,
  );
}

describe("FoodSafetyLookup", () => {
  it("shows commonly searched chips, not result cards, for an empty query", () => {
    renderScreen();
    expect(screen.getByText(en.foodSafety.browseLabel)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Papaya|Paneer|Tea and coffee|Sprouts|Pickles|Fish/ })).toHaveLength(6);
    expect(screen.queryByTestId("food-safety-results")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: en.foodSafety.micAriaLabel })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: en.foodSafety.micAriaLabel })).not.toBeInTheDocument();
  });

  it("shows exactly the item whose name contains the query", async () => {
    renderScreen();
    await userEvent.type(screen.getByRole("searchbox", { name: en.foodSafety.searchPlaceholder }), "sprout");
    const results = screen.getByTestId("food-safety-results");
    expect(within(results).getByText("Raw sprouts")).toBeInTheDocument();
    expect(within(results).queryByText("Papaya (ripe)")).not.toBeInTheDocument();
  });

  it("shows the calm not-found message instead of an empty list", async () => {
    renderScreen();
    await userEvent.type(screen.getByRole("searchbox", { name: en.foodSafety.searchPlaceholder }), "dragon fruit");
    expect(screen.getByText(en.foodSafety.notFound)).toBeInTheDocument();
    expect(screen.queryByTestId("food-safety-results")).not.toBeInTheDocument();
  });

  it("reveals long guidance on expansion and collapses it on a second tap", async () => {
    renderScreen();
    await userEvent.type(screen.getByRole("searchbox", { name: en.foodSafety.searchPlaceholder }), "papaya");
    const card = screen.getByRole("button", { name: /Papaya \(ripe\)/ });
    expect(screen.queryByText(items[0]!.long_text)).not.toBeInTheDocument();
    await userEvent.click(card);
    expect(screen.getByText(items[0]!.long_text)).toBeInTheDocument();
    expect(card).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(card);
    expect(screen.queryByText(items[0]!.long_text)).not.toBeInTheDocument();
    expect(card).toHaveAttribute("aria-expanded", "false");
  });

  it("maps all statuses to calm labels without alert-red styling", async () => {
    renderScreen();
    const search = screen.getByRole("searchbox", { name: en.foodSafety.searchPlaceholder });
    for (const [query, label, status] of [
      ["ripe", en.foodSafety.status.safe, "safe"],
      ["pickles", en.foodSafety.status.moderation, "moderation"],
      ["sprouts", en.foodSafety.status.avoid, "avoid"],
    ] as const) {
      await userEvent.clear(search);
      await userEvent.type(search, query);
      const badge = screen.getByText(label);
      expect(badge).toHaveAttribute("data-status", status);
      expect(badge).not.toHaveClass("bg-alert", "text-alert");
    }
  });

  it("prefills a chip as a real query and keeps the citation on every result", async () => {
    renderScreen();
    await userEvent.click(screen.getByRole("button", { name: "Pickles" }));
    expect(screen.getByRole("searchbox", { name: en.foodSafety.searchPlaceholder })).toHaveValue("Pickles");
    expect(screen.getByText("Papad and pickles")).toBeInTheDocument();
    expect(screen.getByText(`Reviewed by ${PRODUCT_NAME}'s medical team`)).toBeInTheDocument();
  });
});
