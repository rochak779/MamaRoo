"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState } from "@/components/patterns/EmptyState";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { APP_TIMEZONE } from "@/lib/config";
import { cn } from "@/lib/cn";
import type { TimelineEntry } from "@/lib/domain/timeline";

const VIEWS = ["day", "week", "month"] as const;
type View = (typeof VIEWS)[number];

/** Beyond this many dots, the strip collapses behind a "show all" action
 * rather than rendering an unbounded row -- matches Session 20's own test
 * requirement ("a long timeline uses the show-more pattern beyond 15
 * entries"). buildTimeline() itself stays unbounded (a domain concern isn't
 * pagination); this is purely a rendering choice. */
const COLLAPSED_COUNT = 15;

/**
 * Day/Week/Month only changes how far back the strip reaches, not which
 * entries qualify as "hers" -- there's no separate weekly-growth-dot content
 * system here (the designer mockup's "carrot"/"mango" size copy per week
 * isn't seeded content anywhere yet; see Important/Plan-Sessions-20-21-Replan.md).
 * This is the deliberately smaller, honest version of that toggle: a look-back
 * window over the same merged timeline, not a second data model.
 */
const LOOKBACK_DAYS: Record<View, number> = { day: 30, week: 90, month: 400 };

export function Timeline({
  entries,
  onSelect,
  sensitiveMode = false,
}: {
  entries: TimelineEntry[];
  onSelect?: (entry: TimelineEntry | null) => void;
  sensitiveMode?: boolean;
}) {
  const t = useTranslations("baby");
  const locale = useLocale();
  const [view, setView] = useState<View>("week");
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMilestoneId, setOpenMilestoneId] = useState<string | null>(null);
  // Read once at mount via the lazy initializer (not a bare Date.now() call in
  // render), same pattern as app/(auth)/AuthForm.tsx -- keeps the component
  // pure per react-hooks/purity while still anchoring the look-back window to
  // "now". A day/week/month filter doesn't need to tick live like AuthForm's
  // resend-timer does, so no interval re-sets it.
  const [now] = useState<number>(() => Date.now());

  const windowed = useMemo(() => {
    const cutoff = now - LOOKBACK_DAYS[view] * 24 * 60 * 60 * 1000;
    return entries.filter((e) => new Date(e.occurredAt).getTime() >= cutoff);
  }, [entries, view, now]);

  const visible = expanded ? windowed : windowed.slice(0, COLLAPSED_COUNT);
  const hasMore = windowed.length > COLLAPSED_COUNT && !expanded;

  function dateLabel(occurredAt: string): string {
    const date = new Date(occurredAt);
    if (Number.isNaN(date.getTime())) return "";
    const language = locale === "hi" ? "hi-IN" : "en-IN";
    return new Intl.DateTimeFormat(language, {
      ...(view === "month"
        ? { month: "short", year: "numeric" }
        : { day: "numeric", month: "short" }),
      timeZone: APP_TIMEZONE,
    }).format(date);
  }

  function select(entry: TimelineEntry) {
    const next = selectedId === entry.id ? null : entry;
    setSelectedId(next?.id ?? null);
    onSelect?.(next);
    if (entry.kind === "milestone") setOpenMilestoneId(entry.id);
  }

  if (entries.length === 0) {
    return <EmptyState iconName="Sparkle" message={t("timeline.empty")} />;
  }

  const openMilestone = entries.find((e) => e.id === openMilestoneId && e.kind === "milestone");

  return (
    <div className="flex flex-col gap-[14px]">
      <div
        role="tablist"
        aria-label={t("timeline.viewLabel")}
        className="flex rounded-full bg-surface-raised p-xs shadow-1"
      >
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cn(
              "tap-target flex-1 rounded-full px-md py-xs text-body-sm font-medium transition-colors duration-(--motion-fast) ease-standard",
              view === v ? "bg-accent-secondary text-surface-raised" : "text-text-primary",
            )}
          >
            {t(`timeline.view.${v}`)}
          </button>
        ))}
      </div>

      <div
        className="overflow-x-auto pb-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-testid="timeline-strip"
      >
        <div className="relative flex w-max min-w-full px-xs">
          <span
            aria-hidden="true"
            className="absolute top-[19px] right-[56px] left-[56px] h-0.5 bg-divider"
          />
          {visible.map((entry) => {
            const isMilestone = entry.kind === "milestone";
            const isSelected = selectedId === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                data-testid="timeline-dot"
                data-kind={entry.kind}
                aria-label={isMilestone ? t(entry.titleKey) : entry.title}
                aria-pressed={isSelected}
                onClick={() => select(entry)}
                className="tap-target relative z-10 flex w-[112px] shrink-0 flex-col items-center gap-xs rounded-sm px-xs py-0 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-secondary"
              >
                <span aria-hidden="true" className="flex h-[38px] items-center justify-center">
                  <span
                    className={cn(
                      "block rounded-full border-[3px] border-bg",
                      isMilestone && !sensitiveMode
                        ? "size-4 bg-gold ring-2 ring-gold"
                        : "size-2.5 bg-peach ring-1 ring-divider-strong",
                      isSelected && "ring-2 ring-accent-secondary ring-offset-2 ring-offset-bg",
                    )}
                  />
                </span>
                <span className="text-[11px] font-semibold tracking-[0.04em] text-text-secondary uppercase">
                  {dateLabel(entry.occurredAt)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {hasMore && (
        <button
          type="button"
          data-testid="timeline-show-more"
          onClick={() => setExpanded(true)}
          className="tap-target self-start text-body-sm font-medium text-accent-secondary underline-offset-4 hover:underline"
        >
          {t("timeline.showAll", { count: windowed.length })}
        </button>
      )}

      <BottomSheet
        open={Boolean(openMilestone && openMilestone.kind === "milestone")}
        onClose={() => setOpenMilestoneId(null)}
        title={openMilestone && openMilestone.kind === "milestone" ? t(openMilestone.titleKey) : ""}
      >
        {openMilestone && openMilestone.kind === "milestone" && (
          <div className="flex flex-col gap-lg">
            <p className="text-body text-text-primary">{t(`${openMilestone.titleKey}Body`)}</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpenMilestoneId(null)}
              className="w-full [border-color:var(--color-divider-strong)]"
            >
              {t("timeline.close")}
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
