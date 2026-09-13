import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { TopicList, type TopicListItem } from "@/app/(app)/guide/[topic]/TopicList";
import en from "@/i18n/en.json";
import { PRODUCT_NAME } from "@/lib/config";

// The real string lives in DB rows (content_items.citation), never in TS source --
// tests/guards/product-name.test.ts forbids hardcoding the product name outside
// lib/config.ts, so fixtures build it from PRODUCT_NAME instead.
const CURATED_CITATION = `Reviewed by ${PRODUCT_NAME}'s medical team`;

function item(overrides: Partial<TopicListItem> = {}): TopicListItem {
  return {
    id: "1",
    slug: "first-checkup",
    kind: "article",
    title: "What happens at your first checkup",
    citation: "Source: Mayo Clinic pregnancy guide",
    isFallback: false,
    durationSeconds: null,
    ...overrides,
  };
}

function renderList(props: Partial<React.ComponentProps<typeof TopicList>> = {}) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TopicList topicSlug="checkups" topicTitle="Checkups" items={[]} showFoodSafetyBanner={false} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("TopicList", () => {
  it("shows the topic title", () => {
    renderList({ topicTitle: "Checkups" });
    expect(screen.getByRole("heading", { name: "Checkups" })).toBeInTheDocument();
  });

  it("shows a warm empty state when the topic has nothing yet", () => {
    renderList({ items: [] });
    expect(screen.getByText(en.guide.topics.empty)).toBeInTheDocument();
  });

  it("renders each item's own citation, since a list can mix sources", () => {
    renderList({
      items: [
        item({ id: "1", citation: "Source: Mayo Clinic pregnancy guide" }),
        item({ id: "2", citation: CURATED_CITATION }),
      ],
    });
    expect(screen.getByText("Source: Mayo Clinic pregnancy guide")).toBeInTheDocument();
    expect(screen.getByText(CURATED_CITATION)).toBeInTheDocument();
  });

  it("marks an English-fallback item rather than hiding it", () => {
    renderList({ items: [item({ isFallback: true })] });
    expect(screen.getByText(en.common.englishOnly)).toBeInTheDocument();
  });

  it("links every item to its detail route under this topic", () => {
    renderList({ topicSlug: "checkups", items: [item({ slug: "first-checkup" })] });
    expect(screen.getByRole("link", { name: /first checkup/i })).toHaveAttribute(
      "href",
      "/guide/checkups/first-checkup",
    );
  });

  it("shows watch time for a video and no time at all for an article", () => {
    renderList({
      items: [
        item({ id: "1", kind: "video", durationSeconds: 240, title: "Watch: ultrasound basics" }),
        item({ id: "2", kind: "article", title: "First checkup basics" }),
      ],
    });
    expect(screen.getByText("4 min watch")).toBeInTheDocument();
    expect(screen.getByText(en.guide.topics.articleLabel)).toBeInTheDocument();
  });

  it("shows the Food Safety banner only when the topic asks for it", () => {
    renderList({ showFoodSafetyBanner: true });
    expect(screen.getByRole("link", { name: new RegExp(en.guide.topics.foodSafetyBannerTitle) })).toHaveAttribute(
      "href",
      "/guide/food-safety",
    );
  });

  it("never shows the Food Safety banner for a topic that doesn't ask for it", () => {
    renderList({ showFoodSafetyBanner: false });
    expect(screen.queryByRole("link", { name: new RegExp(en.guide.topics.foodSafetyBannerTitle) })).not.toBeInTheDocument();
  });
});
