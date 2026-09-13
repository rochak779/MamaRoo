import Link from "next/link";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Icon } from "@/components/ui/Icon";

export interface TopicListItem {
  id: string;
  slug: string;
  kind: "article" | "video" | "audio";
  title: string;
  citation: string;
  isFallback: boolean;
  durationSeconds: number | null;
}

export interface TopicListProps {
  topicSlug: string;
  topicTitle: string;
  items: TopicListItem[];
  showFoodSafetyBanner: boolean;
}

/**
 * There is no stored reading-time estimate for articles (`content_items` only
 * carries `duration_seconds`, documented for video/audio media), so an
 * article shows a plain type label instead of inventing a word-count-based
 * guess. Video/audio show a real minute count derived from the stored
 * duration.
 */
function metaText(item: TopicListItem, t: ReturnType<typeof useTranslations>): string {
  if (item.kind === "article" || item.durationSeconds === null) return t("topics.articleLabel");
  const minutes = Math.max(1, Math.ceil(item.durationSeconds / 60));
  return t(item.kind === "video" ? "topics.watchMinutes" : "topics.listenMinutes", { minutes });
}

export function TopicList({ topicSlug, topicTitle, items, showFoodSafetyBanner }: TopicListProps) {
  const t = useTranslations("guide");
  const tCommon = useTranslations("common");

  return (
    <section className="mx-auto flex w-full max-w-[680px] flex-col gap-md py-screen">
      <header className="flex items-center gap-md">
        <Link
          href="/guide"
          aria-label={t("backLabel")}
          className="tap-target inline-flex shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
        >
          <Icon name="ArrowLeft" size="inline" />
        </Link>
        <h1 className="font-display text-h1 font-semibold text-text-primary">{topicTitle}</h1>
      </header>

      {showFoodSafetyBanner && (
        <Link
          href="/guide/food-safety"
          className="tap-target flex items-center gap-md rounded-lg border-l-[5px] border-accent-secondary bg-surface-raised p-md shadow-1 active:shadow-2"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-blush">
            <Icon name="MagnifyingGlass" size="inline" className="text-text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-body font-semibold text-text-primary">
              {t("topics.foodSafetyBannerTitle")}
            </p>
            <p className="text-body-sm text-text-secondary">{t("topics.foodSafetyBannerBody")}</p>
          </div>
        </Link>
      )}

      {items.length === 0 ? (
        <EmptyState iconName="BookOpen" message={t("topics.empty")} />
      ) : (
        <div className="flex flex-col gap-sm">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/guide/${topicSlug}/${item.slug}`}
              className="tap-target flex flex-col gap-xs rounded-lg bg-surface-raised p-md shadow-1 active:shadow-2"
            >
              <p className="font-display text-body-sm font-semibold text-text-primary">{item.title}</p>
              <div className="flex items-center gap-sm">
                <Icon name={item.kind === "video" ? "PlayCircle" : item.kind === "audio" ? "SpeakerHigh" : "FileText"} size="inline" className="text-text-secondary" />
                <span className="text-caption text-text-secondary">{metaText(item, t)}</span>
              </div>
              <p className="text-caption italic text-accent-secondary">{item.citation}</p>
              {item.isFallback && <p className="text-caption text-text-secondary">{tCommon("englishOnly")}</p>}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
