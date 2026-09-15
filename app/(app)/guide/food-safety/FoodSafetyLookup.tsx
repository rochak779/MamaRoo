"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BackButton } from "@/components/patterns/BackButton";
import { Icon } from "@/components/ui/Icon";
import { PRODUCT_NAME } from "@/lib/config";
import {
  matchFoodSafetyItems,
  type FoodSafetyItem,
  type FoodSafetyStatus,
} from "@/lib/domain/foodSafety";

export interface FoodSafetyLookupProps {
  items: FoodSafetyItem[];
}

const COMMON_FOOD_KEYS = ["papaya", "paneer", "teaCoffee", "sprouts", "pickles", "fish"] as const;

const STATUS_CLASSES: Record<FoodSafetyStatus, string> = {
  safe: "bg-sage-mist/35 text-accent-secondary",
  moderation: "bg-gold/25 text-text-primary",
  avoid: "bg-[rgba(103,0,53,0.08)] text-text-primary",
};

export function FoodSafetyLookup({ items }: FoodSafetyLookupProps) {
  const t = useTranslations("foodSafety");
  const [query, setQuery] = useState("");
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const emptyQuery = query.trim().length === 0;
  const results = matchFoodSafetyItems({ items, query });

  function updateQuery(value: string) {
    setQuery(value);
    setExpandedName(null);
  }

  return (
    <section
      data-testid="food-safety-screen"
      className="relative isolate mx-auto flex min-h-[calc(100dvh-96px)] w-full max-w-[680px] flex-col gap-lg py-screen selection:bg-blush selection:text-text-primary"
      aria-labelledby="food-safety-title"
    >
      <header className="flex items-center gap-md">
        <BackButton href="/guide" label={t("backLabel")} />
        <h1 id="food-safety-title" className="font-display text-h1 font-semibold text-text-primary">
          {t("heading")}
        </h1>
      </header>

      <div className="flex min-h-[52px] items-center gap-sm rounded-full bg-surface-raised px-md shadow-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent-primary">
        <Icon name="MagnifyingGlass" size="inline" className="shrink-0 text-text-secondary" />
        <input
          type="search"
          value={query}
          aria-label={t("searchPlaceholder")}
          placeholder={t("searchPlaceholder")}
          onChange={(event) => updateQuery(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-body-sm text-text-primary caret-accent-primary outline-none placeholder:text-text-secondary"
        />
        <span className="mr-sm flex size-8 shrink-0 items-center justify-center rounded-full bg-sage-mist/20 text-accent-secondary">
          <Icon name="Microphone" size="inline" label={t("micAriaLabel")} />
        </span>
      </div>

      {emptyQuery && (
        <div className="flex flex-col gap-sm">
          <p className="m-0 text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
            {t("browseLabel")}
          </p>
          <div className="flex flex-wrap gap-sm">
            {COMMON_FOOD_KEYS.map((key) => {
              const label = t(`commonlySearched.${key}`);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateQuery(label)}
                  className="tap-target rounded-full border border-divider bg-surface-raised px-md text-body-sm font-medium text-text-primary shadow-1 transition-[background-color,transform] duration-(--motion-fast) ease-standard hover:bg-blush active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!emptyQuery && results.length > 0 && (
        <div data-testid="food-safety-results" className="flex flex-col gap-md" aria-live="polite">
          {results.map((item) => {
            const expanded = expandedName === item.name;
            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-[16px] bg-surface-raised shadow-2"
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() =>
                    setExpandedName((current) => (current === item.name ? null : item.name))
                  }
                  className="tap-target flex w-full flex-col gap-sm p-md text-left transition-[background-color] duration-(--motion-fast) hover:bg-surface/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-primary"
                >
                  <span className="flex w-full items-start justify-between gap-sm">
                    <span className="font-display text-body font-semibold text-text-primary">
                      {item.name}
                    </span>
                    <span
                      data-status={item.status}
                      className={`shrink-0 rounded-full px-md py-xs text-caption font-semibold ${STATUS_CLASSES[item.status]}`}
                    >
                      {t(`status.${item.status}`)}
                    </span>
                  </span>
                  <span className="text-body-sm leading-5 text-text-primary">
                    {item.short_text}
                  </span>
                  {expanded && (
                    <span className="text-body-sm leading-5 text-text-primary">
                      {item.long_text}
                    </span>
                  )}
                  <span className="flex w-full items-end justify-between gap-sm pt-xs">
                    <span className="text-caption italic text-accent-secondary">
                      {t("citation", { productName: PRODUCT_NAME })}
                    </span>
                    <Icon
                      name="CaretDown"
                      size="inline"
                      className={`shrink-0 text-text-primary transition-transform duration-(--motion-fast) ease-standard ${expanded ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>
              </article>
            );
          })}
        </div>
      )}

      {!emptyQuery && results.length === 0 && (
        <div
          className="rounded-[16px] bg-surface-raised px-lg py-xl text-center shadow-2"
          role="status"
        >
          <p className="m-0 text-body-sm text-text-secondary">{t("notFound")}</p>
        </div>
      )}
    </section>
  );
}
