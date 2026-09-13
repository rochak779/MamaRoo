import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TopicList, type TopicListItem } from "@/app/(app)/guide/[topic]/TopicList";
import { resolveGuideTopic } from "@/lib/domain/guideTopics";
import { resolveLibraryList } from "@/lib/domain/library";
import { getLocale } from "@/i18n/locale";
import { listContentByCategory, listContentByWeekRange, type ContentItemRow } from "@/lib/supabase/queries/content";
import { createServerSupabase } from "@/lib/supabase/server";

function toTopicListItem(row: ContentItemRow, isFallback: boolean): TopicListItem {
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind as TopicListItem["kind"],
    title: row.title,
    citation: row.citation,
    isFallback,
    durationSeconds: row.duration_seconds,
  };
}

export default async function GuideTopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const config = resolveGuideTopic(topic);
  if (!config) notFound();

  const [locale, supabase, t] = await Promise.all([getLocale(), createServerSupabase(), getTranslations()]);

  const rows =
    config.kind === "category"
      ? await listContentByCategory({ supabase, category: config.category, locale })
      : await listContentByWeekRange({ supabase, weekMin: config.weekMin, weekMax: config.weekMax, locale });

  const entries = resolveLibraryList({
    items: rows.map((row) => ({ id: row.id, slug: row.slug, locale: row.locale as "en" | "hi", createdAt: row.created_at, row })),
    locale,
  });

  const items = entries.map(({ item, isFallback }) => toTopicListItem(item.row, isFallback));

  return (
    <TopicList
      topicSlug={topic}
      topicTitle={t(config.titleKey)}
      items={items}
      showFoodSafetyBanner={config.kind === "category" && config.showFoodSafetyBanner}
    />
  );
}
