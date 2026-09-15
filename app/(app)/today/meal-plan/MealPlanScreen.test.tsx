import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { MealPlanScreen } from "@/app/(app)/today/meal-plan/MealPlanScreen";
import type { Weekday } from "@/lib/domain/weeklyMealPlan";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";

function renderScreen(locale: "en" | "hi" = "en", day: Weekday = "monday") {
  const messages = locale === "hi" ? hi : en;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <MealPlanScreen trimester={locale === "en" ? "second" : "दूसरी"} day={day} />
    </NextIntlClientProvider>,
  );
}

describe("MealPlanScreen", () => {
  it("shows only the given day's eight meal slots, in order", () => {
    renderScreen("en", "monday");
    const mondayCopy = [
      en.weeklyMealPlan.monday.beforeBreakfast,
      en.weeklyMealPlan.monday.breakfast,
      en.weeklyMealPlan.monday.morningSnack,
      en.weeklyMealPlan.monday.lunch,
      en.weeklyMealPlan.monday.afternoonSnack,
      en.weeklyMealPlan.monday.evening,
      en.weeklyMealPlan.monday.dinner,
      en.weeklyMealPlan.monday.bedtime,
    ];
    mondayCopy.forEach((copy) => expect(screen.getByText(copy)).toBeInTheDocument());
    expect(screen.getByText(en.weeklyMealPlan.dayLabel.monday)).toBeInTheDocument();
  });

  it("never renders another day's items alongside today's", () => {
    renderScreen("en", "monday");
    expect(screen.queryByText(en.weeklyMealPlan.tuesday.breakfast)).not.toBeInTheDocument();
    expect(screen.queryByText(en.weeklyMealPlan.dayLabel.tuesday)).not.toBeInTheDocument();
  });

  it("switches every item when the day prop changes", () => {
    renderScreen("en", "tuesday");
    expect(screen.getByText(en.weeklyMealPlan.tuesday.breakfast)).toBeInTheDocument();
    expect(screen.getByText(en.weeklyMealPlan.dayLabel.tuesday)).toBeInTheDocument();
    expect(screen.queryByText(en.weeklyMealPlan.monday.breakfast)).not.toBeInTheDocument();
  });

  it.each([
    ["en" as const, en.mealPlan.disclaimer],
    ["hi" as const, hi.mealPlan.disclaimer],
  ])("always renders the disclaimer in %s", (locale, disclaimer) => {
    renderScreen(locale);
    expect(screen.getByTestId("disclaimer")).toHaveTextContent(disclaimer);
  });

  it("links back to Today and never renders a texture motif", () => {
    renderScreen();
    expect(screen.getByRole("link", { name: en.today.backToToday })).toHaveAttribute("href", "/today");
    expect(screen.queryByTestId("texture-motif")).not.toBeInTheDocument();
  });
});
