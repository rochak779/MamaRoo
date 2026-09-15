"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { DisclaimerBanner } from "@/components/patterns/DisclaimerBanner";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { weeklyMealPlanFor, type Weekday, type WeeklyMealSlotKind } from "@/lib/domain/weeklyMealPlan";

const SLOT_ICONS: Record<WeeklyMealSlotKind, string> = {
  beforeBreakfast: "Sparkle",
  breakfast: "Sun",
  morningSnack: "Orange",
  lunch: "BowlFood",
  afternoonSnack: "FlowerLotus",
  evening: "Drop",
  dinner: "Moon",
  bedtime: "Star",
};

export function MealPlanScreen({ trimester, day }: { trimester: string | number; day: Weekday }) {
  const t = useTranslations();
  const meals = weeklyMealPlanFor(day);

  return (
    <section className="mx-auto flex w-full max-w-[680px] flex-col gap-lg py-screen" aria-labelledby="meal-plan-title">
      <header className="flex items-center gap-md">
        <Link
          href="/today"
          aria-label={t("today.backToToday")}
          className="tap-target inline-flex items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
        >
          <Icon name="ArrowLeft" size="inline" />
        </Link>
      </header>

      <div>
        <h1 id="meal-plan-title" className="font-display text-h1 font-semibold text-text-primary">
          {t("mealPlan.title")}
        </h1>
        <p className="mt-xs text-caption text-text-secondary">
          {t("mealPlan.trimesterLabel", { trimester })}
        </p>
        {/* Only today's day is ever rendered here, never the rest of the
            week, so this label is what tells her which day she's looking at. */}
        <p className="mt-xs text-body-sm font-medium text-text-primary">
          {t(`weeklyMealPlan.dayLabel.${day}`)}
        </p>
      </div>

      <div className="flex items-start gap-sm rounded-sm bg-[rgba(103,0,53,0.06)] p-md">
        <Icon name="Info" size="inline" className="mt-xs shrink-0 text-text-primary" />
        <DisclaimerBanner>{t("mealPlan.disclaimer")}</DisclaimerBanner>
      </div>

      <div className="flex flex-col gap-md" aria-live="polite">
        {meals.map((meal) => (
          <Card key={meal.slot} className="flex gap-md">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-[rgba(255,197,61,0.28)] text-text-primary">
              <Icon name={SLOT_ICONS[meal.slot]} size="default" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
                {t(meal.labelKey)} · {meal.time}
              </h2>
              <p className="mt-xs text-body-sm text-text-primary">{t(meal.itemsKey)}</p>
            </div>
          </Card>
        ))}
      </div>

      <aside className="rounded-sm bg-[rgba(255,197,61,0.16)] p-md">
        <h2 className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
          {t("mealPlan.whyLabel")}
        </h2>
        <p className="mt-xs text-body-sm text-text-primary">{t("mealPlan.whyBody")}</p>
      </aside>
    </section>
  );
}
