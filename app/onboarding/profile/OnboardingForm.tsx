"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useDraft } from "@/lib/useDraft";
import { todayInAppZone } from "@/lib/domain/dates";
import { track } from "@/components/AnalyticsProvider";
import { EVENTS } from "@/lib/analytics/events";
import {
  validateOnboarding,
  type DueDateMethod,
  type NotificationPrivacy,
  type OnboardingInput,
  type OnboardingValue,
  type PregnancyFlag,
  type TwinType,
} from "@/lib/domain/onboarding";

type Step = "aboutYou" | "pregnancyStart" | "pregnancyDetails" | "notificationPrivacy" | "journeyReady";

const STEP_ORDER: Exclude<Step, "journeyReady">[] = [
  "aboutYou",
  "pregnancyStart",
  "pregnancyDetails",
  "notificationPrivacy",
];

/** Which onboarding.ts error keys belong to which step, so a "Continue" press
 * only blocks on -- and only shows -- the errors relevant to what's on screen. */
const STEP_FIELDS: Record<(typeof STEP_ORDER)[number], string[]> = {
  aboutYou: ["displayName", "age", "weightKg", "emergencyContactName", "emergencyContactPhone"],
  pregnancyStart: ["dueDateMethod", "date"],
  pregnancyDetails: [],
  notificationPrivacy: [],
};

interface Draft {
  displayName: string;
  age: string;
  weightKg: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  dueDateMethod: DueDateMethod | "";
  date: string;
  pregnancyFlags: PregnancyFlag[];
  twinType: TwinType | null;
  sensitiveEverShown: boolean;
  notificationPrivacy: NotificationPrivacy;
}

const INITIAL_DRAFT: Draft = {
  displayName: "",
  age: "",
  weightKg: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  dueDateMethod: "",
  date: "",
  pregnancyFlags: [],
  twinType: null,
  sensitiveEverShown: false,
  notificationPrivacy: "private",
};

const DUE_DATE_METHODS: { method: DueDateMethod; hasDate: boolean }[] = [
  { method: "lmp", hasDate: true },
  { method: "scan", hasDate: true },
  { method: "manual", hasDate: true },
  { method: "ivf", hasDate: true },
  { method: "unsure", hasDate: false },
];

const PREGNANCY_FLAGS: PregnancyFlag[] = ["single", "twins", "ivf", "monitored", "priorLoss", "unsureFlag"];
const SENSITIVE_FLAGS: PregnancyFlag[] = ["ivf", "monitored", "priorLoss"];
const TWIN_TYPES: TwinType[] = ["unconfirmed", "dichorionic", "monochorionic"];

export type SaveOutcome = { ok: true } | { ok: false; errors: Record<string, string> };

export interface OnboardingFormProps {
  /** Takes the raw collected input, not the client-validated value -- the
   * server re-validates independently, the same "never trust the UI"
   * pattern as recordConsents in app/actions/consent.ts. */
  onSave: (input: OnboardingInput) => Promise<SaveOutcome>;
}

