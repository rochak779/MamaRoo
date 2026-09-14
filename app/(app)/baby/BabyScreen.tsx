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
    <div className="flex flex-col gap-lg py-screen">
      <h1 className="sr-only">{tNav("baby")}</h1>

      <div className="flex flex-col items-center gap-sm">
        <div
          data-testid="stage-bloom"
          data-active={showBloom}
          className={cn(
            "flex justify-center gap-sm rounded-full p-md transition-shadow",
            showBloom && "shadow-[0_0_48px_rgba(255,197,61,0.45)]",
          )}
        >
          {Array.from({ length: babyCount }, (_, i) => (
            <IllustrationContainer
              key={i}
              lottieUrl={stage.lottieUrl}
              staticSrc={stage.staticSrc}
              alt={t(weekTagKey, { week, stage: stageNumber, total: TOTAL_STAGES })}
            />
          ))}
        </div>
        <span className="rounded-full bg-surface-raised px-md py-xs text-body-sm font-medium text-text-primary shadow-1">
          {t(weekTagKey, { week, stage: stageNumber, total: TOTAL_STAGES })}
        </span>
        <StageProgress
          stage={stageNumber}
          totalStages={TOTAL_STAGES}
          label={t(weekTagKey, { week, stage: stageNumber, total: TOTAL_STAGES })}
        />
      </div>

      {/* The stat card (Size / Weight / Can do) and the "Fun facts about your
          baby this week" card from the design are deliberately not built here:
          both need per-week factual content that doesn't exist as seeded
          content anywhere in this codebase yet (no equivalent of
          content_items for weekly baby facts). Today's own page.tsx made the
          same call for its weekly reflection card (showWeeklyReflection is
          hard-set to false pending Session 22's adherence data) -- this is
          the same kind of honest content gap, not a missed requirement. */}

      <div className="flex flex-col gap-sm">
        <h2 className="text-h3 font-display font-semibold text-text-primary">{t("timelineTitle")}</h2>
        <Timeline entries={timelineEntries} onSelect={setSelected} />
        {selected && (
          <p data-testid="timeline-selected-note" className="text-body-sm text-text-secondary">
            {selected.kind === "event" ? selected.title : t(selected.titleKey)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-md">
        <h2 className="text-h3 font-display font-semibold text-text-primary">{t("forYou")}</h2>
        <div className="grid grid-cols-2 gap-md">
          <Link href="/baby/name" className="col-span-1">
            <Card className="flex flex-col gap-xs">
              <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
                {t("bento.nameTitle")}
              </p>
              {favoriteNames.length > 0 ? (
                <>
                  <p className="text-body-sm text-text-primary">{favoriteNames.map((n) => n.name).join(", ")}</p>
                  <p className="text-caption text-text-secondary">{t("bento.nameSeeMore")}</p>
                </>
              ) : (
                <p className="text-body-sm text-text-primary">{t("bento.namePrompt")}</p>
              )}
            </Card>
          </Link>

          <Link href="/baby/letters" className="col-span-1">
            <Card className="flex flex-col gap-xs">
              <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
                {t("bento.lettersTitle")}
              </p>
              <p className="text-body-sm text-text-primary">{t("bento.lettersPrompt")}</p>
            </Card>
          </Link>

          {showKicksCard && (
            <Link href="/baby/kicks" className="col-span-1" data-testid="kicks-card">
              <Card className="flex flex-col gap-xs">
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
