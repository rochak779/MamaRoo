import { describe, expect, it } from "vitest";
import { GUIDE_TOPIC_SLUGS, resolveGuideTopic } from "@/lib/domain/guideTopics";

describe("resolveGuideTopic", () => {
  it("resolves every slug GuideHome and TrimesterOverview link to", () => {
    const linkedSlugs = [
      "checkups",
      "eating-well",
      "staying-active",
      "medicines",
      "birth",
      "after-birth",
      "trimester-1",
      "trimester-2",
      "trimester-3",
    ];
    for (const slug of linkedSlugs) {
      expect(resolveGuideTopic(slug)).not.toBeNull();
    }
    expect(GUIDE_TOPIC_SLUGS.sort()).toEqual(linkedSlugs.sort());
  });

  it("returns null for an unknown slug rather than throwing", () => {
    expect(resolveGuideTopic("not-a-real-topic")).toBeNull();
  });

  it("maps each category slug to a value the content_items check constraint accepts", () => {
    const categories = ["checkups", "eating_well", "staying_active", "medicines", "birth", "after_birth"];
    const resolved = GUIDE_TOPIC_SLUGS.map((slug) => resolveGuideTopic(slug)).filter(
      (topic) => topic?.kind === "category",
    );
    expect(resolved.map((topic) => topic!.category).sort()).toEqual(categories.sort());
  });

  it("covers weeks 0 through 42 across the three trimester stages with no gap or overlap", () => {
    const stages = ["trimester-1", "trimester-2", "trimester-3"]
      .map((slug) => resolveGuideTopic(slug))
      .filter((topic) => topic?.kind === "trimester")
      .sort((a, b) => a!.weekMin - b!.weekMin);
    expect(stages[0]!.weekMin).toBe(0);
    expect(stages[stages.length - 1]!.weekMax).toBe(42);
    for (let i = 1; i < stages.length; i += 1) {
      expect(stages[i]!.weekMin).toBe(stages[i - 1]!.weekMax + 1);
    }
  });
});
