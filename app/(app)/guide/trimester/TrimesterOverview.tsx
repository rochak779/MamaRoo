import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";

const STAGES = [
  { id: 1 as const, href: "/guide/trimester-1", key: "stage1", accentClassName: "border-peach" },
  { id: 2 as const, href: "/guide/trimester-2", key: "stage2", accentClassName: "border-accent-secondary" },
  { id: 3 as const, href: "/guide/trimester-3", key: "stage3", accentClassName: "border-accent-primary" },
];

export function TrimesterOverview({ currentTrimester }: { currentTrimester: 1 | 2 | 3 }) {
  const t = useTranslations("guide");

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
        <h1 className="font-display text-h1 font-semibold text-text-primary">{t("trimester.heading")}</h1>
      </header>

      {STAGES.map((stage) => {
        const isCurrent = stage.id === currentTrimester;
        return (
          <Link
            key={stage.id}
            href={stage.href}
            className={`tap-target flex flex-col gap-sm rounded-lg border-[2px] ${
              isCurrent ? stage.accentClassName : "border-transparent"
            } bg-surface-raised p-lg shadow-1 active:shadow-2`}
          >
            {isCurrent && (
              <span className="w-fit rounded-full bg-peach px-md py-xs text-caption font-semibold uppercase tracking-[0.03em] text-text-primary">
                {t("trimester.currentBadge")}
              </span>
            )}
            <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
              {t(`trimester.${stage.key}.weeks`)}
            </p>
            <p className="font-display text-h2 font-semibold text-text-primary">
              {t(`trimester.${stage.key}.title`)}
            </p>
            <p className="text-body-sm text-text-primary">{t(`trimester.${stage.key}.body`)}</p>
          </Link>
        );
      })}
    </section>
  );
}
