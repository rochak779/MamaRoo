import Link from "next/link";
import { useTranslations } from "next-intl";
import { BackButton } from "@/components/patterns/BackButton";
import { EmptyState } from "@/components/patterns/EmptyState";
import { ListRow } from "@/components/patterns/ListRow";
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

function TopicThumbnail({ kind, roomy }: { kind: TopicListItem["kind"]; roomy: boolean }) {
  const iconName = kind === "video" ? "PlayCircle" : kind === "audio" ? "SpeakerHigh" : "FileText";
  const surfaceClass =
    kind === "video"
      ? "bg-[rgba(157,221,161,0.28)] text-accent-secondary"
      : kind === "audio"
        ? "bg-[rgba(255,197,61,0.24)] text-text-primary"
        : "bg-[rgba(255,109,87,0.14)] text-text-primary";

  return (
    <span
      data-testid="topic-thumbnail"
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-[14px] ${surfaceClass} ${roomy ? "size-[84px]" : "size-[72px]"}`}
    >
      <span className="absolute -right-3 -top-3 size-12 rounded-full bg-surface-raised/45" />
      <span className="absolute -bottom-5 -left-3 size-16 rounded-full border border-current opacity-10" />
      <Icon name={iconName} className="relative" />
    </span>
  );
}

export function TopicList({ topicSlug, topicTitle, items, showFoodSafetyBanner }: TopicListProps) {
  const t = useTranslations("guide");
  const tCommon = useTranslations("common");

  return (
    <section className="mx-auto flex w-full max-w-[680px] flex-col gap-md py-screen">
      <header className="flex items-center gap-md">
        <BackButton href="/guide" label={t("backLabel")} />
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
        <div
          className="flex flex-col gap-[14px]"
          data-layout={items.length <= 2 ? "sparse" : "list"}
        >
          {items.map((item) => {
            const roomy = items.length <= 2;
            return (
              <ListRow
                key={item.id}
                href={`/guide/${topicSlug}/${item.slug}`}
                title={item.title}
                variant="card"
                roomy={roomy}
                thumbnail={<TopicThumbnail kind={item.kind} roomy={roomy} />}
                subtitle={
                  <span className="flex items-center gap-[6px] text-caption text-text-secondary">
                    <Icon
                      name={
                        item.kind === "video"
                          ? "PlayCircle"
                          : item.kind === "audio"
                            ? "SpeakerHigh"
                            : "FileText"
                      }
                      size="inline"
                      className="text-text-primary"
                    />
                    {metaText(item, t)}
                  </span>
                }
                supporting={
                  <>
                    <span className="text-[11px] leading-[15px] italic text-accent-secondary">
                      {item.citation}
                    </span>
                    {item.isFallback && (
                      <span className="text-caption text-text-secondary">
                        {tCommon("englishOnly")}
                      </span>
                    )}
                  </>
                }
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
