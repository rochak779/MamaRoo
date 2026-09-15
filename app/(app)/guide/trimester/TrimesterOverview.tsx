import Link from "next/link";
import { useTranslations } from "next-intl";
import { BackButton } from "@/components/patterns/BackButton";
import { Icon } from "@/components/ui/Icon";

const STAGES = [
  {
    id: 1 as const,
    href: "/guide/trimester-1",
    key: "stage1",
    icon: "Heart",
    illustrationClassName: "bg-[rgba(255,164,143,0.22)]",
  },
  {
    id: 2 as const,
    href: "/guide/trimester-2",
    key: "stage2",
    icon: "Baby",
    illustrationClassName: "bg-[rgba(157,221,161,0.28)] text-accent-secondary",
  },
  {
    id: 3 as const,
    href: "/guide/trimester-3",
    key: "stage3",
    icon: "BagSimple",
    illustrationClassName: "bg-[rgba(255,109,87,0.14)]",
  },
];

export function TrimesterOverview({ currentTrimester }: { currentTrimester: 1 | 2 | 3 }) {
  const t = useTranslations("guide");

  return (
    <section className="mx-auto flex w-full max-w-[680px] flex-col gap-md py-screen">
      <header className="flex items-center gap-md">
        <BackButton href="/guide" label={t("backLabel")} />
        <h1 className="font-display text-h1 font-semibold text-text-primary">
          {t("trimester.heading")}
        </h1>
      </header>

      {STAGES.map((stage) => {
        const isCurrent = stage.id === currentTrimester;
        return (
          <Link
            key={stage.id}
            href={stage.href}
            className={`tap-target flex flex-col gap-sm rounded-[22px] border-[2px] ${
              isCurrent ? "border-soft-coral shadow-2" : "border-transparent shadow-1"
            } bg-surface-raised p-[18px] active:shadow-3`}
          >
            {isCurrent && (
              <span className="w-fit rounded-full bg-soft-coral px-md py-xs text-caption font-semibold uppercase tracking-[0.03em] text-text-primary">
                {t("trimester.currentBadge")}
              </span>
            )}
            <div className="flex items-center gap-md">
              <span
                aria-hidden="true"
                className={`flex size-[76px] shrink-0 items-center justify-center rounded-full text-text-primary ${stage.illustrationClassName}`}
              >
                <Icon name={stage.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
                  {t(`trimester.${stage.key}.weeks`)}
                </span>
                <span className="mt-[3px] block font-display text-h2 font-semibold text-text-primary">
                  {t(`trimester.${stage.key}.title`)}
                </span>
                <span className="mt-[5px] block text-body-sm text-text-primary">
                  {t(`trimester.${stage.key}.body`)}
                </span>
              </span>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