export function OnboardingForm({ onSave }: OnboardingFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const { value: draft, update, reset } = useDraft<Draft>("onboarding-draft", INITIAL_DRAFT);
  const [step, setStep] = useState<Step>("aboutYou");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedName, setSavedName] = useState<string | null>(null);
  const nameId = useId();
  const ageId = useId();
  const weightId = useId();
  const emergencyNameId = useId();
  const emergencyPhoneId = useId();
  const dateId = useId();

  useEffect(() => {
    const index = STEP_ORDER.indexOf(step as (typeof STEP_ORDER)[number]);
    if (index !== -1) track(EVENTS.onboarding_step_viewed, { step: index + 1 });
    // journeyReady isn't in STEP_ORDER (index -1) and isn't a step to view --
    // it's the completion screen, covered by onboarding_completed instead.
  }, [step]);

  /** Counts optional fields on the validated value, not the raw draft: birthYear,
   * weightKg, an emergency contact (name and phone count as one), and any
   * pregnancy flag. Used only for the onboarding_completed analytics bucket. */
  function countOptionalFieldsFilled(value: OnboardingValue): number {
    let count = 0;
    if (value.birthYear !== null) count++;
    if (value.weightKg !== null) count++;
    if (value.emergencyContactName && value.emergencyContactPhone) count++;
    if (value.pregnancyFlags.length > 0) count++;
    return count;
  }

  function buildInput() {
    return {
      displayName: draft.displayName,
      ...(draft.age.trim() ? { age: Number(draft.age) } : {}),
      ...(draft.weightKg.trim() ? { weightKg: Number(draft.weightKg) } : {}),
      ...(draft.emergencyContactName.trim() ? { emergencyContactName: draft.emergencyContactName } : {}),
      ...(draft.emergencyContactPhone.trim() ? { emergencyContactPhone: draft.emergencyContactPhone } : {}),
      dueDateMethod: draft.dueDateMethod as DueDateMethod,
      ...(draft.date.trim() ? { date: draft.date } : {}),
      pregnancyFlags: draft.pregnancyFlags,
      twinType: draft.twinType,
      notificationPrivacy: draft.notificationPrivacy,
      today: todayInAppZone(),
    };
  }

  function errorsForStep(allErrors: Record<string, string>, s: (typeof STEP_ORDER)[number]) {
    return Object.fromEntries(Object.entries(allErrors).filter(([key]) => STEP_FIELDS[s].includes(key)));
  }

  function handleContinue() {
    const currentStep = step as (typeof STEP_ORDER)[number];
    const result = validateOnboarding(buildInput());
    if (!result.ok) {
      const relevant = errorsForStep(result.errors, currentStep);
      if (Object.keys(relevant).length > 0) {
        setErrors(relevant);
        return;
      }
    }
    setErrors({});
    const index = STEP_ORDER.indexOf(currentStep);
    if (index === STEP_ORDER.length - 1) {
      void submit();
    } else {
      setStep(STEP_ORDER[index + 1]!);
    }
  }

  function handleBack() {
    const index = STEP_ORDER.indexOf(step as (typeof STEP_ORDER)[number]);
    if (index > 0) setStep(STEP_ORDER[index - 1]!);
  }

  async function submit() {
    const result = validateOnboarding(buildInput());
    if (!result.ok) {
      // Every step already gated on its own fields, so this is only reachable
      // if something upstream changed after she moved on. Send her back to
      // wherever the problem actually is, rather than failing silently here.
      const firstStepWithError = STEP_ORDER.find((s) => Object.keys(errorsForStep(result.errors, s)).length > 0);
      setErrors(result.errors);
      setStep(firstStepWithError ?? "aboutYou");
      return;
    }

    setSaving(true);
    try {
      const outcome = await onSave(buildInput());
      if (!outcome.ok) {
        const firstStepWithError = STEP_ORDER.find(
          (s) => Object.keys(errorsForStep(outcome.errors, s)).length > 0,
        );
        setErrors(outcome.errors);
        setStep(firstStepWithError ?? "aboutYou");
        return;
      }
      setSavedName(result.value.displayName);
      track(EVENTS.onboarding_completed, {
        date_mode: result.value.eddSource,
        optional_fields_filled: countOptionalFieldsFilled(result.value),
      });
      reset();
      setStep("journeyReady");
    } finally {
      setSaving(false);
    }
  }

  function toggleFlag(flag: PregnancyFlag) {
    const isSelected = draft.pregnancyFlags.includes(flag);
    const next = isSelected ? draft.pregnancyFlags.filter((f) => f !== flag) : [...draft.pregnancyFlags, flag];
    update({
      pregnancyFlags: next,
      sensitiveEverShown: draft.sensitiveEverShown || (!isSelected && SENSITIVE_FLAGS.includes(flag)),
    });
  }

  if (step === "journeyReady" && savedName) {
    return (
      <div className="mobile-screen flex min-h-dvh flex-col items-center justify-center gap-lg bg-bg px-screen text-center">
        <h1 className="font-display text-display text-text-primary">{t("onboarding.journeyReady.greeting", { name: savedName })}</h1>
        <Button onClick={() => router.push("/today")}>{t("onboarding.journeyReady.cta")}</Button>
      </div>
    );
  }

  return (
    <div className="mobile-screen flex min-h-dvh flex-col gap-lg bg-bg px-screen py-xl">
      {step === "aboutYou" && (
        <div className="flex flex-col gap-lg">
          <h1 className="font-display text-h1 text-text-primary">{t("onboarding.aboutYou.title")}</h1>
          <Input
            id={nameId}
            label={t("onboarding.aboutYou.nameLabel")}
            placeholder={t("onboarding.aboutYou.namePlaceholder")}
            value={draft.displayName}
            onChange={(e) => update({ displayName: e.target.value })}
            {...(errors.displayName ? { error: errors.displayName } : {})}
          />
          <Input
            id={ageId}
            type="number"
            inputMode="numeric"
            label={t("onboarding.aboutYou.ageLabel")}
            placeholder={t("onboarding.aboutYou.agePlaceholder")}
            value={draft.age}
            onChange={(e) => update({ age: e.target.value })}
            {...(errors.age ? { error: errors.age } : {})}
          />
          <Input
            id={weightId}
            type="number"
            inputMode="decimal"
            label={t("onboarding.aboutYou.weightLabel")}
            placeholder={t("onboarding.aboutYou.weightPlaceholder")}
            value={draft.weightKg}
            onChange={(e) => update({ weightKg: e.target.value })}
            {...(errors.weightKg ? { error: errors.weightKg } : {})}
          />
          <Card className="flex flex-col gap-md">
            <h2 className="font-display text-h2 text-text-primary">{t("onboarding.aboutYou.emergencyTitle")}</h2>
            <Input
              id={emergencyNameId}
              label={t("onboarding.aboutYou.emergencyNameLabel")}
              placeholder={t("onboarding.aboutYou.emergencyNamePlaceholder")}
              value={draft.emergencyContactName}
              onChange={(e) => update({ emergencyContactName: e.target.value })}
              {...(errors.emergencyContactName ? { error: errors.emergencyContactName } : {})}
            />
            <Input
              id={emergencyPhoneId}
              type="tel"
              inputMode="numeric"
              label={t("onboarding.aboutYou.emergencyPhoneLabel")}
              placeholder={t("onboarding.aboutYou.emergencyPhonePlaceholder")}
              value={draft.emergencyContactPhone}
              onChange={(e) => update({ emergencyContactPhone: e.target.value })}
              {...(errors.emergencyContactPhone ? { error: errors.emergencyContactPhone } : {})}
            />
            <p className="text-caption text-text-secondary">{t("onboarding.aboutYou.emergencyNote")}</p>
          </Card>
        </div>
      )}

      {step === "pregnancyStart" && (
        <div className="flex flex-col gap-lg">
          <h1 className="font-display text-h1 text-text-primary">{t("onboarding.pregnancyStart.title")}</h1>
          <p className="text-body text-text-secondary">{t("onboarding.pregnancyStart.subtitle")}</p>
          <div className="flex flex-col gap-sm">
            {DUE_DATE_METHODS.map(({ method, hasDate }) => (
              <Card
                key={method}
                interactive
                selected={draft.dueDateMethod === method}
                onClick={() => update({ dueDateMethod: method, ...(hasDate ? {} : { date: "" }) })}
              >
                <p className="text-body font-medium text-text-primary">
                  {t(`onboarding.pregnancyStart.method${capitalize(method)}Title`)}
                </p>
                {method !== "unsure" && (
                  <p className="text-body-sm text-text-secondary">
                    {t(`onboarding.pregnancyStart.method${capitalize(method)}Desc`)}
                  </p>
                )}
                {draft.dueDateMethod === method && hasDate && (
                  <div className="pt-sm" onClick={(e) => e.stopPropagation()}>
                    <Input
                      id={dateId}
                      type="date"
                      max={todayInAppZone()}
                      label={t("onboarding.pregnancyStart.dateLabel")}
                      value={draft.date}
                      onChange={(e) => update({ date: e.target.value })}
                      {...(errors.date ? { error: errors.date } : {})}
                    />
                  </div>
                )}
              </Card>
            ))}
          </div>
          {errors.dueDateMethod && <p className="text-caption text-alert">{errors.dueDateMethod}</p>}
        </div>
      )}

      {step === "pregnancyDetails" && (
        <div className="flex flex-col gap-lg">
          <h1 className="font-display text-h1 text-text-primary">{t("onboarding.pregnancyDetails.title")}</h1>
          <p className="text-body text-text-secondary">{t("onboarding.pregnancyDetails.subtitle")}</p>
          <div className="flex flex-wrap gap-sm">
            {PREGNANCY_FLAGS.map((flag) => (
              <button
                key={flag}
                type="button"
                onClick={() => toggleFlag(flag)}
                data-selected={draft.pregnancyFlags.includes(flag) ? "true" : undefined}
                className="tap-target rounded-full border border-divider bg-surface-raised px-md py-sm text-body-sm text-text-primary data-[selected=true]:border-[1.5px] data-[selected=true]:border-accent-secondary data-[selected=true]:bg-peach data-[selected=true]:font-medium"
              >
                {t(`onboarding.pregnancyDetails.flag${capitalize(flag)}`)}
              </button>
            ))}
          </div>

          {draft.pregnancyFlags.includes("twins") && (
            <Card className="flex flex-col gap-sm">
              <p className="text-body text-text-primary">{t("onboarding.pregnancyDetails.twinQuestion")}</p>
              <div className="flex flex-wrap gap-sm">
                {TWIN_TYPES.map((twinType) => (
                  <button
                    key={twinType}
                    type="button"
                    onClick={() => update({ twinType })}
                    data-selected={draft.twinType === twinType ? "true" : undefined}
                    className="tap-target rounded-full border border-divider bg-surface-raised px-md py-sm text-body-sm text-text-primary data-[selected=true]:border-[1.5px] data-[selected=true]:border-accent-secondary data-[selected=true]:bg-peach data-[selected=true]:font-medium"
                  >
                    {t(`onboarding.pregnancyDetails.twin${capitalize(twinType)}`)}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {draft.sensitiveEverShown && (
            <p className="text-body-sm text-text-secondary">{t("onboarding.pregnancyDetails.sensitiveNote")}</p>
          )}
        </div>
      )}

      {step === "notificationPrivacy" && (
        <div className="flex flex-col gap-lg">
          <h1 className="font-display text-h1 text-text-primary">{t("onboarding.notificationPrivacy.title")}</h1>
          <p className="text-body text-text-secondary">{t("onboarding.notificationPrivacy.intro")}</p>
          <div className="flex flex-col gap-sm">
            <Card
              interactive
              selected={draft.notificationPrivacy === "private"}
              onClick={() => update({ notificationPrivacy: "private" })}
            >
              <p className="text-body font-medium text-text-primary">
                {t("onboarding.notificationPrivacy.privateTitle")}
              </p>
              <p className="text-body-sm text-text-secondary">{t("onboarding.notificationPrivacy.privateDesc")}</p>
            </Card>
            <Card
              interactive
              selected={draft.notificationPrivacy === "detailed"}
              onClick={() => update({ notificationPrivacy: "detailed" })}
            >
              <p className="text-body font-medium text-text-primary">
                {t("onboarding.notificationPrivacy.detailedTitle")}
              </p>
              <p className="text-body-sm text-text-secondary">{t("onboarding.notificationPrivacy.detailedDesc")}</p>
            </Card>
          </div>
        </div>
      )}

      <div className="flex-1" />

      <div className="flex flex-col gap-sm">
        <Button onClick={handleContinue} loading={saving}>
          {t("common.continue")}
        </Button>
        {step !== "aboutYou" && (
          <Button variant="tertiary" onClick={handleBack}>
            {t("common.back")}
          </Button>
        )}
      </div>
    </div>
  );
}

function capitalize<S extends string>(s: S): Capitalize<S> {
  return (s.charAt(0).toUpperCase() + s.slice(1)) as Capitalize<S>;
}
