import { BabyScreen } from "@/app/(app)/baby/BabyScreen";
import { getLocale } from "@/i18n/locale";
import { buildTimeline, type TimelineEventInput, type TimelineMilestoneInput } from "@/lib/domain/timeline";
import { todayInAppZone } from "@/lib/domain/dates";
import { weekIllustrationSrc } from "@/lib/domain/illustrations";
import { pregnancyProgress } from "@/lib/domain/pregnancy";
import { illustrationStage, STAGE_BOUNDARIES, TOTAL_STAGES } from "@/lib/domain/stages";
import { getBabyData } from "@/lib/supabase/queries/baby";
import { getFavoriteBabyNames } from "@/lib/supabase/queries/babyNames";

/** One milestone per illustration stage boundary -- see lib/domain/stages.ts,
 * the single source of truth this list must always match. */
const MILESTONES: TimelineMilestoneInput[] = STAGE_BOUNDARIES.map((week, i) => ({
  stage: i + 1,
  week,
  titleKey: `milestones.${i + 1}`,
}));

const KICKS_MIN_WEEK = 28;

export default async function BabyPage() {
  const today = todayInAppZone();
  const locale = await getLocale();
  const [data, favoriteNames] = await Promise.all([getBabyData(), getFavoriteBabyNames({ locale })]);

  const progress = data.pregnancy ? pregnancyProgress({ edd: data.pregnancy.edd, today }) : null;
  const week = progress?.week ?? 0;
  const stageNumber = Math.min(illustrationStage(week), TOTAL_STAGES);
  const babyCount: 1 | 2 = data.pregnancy?.pregnancy_flags?.includes("twins") ? 2 : 1;

  // A stage boundary is crossed on the exact day gestational week hits one of
  // STAGE_BOUNDARIES with day offset 0 -- any other day within that week is
  // not "today" for bloom purposes, matching the design's "stage-change day"
  // wording rather than "stage-change week".
  const stageChangedToday =
    (STAGE_BOUNDARIES as readonly number[]).includes(week) && (progress?.day ?? -1) === 0;

  // No real trigger for sensitive-moment mode exists anywhere in this codebase
  // yet (see Important/Design-updated.md §8 for the design intent) -- no
  // session before this one has wired a signal for it (a recent flagged loss,
  // a concerning check-in result, etc.). BabyScreen implements the correct
  // suppression behaviour and is tested for it; this stays false until that
  // cross-cutting signal exists, the same way Today's page.tsx hard-sets
  // showWeeklyReflection to false pending its own missing data.
  const sensitiveMode = false;

  const timelineEntries = buildTimeline({
    // Postgres check constraints (event_type, source) aren't reflected in the
    // generated Row type, which widens both to plain `string` -- same loose
    // cast Today's page.tsx already uses for appointments/medicine logs at
    // this exact query-to-domain boundary.
    events: data.timelineEvents as unknown as TimelineEventInput[],
    milestones: MILESTONES,
    currentWeek: week,
    // exactOptionalPropertyTypes forbids passing `lmp: undefined` explicitly
    // for an optional prop -- the key must be omitted entirely rather than
    // present-with-undefined, hence building the object conditionally.
    ...(data.pregnancy?.lmp_date ? { lmp: data.pregnancy.lmp_date } : {}),
    ...(data.pregnancy?.edd ? { edd: data.pregnancy.edd } : {}),
  });

  return (
    <BabyScreen
      week={week}
      stageNumber={stageNumber}
      babyCount={babyCount}
      stage={weekIllustrationSrc(week)}
      stageChangedToday={stageChangedToday}
      sensitiveMode={sensitiveMode}
      timelineEntries={timelineEntries}
      showKicksCard={week >= KICKS_MIN_WEEK}
      favoriteNames={favoriteNames}
    />
  );
}
