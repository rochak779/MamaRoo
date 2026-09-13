import type { ContentCategory } from "@/lib/supabase/queries/content";

export interface CategoryTopic {
  kind: "category";
  category: ContentCategory;
  titleKey: string;
  showFoodSafetyBanner: boolean;
}

export interface TrimesterTopic {
  kind: "trimester";
  weekMin: number;
  weekMax: number;
  titleKey: string;
}

export type GuideTopic = CategoryTopic | TrimesterTopic;

/**
 * One dynamic route (`app/(app)/guide/[topic]`) serves all 9 topic lists --
 * the 6 category cards plus the 3 trimester stages -- rather than 9 near-
 * identical page.tsx files, matching the design's "shared template" framing
 * (Plan-Session-28-Replan.md, Decision 4). Trimester windows use `week<14`
 * boundaries identical to `pregnancyProgress`'s own trimester split, so a
 * stage's topic list always matches what the badge on Trimester Overview
 * calls "current".
 */
const GUIDE_TOPICS: Record<string, GuideTopic> = {
  checkups: { kind: "category", category: "checkups", titleKey: "guide.cards.checkups.label", showFoodSafetyBanner: false },
  "eating-well": {
    kind: "category",
    category: "eating_well",
    titleKey: "guide.cards.eatingWell.label",
    showFoodSafetyBanner: true,
  },
  "staying-active": {
    kind: "category",
    category: "staying_active",
    titleKey: "guide.cards.stayingActive.label",
    showFoodSafetyBanner: false,
  },
  medicines: { kind: "category", category: "medicines", titleKey: "guide.cards.medicines.label", showFoodSafetyBanner: false },
  birth: { kind: "category", category: "birth", titleKey: "guide.cards.birth.label", showFoodSafetyBanner: false },
  "after-birth": {
    kind: "category",
    category: "after_birth",
    titleKey: "guide.cards.afterBirth.label",
    showFoodSafetyBanner: false,
  },
  "trimester-1": { kind: "trimester", weekMin: 0, weekMax: 13, titleKey: "guide.trimester.stage1.title" },
  "trimester-2": { kind: "trimester", weekMin: 14, weekMax: 27, titleKey: "guide.trimester.stage2.title" },
  "trimester-3": { kind: "trimester", weekMin: 28, weekMax: 42, titleKey: "guide.trimester.stage3.title" },
};

export const GUIDE_TOPIC_SLUGS = Object.keys(GUIDE_TOPICS);

export function resolveGuideTopic(slug: string): GuideTopic | null {
  return GUIDE_TOPICS[slug] ?? null;
}
