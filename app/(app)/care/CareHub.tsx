import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

export interface CareHubProps {
  medicineText: string | null;
  appointmentText: string | null;
  vitalsText: string | null;
  reportText: string | null;
  adviceText: string | null;
  questionsCount: number;
  notesText: string | null;
}

/**
 * Every tile links to its fixed route up front, even before the session that
 * builds that route lands (Session 22 replan, Decision "wire once") -- so no
 * later session needs to touch this file again. The notes card was the one
 * exception at Session 22 time (no `personal_notes` table yet); Session 22A
 * wires its preview the same way as every other card.
 */
export function CareHub({
  medicineText,
  appointmentText,
  vitalsText,
  reportText,
  adviceText,
  questionsCount,
  notesText,
}: CareHubProps) {
  const t = useTranslations("care");

  const questionsText =
    questionsCount > 0 ? t("hub.questionsReady", { count: questionsCount }) : t("hub.questionsPrompt");

  return (
    <div className="flex flex-col gap-lg py-screen">
      <h1 className="font-display text-h1 text-text-primary">{t("heading")}</h1>

      {/* 2x2 grid, exactly 4 cards, matching the mockup -- Vitals has no mockup of
          its own (§3.7) and would break this into an uneven 5th tile, so it gets
          its own full-width row below instead, same as Suggested Questions/Notes. */}
      <div className="grid grid-cols-2 gap-md">
        <Link href="/care/medicines" className="block">
          <Card accent="coral" accentIcon="Pill" accentLayout="stacked" className="flex h-full flex-col gap-xs">
            <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
              {t("hub.medicineLabel")}
            </p>
            <p className="text-body-sm text-text-primary">{medicineText ?? t("hub.medicinePrompt")}</p>
          </Card>
        </Link>

        <Link href="/care/appointments" className="block">
          <Card accent="sage" accentIcon="CalendarBlank" accentLayout="stacked" className="flex h-full flex-col gap-xs">
            <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
              {t("hub.appointmentLabel")}
            </p>
            <p className="text-body-sm text-text-primary">{appointmentText ?? t("hub.appointmentPrompt")}</p>
          </Card>
        </Link>

        <Link href="/care/reports" className="block">
          <Card accent="gold" accentIcon="FileText" accentLayout="stacked" className="flex h-full flex-col gap-xs">
            <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
              {t("hub.reportLabel")}
            </p>
            <p className="text-body-sm text-text-primary">{reportText ?? t("hub.reportPrompt")}</p>
          </Card>
        </Link>

        <Link href="/care/advice" className="block">
          <Card accent="coral" accentIcon="ClipboardText" accentLayout="stacked" className="flex h-full flex-col gap-xs">
            <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
              {t("hub.adviceLabel")}
            </p>
            <p className="text-body-sm text-text-primary">{adviceText ?? t("hub.advicePrompt")}</p>
          </Card>
        </Link>
      </div>

      <Link href="/care/vitals">
        <Card accent="sage" accentIcon="ChartLine" className="flex items-center gap-md">
          <div className="flex min-w-0 flex-1 flex-col gap-xs">
            <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
              {t("hub.vitalsLabel")}
            </p>
            <p className="text-body-sm text-text-primary">{vitalsText ?? t("hub.vitalsPrompt")}</p>
          </div>
        </Card>
      </Link>

      <Link href="/care/questions">
        <Card accent="coral" accentIcon="Question" className="flex items-center gap-md">
          <div className="flex min-w-0 flex-1 flex-col gap-xs">
            <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
              {t("hub.questionsLabel")}
            </p>
            <p className="text-body-sm text-text-primary">{questionsText}</p>
          </div>
        </Card>
      </Link>

      <Link href="/care/summary">
        <Card className="flex items-center gap-md bg-peach">
          {/* The flagship's 72px illustration slot (README: "the most visually
              prominent element on the screen"). No summary illustration asset
              has been produced yet, so this is an icon placeholder in the same
              circular frame rather than fabricated artwork. */}
          <span className="flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-raised shadow-1">
            <Icon name="ClipboardText" size="hero" className="text-text-primary" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-xs">
            <p className="font-display text-body font-semibold text-text-primary">{t("hub.summaryTitle")}</p>
            <p className="text-body-sm text-text-primary">{t("hub.summaryLine")}</p>
            <span className="mt-xs inline-flex w-fit rounded-full bg-accent-primary px-md py-xs text-caption font-semibold text-surface-raised">
              {t("hub.summaryCta")}
            </span>
          </div>
        </Card>
      </Link>

      <Link href="/care/notes">
        <Card accent="sage" accentIcon="NotePencil" className="flex items-center gap-md">
          <div className="flex min-w-0 flex-1 flex-col gap-xs">
            <p className="text-caption font-semibold uppercase tracking-[0.04em] text-text-secondary">
              {t("hub.notesLabel")}
            </p>
            <p className="text-body-sm text-text-primary">{notesText ?? t("hub.notesPrompt")}</p>
          </div>
        </Card>
      </Link>
    </div>
  );
}
