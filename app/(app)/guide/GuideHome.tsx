import { useTranslations } from "next-intl";
import { Card, type CardAccent } from "@/components/ui/Card";

interface GuideCard {
  href: string;
  key: string;
  icon: string;
  accent: CardAccent;
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
  { href: "/guide/checkups", key: "checkups", icon: "ClipboardText", accent: "sage" },
  { href: "/guide/eating-well", key: "eatingWell", icon: "ForkKnife", accent: "coral" },
  { href: "/guide/staying-active", key: "stayingActive", icon: "PersonSimpleRun", accent: "gold" },
  { href: "/guide/medicines", key: "medicines", icon: "Pill", accent: "peach" },
  { href: "/guide/birth", key: "birth", icon: "Rainbow", accent: "coral" },
  { href: "/guide/after-birth", key: "afterBirth", icon: "Heart", accent: "sage" },
];

export function GuideHome() {
  const t = useTranslations("guide");

  return (
    <div className="flex flex-col gap-lg py-screen">
      <div>
        <h1 className="font-display text-h1 font-semibold text-text-primary">{t("heading")}</h1>
        <p className="mt-xs text-body-sm text-text-secondary">{t("subheading")}</p>
      </div>

      <Card
        href="/guide/trimester"
        interactive
        surface="raised"
        accent="peach"
        accentIcon="ChartBar"
        accentIconClassName="text-text-primary"
        className="border-l-[5px] p-lg"
      >
        <p className="font-display text-h2 font-semibold text-text-primary">
          {t("cards.trimester.label")}
        </p>
        <p className="mt-xs text-body-sm text-text-primary">{t("cards.trimester.body")}</p>
      </Card>

      <div className="grid grid-cols-2 gap-md">
        {CATEGORY_CARDS.map((card) => (
          <Card
            key={card.href}
            href={card.href}
            interactive
            surface="raised"
            accent={card.accent}
            accentIcon={card.icon}
            accentIconClassName={
              card.accent === "sage" ? "text-accent-secondary" : "text-text-primary"
            }
            accentLayout="stacked"
            className="h-full border-l-[5px]"
          >
            <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
              {t(`cards.${card.key}.label`)}
            </p>
            <p className="text-body-sm text-text-primary">{t(`cards.${card.key}.body`)}</p>
          </Card>
        ))}
      </div>

      <Card
        href="/guide/questions"
        interactive
        surface="raised"
        accent="plum"
        accentIcon="Question"
        accentIconClassName="text-text-primary"
        className="border-l-[5px] p-lg"
      >
        <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
          {t("cards.commonQuestions.label")}
        </p>
        <p className="text-body-sm text-text-primary">{t("cards.commonQuestions.body")}</p>
      </Card>
    </div>
  );
}
