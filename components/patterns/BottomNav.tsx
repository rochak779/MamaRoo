"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { track } from "@/components/AnalyticsProvider";
import { EVENTS } from "@/lib/analytics/events";

// Icon and active-state styling are placeholders (blank on purpose) until the
// designer's bottom-navigation markup arrives; only the structure, labels and
// a11y behaviour below are load-bearing for Session 17.
const TABS = [
  { href: "/today", labelKey: "today", icon: "House" },
  { href: "/baby", labelKey: "baby", icon: "Baby" },
  { href: "/care", labelKey: "care", icon: "HeartStraight" },
  { href: "/reading", labelKey: "reading", icon: "BookOpen" },
  { href: "/profile", labelKey: "profile", icon: "UserCircle" },
] as const;

export function BottomNav({ activePath }: { activePath: string }) {
  const t = useTranslations("nav");

  return (
    <nav
      aria-label={t("label")}
      className="safe-bottom fixed inset-x-0 bottom-0 z-10 flex border-t border-divider bg-surface-raised"
    >
      {TABS.map((tab) => {
        const isActive = activePath === tab.href || activePath.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            onClick={() => track(EVENTS.tab_viewed, { tab: tab.labelKey })}
            className={cn(
              "tap-target flex flex-1 flex-col items-center justify-center gap-xs py-xs text-caption",
              isActive ? "font-medium text-accent-primary" : "text-text-secondary",
            )}
          >
            <Icon name={tab.icon} size="nav" />
            <span>{t(tab.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
