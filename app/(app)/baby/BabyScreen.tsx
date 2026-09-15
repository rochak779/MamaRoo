"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { IllustrationContainer } from "@/components/patterns/IllustrationContainer";
import { StageProgress } from "@/components/patterns/StageProgress";
import { Card } from "@/components/ui/Card";
import { Timeline } from "@/app/(app)/baby/Timeline";
import type { BabyNameOption } from "@/lib/domain/babyNames";
import { TOTAL_STAGES } from "@/lib/domain/stages";
import type { TimelineEntry } from "@/lib/domain/timeline";
import { cn } from "@/lib/cn";

export interface BabyScreenProps {
  week: number;
  stageNumber: number;
  babyCount: 1 | 2;
  stage: { lottieUrl: string; staticSrc: string };
  /** True only on the calendar day she crosses a stage boundary -- suppressed
   * entirely in sensitive-moment mode, per Screens/03-my-baby/README.md. */
  stageChangedToday: boolean;
  sensitiveMode: boolean;
  timelineEntries: TimelineEntry[];
  showKicksCard: boolean;
  /** Most-recently-favorited first, already capped by the caller -- the card
   * only has room for a couple of names before it needs truncating, and that
   * truncation is a query concern (LIMIT), not a display one. */
  favoriteNames: BabyNameOption[];
}

export function BabyScreen({
  week,
  stageNumber,
  babyCount,
  stage,
  stageChangedToday,
  sensitiveMode,
  timelineEntries,
  showKicksCard,
  favoriteNames,
}: BabyScreenProps) {
  const t = useTranslations("baby");
  const tNav = useTranslations("nav");
  const [selected, setSelected] = useState<TimelineEntry | null>(null);

  const showBloom = stageChangedToday && !sensitiveMode;
  const weekTagKey = babyCount > 1 ? "weekTagTwins" : "weekTag";

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-xl py-screen">
      <h1 className="sr-only">{tNav("baby")}</h1>

      <section className="flex flex-col gap-sm" aria-labelledby="baby-timeline-title">
        <div>
          <h2
            id="baby-timeline-title"
            className="text-h1 font-display font-semibold text-text-primary"
          >
            {t("timelineTitle")}
          </h2>
        </div>
        <Timeline entries={timelineEntries} onSelect={setSelected} sensitiveMode={sensitiveMode} />
      </section>

      <section
        className="relative flex flex-col items-center gap-sm text-center"
        aria-label={t(weekTagKey, { week, stage: stageNumber, total: TOTAL_STAGES })}
      >
        <div
          data-testid="stage-bloom"
          data-active={showBloom}
          className="relative flex justify-center gap-sm"
        >
          {showBloom && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-1/2 size-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full motion-safe:animate-[mr-bloom_var(--motion-bloom)_ease-out_forwards]"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,197,61,0.55), rgba(255,109,87,0.20) 70%)",
              }}
            />
          )}
          {Array.from({ length: babyCount }, (_, i) => (
            <div
              key={i}
              className={cn(
                "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full shadow-3",
                babyCount > 1 ? "size-[142px]" : "size-[210px]",
                sensitiveMode ? "bg-surface" : "bg-peach",
              )}
            >
              <IllustrationContainer
                lottieUrl={stage.lottieUrl}
                staticSrc={stage.staticSrc}
                alt={t(weekTagKey, { week, stage: stageNumber, total: TOTAL_STAGES })}
              />
            </div>
          ))}
        </div>
        <p className="mt-sm font-display text-h2 font-medium text-text-primary">
          {t(weekTagKey, { week, stage: stageNumber, total: TOTAL_STAGES })}
        </p>
        {selected && (
          <p
            data-testid="timeline-selected-note"
            className={cn(
              "max-w-[320px] text-body-sm font-medium",
              sensitiveMode ? "text-text-primary" : "text-accent-secondary",
            )}
          >
            {selected.kind === "event" ? selected.title : t(selected.titleKey)}
          </p>
        )}
        <div className="sr-only">
          <StageProgress
            stage={stageNumber}
            totalStages={TOTAL_STAGES}
            label={t(weekTagKey, { week, stage: stageNumber, total: TOTAL_STAGES })}
          />
        </div>
      </section>

      {/* The stat card (Size / Weight / Can do) and the "Fun facts about your
          baby this week" card from the design are deliberately not built here:
          both need per-week factual content that doesn't exist as seeded
          content anywhere in this codebase yet (no equivalent of
          content_items for weekly baby facts). Today's own page.tsx made the
          same call for its weekly reflection card (showWeeklyReflection is
          hard-set to false pending Session 22's adherence data) -- this is
          the same kind of honest content gap, not a missed requirement. */}

      <div className="flex flex-col gap-md">
        <h2 className="text-h3 font-display font-semibold text-text-primary">{t("forYou")}</h2>
        <div className="grid grid-cols-2 gap-[14px]">
          <Link href="/baby/name" className="block">
            <Card
              surface="raised"
              accent="coral"
              accentIcon="Heart"
              accentLayout="stacked"
              className="flex h-full flex-col gap-xs"
            >
              <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
                {t("bento.nameTitle")}
              </p>
              {favoriteNames.length > 0 ? (
                <>
                  <p className="text-body-sm text-text-primary">
                    {favoriteNames.map((n) => n.name).join(", ")}
                  </p>
                  <p className="text-caption text-text-secondary">{t("bento.nameSeeMore")}</p>
                </>
              ) : (
                <p className="text-body-sm text-text-primary">{t("bento.namePrompt")}</p>
              )}
            </Card>
          </Link>

          <Link href="/baby/letters" className="block">
            <Card
              surface="raised"
              accent="gold"
              accentIcon="EnvelopeSimple"
              accentLayout="stacked"
              className="flex h-full flex-col gap-xs"
            >
              <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
                {t("bento.lettersTitle")}
              </p>
              <p className="text-body-sm text-text-primary">{t("bento.lettersPrompt")}</p>
            </Card>
          </Link>

          {showKicksCard && (
            <Link href="/baby/kicks" className="block" data-testid="kicks-card">
              <Card
                surface="raised"
                accent="sage"
                accentIcon="Lightning"
                accentLayout="stacked"
                className="flex h-full flex-col gap-xs"
              >
                <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
                  {t("bento.kicksTitle")}
                </p>
                <p className="text-body-sm text-text-primary">{t("bento.kicksPrompt")}</p>
              </Card>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
