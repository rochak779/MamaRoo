"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { track } from "@/components/AnalyticsProvider";
import { EVENTS } from "@/lib/analytics/events";

// Icon paths are copied 1:1 from Screens/07-shared/Bottom Nav.dc.html so the
// built nav matches the designer's artboard exactly, rather than substituting
// the nearest Phosphor glyph (the app's usual icon source). currentColor lets
// each tab drive its own active/inactive color via className.
function TodayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function BabyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function CareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="6" width="14" height="15" rx="2" />
      <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function GuideIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function MeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

const TABS = [
  { href: "/today", labelKey: "today", Icon: TodayIcon },
  { href: "/baby", labelKey: "baby", Icon: BabyIcon },
  { href: "/care", labelKey: "care", Icon: CareIcon },
  { href: "/guide", labelKey: "guide", Icon: GuideIcon },
  { href: "/me", labelKey: "me", Icon: MeIcon },
] as const;

export function BottomNav({ activePath }: { activePath: string }) {
  const t = useTranslations("nav");

  return (
    <nav
      aria-label={t("label")}
      className="safe-bottom fixed inset-x-0 bottom-0 z-10 flex items-stretch justify-between bg-bg px-xs pt-sm pb-[10px] shadow-[0_-4px_16px_rgba(103,0,53,0.10)]"
    >
      {TABS.map(({ href, labelKey, Icon }) => {
        const isActive = activePath === href || activePath.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            onClick={() => track(EVENTS.tab_viewed, { tab: labelKey })}
            className={cn(
              "tap-target flex min-h-[56px] min-w-0 flex-1 flex-col items-center gap-xs rounded-sm px-[2px] py-sm hover:bg-text-primary/5",
              isActive ? "font-medium text-text-primary" : "text-text-primary/65",
            )}
          >
            <span className="flex h-[22px] items-center justify-center">
              <Icon />
            </span>
            <span className="font-display text-[11px] leading-[13px] font-semibold whitespace-nowrap">
              {t(labelKey)}
            </span>
            <span
              className={cn(
                "mt-px h-[3px] w-[18px] rounded-full",
                isActive ? "bg-text-primary" : "bg-transparent",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
