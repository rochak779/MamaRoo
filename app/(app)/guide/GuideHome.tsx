import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";

interface GuideCard {
  href: string;
  key: string;
  icon: string;
  accentClassName: string;
}

/**
 * Every card links to its fixed route up front, same "wire once" move
 * Session 22 made for CareHub -- Session 28A (Food Safety) and 28B (Common
 * Questions) build the screens these routes point to, but never need to
 * touch this file. Food Safety has no card of its own here: the design's 8
 * cards are all that's on this screen, and Food Safety is reached from
 * inside the Eating Well topic list instead (Plan-Session-28-Replan.md,
 * Decision 5).
 */
const CATEGORY_CARDS: GuideCard[] = [
  { href: "/guide/checkups", key: "checkups", icon: "ClipboardText", accentClassName: "border-accent-secondary" },
  { href: "/guide/eating-well", key: "eatingWell", icon: "ForkKnife", accentClassName: "border-accent-primary" },
  { href: "/guide/staying-active", key: "stayingActive", icon: "PersonSimpleRun", accentClassName: "border-gold" },
  { href: "/guide/medicines", key: "medicines", icon: "Pill", accentClassName: "border-peach" },
  { href: "/guide/birth", key: "birth", icon: "Rainbow", accentClassName: "border-accent-primary" },
  { href: "/guide/after-birth", key: "afterBirth", icon: "Heart", accentClassName: "border-accent-secondary" },
];

export function GuideHome() {
  const t = useTranslations("guide");

  return (
    <div className="flex flex-col gap-lg py-screen">
      <div>
        <h1 className="font-display text-h1 font-semibold text-text-primary">{t("heading")}</h1>
        <p className="mt-xs text-body-sm text-text-secondary">{t("subheading")}</p>
      </div>

      <Link
        href="/guide/trimester"
        className="tap-target flex items-center gap-md rounded-lg border-l-[5px] border-peach bg-surface-raised p-lg shadow-1 active:shadow-2"
      >
        <span className="flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-peach">
          <Icon name="ChartBar" weight="duotone" className="text-text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-h2 font-semibold text-text-primary">{t("cards.trimester.label")}</p>
          <p className="mt-xs text-body-sm text-text-primary">{t("cards.trimester.body")}</p>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-md">
        {CATEGORY_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`tap-target flex flex-col gap-sm rounded-lg border-l-[5px] ${card.accentClassName} bg-surface-raised p-md shadow-1 active:shadow-2`}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-blush">
              <Icon name={card.icon} size="inline" className="text-text-primary" />
            </span>
            <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
              {t(`cards.${card.key}.label`)}
            </p>
            <p className="text-body-sm text-text-primary">{t(`cards.${card.key}.body`)}</p>
          </Link>
        ))}
      </div>

      <Link
        href="/guide/questions"
        className="tap-target flex items-center gap-md rounded-lg bg-blush p-lg shadow-1 active:shadow-2"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-surface-raised">
          <Icon name="Question" className="text-text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
            {t("cards.commonQuestions.label")}
          </p>
          <p className="text-body-sm text-text-primary">{t("cards.commonQuestions.body")}</p>
        </div>
      </Link>
    </div>
  );
}
