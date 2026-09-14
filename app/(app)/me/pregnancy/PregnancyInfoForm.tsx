"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/components/AnalyticsProvider";
import { ErrorBanner } from "@/components/patterns/ErrorBanner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import { EVENTS } from "@/lib/analytics/events";
import { isValidDateString } from "@/lib/domain/dates";
import type { DueDateMethod, PregnancyFlag, TwinType } from "@/lib/domain/onboarding";
import { pregnancyProgress } from "@/lib/domain/pregnancy";
import type { SettingsFieldError } from "@/lib/domain/settings";
import { useOnline } from "@/lib/pwa/useOnline";
import { cn } from "@/lib/cn";

type SaveResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> }
  | { ok: false; error: string };

export interface PregnancyInfoFormProps {
  initial: {
    dueDate: string;
    dueDateSource: DueDateMethod;
    pregnancyFlags: PregnancyFlag[];
    twinType: TwinType | null;
    babyNames: string[];
    isFirstPregnancy: boolean | null;
    prePregnancyWeightKg: number | null;
    doctorName: string | null;
    clinicName: string | null;
  };
  today: string;
  onSave: (input: {
    dueDate: string;
    dueDateSource: DueDateMethod;
    pregnancyFlags: PregnancyFlag[];
    twinType: TwinType | null;
    babyNames: string[];
    isFirstPregnancy: boolean | null;
    prePregnancyWeightKg: string;
    doctorName: string;
    clinicName: string;
  }) => Promise<SaveResult>;
}

const FLAGS: PregnancyFlag[] = ["single", "twins", "ivf", "monitored", "priorLoss", "unsureFlag"];
const TWIN_TYPES: TwinType[] = ["unconfirmed", "dichorionic", "monochorionic"];

export function PregnancyInfoForm({ initial, today, onSave }: PregnancyInfoFormProps) {
  const t = useTranslations("mePregnancy");
  const isOnline = useOnline();
  const { show } = useToast();
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [dueDateSource, setDueDateSource] = useState<DueDateMethod>(initial.dueDateSource);
  const [pregnancyFlags, setPregnancyFlags] = useState(initial.pregnancyFlags);
  const [twinType, setTwinType] = useState<TwinType | null>(initial.twinType);
  const [babyNames, setBabyNames] = useState([
    initial.babyNames[0] ?? "",
    initial.babyNames[1] ?? "",
  ]);
  const [isFirstPregnancy, setIsFirstPregnancy] = useState(initial.isFirstPregnancy);
  const [weight, setWeight] = useState(String(initial.prePregnancyWeightKg ?? ""));
  const [doctorName, setDoctorName] = useState(initial.doctorName ?? "");
  const [clinicName, setClinicName] = useState(initial.clinicName ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<"offline" | "save" | null>(null);
  const [saving, setSaving] = useState(false);

  const hasTwins = pregnancyFlags.includes("twins");
  const week = isValidDateString(dueDate) ? pregnancyProgress({ edd: dueDate, today }).week : null;
  const errorText = (field: string) => {
    const code = errors[field];
    return code ? t(`errors.${code as SettingsFieldError}` as "errors.due_date_invalid") : undefined;
  };
  const dueDateError = errorText("dueDate");
  const babyNamesError = errorText("babyNames");
  const weightError = errorText("prePregnancyWeightKg");
  const doctorError = errorText("doctorName");
  const clinicError = errorText("clinicName");

  function toggleFlag(flag: PregnancyFlag) {
    setPregnancyFlags((current) => {
      if (current.includes(flag)) {
        if (flag === "twins") setTwinType(null);
        return current.filter((item) => item !== flag);
      }
      if (flag === "single") {
        setTwinType(null);
        return [...current.filter((item) => item !== "twins"), flag];
      }
      if (flag === "twins") return [...current.filter((item) => item !== "single"), flag];
      return [...current, flag];
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isOnline) {
      track(EVENTS.offline_write_blocked, { feature: "profile" });
      setGeneralError("offline");
      return;
    }

    setSaving(true);
    setErrors({});
    setGeneralError(null);
    try {
      const result = await onSave({
        dueDate,
        dueDateSource,
        pregnancyFlags,
        twinType: hasTwins ? twinType : null,
        babyNames: babyNames.slice(0, hasTwins ? 2 : 1),
        isFirstPregnancy,
        prePregnancyWeightKg: weight,
        doctorName,
        clinicName,
      });
      if (!result.ok) {
        if ("errors" in result) setErrors(result.errors);
        else setGeneralError("save");
        return;
      }
      track(EVENTS.settings_saved, { section: "pregnancy" });
      show(t("saved"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="mx-auto flex w-full max-w-[680px] flex-col gap-lg py-screen" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <div className="flex items-baseline justify-between gap-md">
        <h1 className="font-display text-h1 font-bold text-text-primary">{t("title")}</h1>
        {week !== null && (
          <span className="shrink-0 rounded-full bg-peach px-md py-xs text-body-sm font-semibold text-text-primary">
            {t("week", { week })}
          </span>
        )}
      </div>

      {generalError && (
        <ErrorBanner
          message={t(generalError === "offline" ? "offline" : "saveError")}
          nextStep={t(generalError === "offline" ? "offlineNext" : "saveNext")}
        />
      )}

      <section className="flex flex-col gap-md">
        <Input
          id="pregnancy-due-date"
          type="date"
          label={t("dueDate")}
          hint={t("dueDateHint")}
          value={dueDate}
          onChange={(event) => {
            setDueDate(event.target.value);
            if (dueDateSource !== "scan" && dueDateSource !== "manual") setDueDateSource("manual");
          }}
          {...(dueDateError ? { error: dueDateError } : {})}
        />
        <fieldset className="flex flex-col gap-sm">
          <legend className="mb-xs text-body-sm text-text-secondary">{t("dueDateSource")}</legend>
          {dueDateSource !== "scan" && dueDateSource !== "manual" && (
            <p className="text-caption text-text-secondary">
              {t(`existingSources.${dueDateSource}`)}
            </p>
          )}
          <div className="grid grid-cols-2 gap-sm">
            {(["scan", "manual"] as const).map((source) => (
              <button
                key={source}
                type="button"
                aria-pressed={dueDateSource === source}
                onClick={() => setDueDateSource(source)}
                className={cn(
                  "tap-target rounded-sm border bg-surface-raised px-md py-sm text-body-sm font-medium text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary",
                  dueDateSource === source ? "border-2 border-accent-primary" : "border-divider",
                )}
              >
                {t(source === "scan" ? "sourceScan" : "sourceManual")}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <fieldset className="flex flex-col gap-sm">
        <legend className="mb-xs font-display text-h2 font-semibold text-text-primary">{t("circumstances")}</legend>
        <div className="flex flex-wrap gap-sm">
          {FLAGS.map((flag) => (
            <button
              key={flag}
              type="button"
              aria-pressed={pregnancyFlags.includes(flag)}
              onClick={() => toggleFlag(flag)}
              className={cn(
                "tap-target rounded-full border px-md py-sm text-body-sm font-medium text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary",
                pregnancyFlags.includes(flag) ? "border-peach bg-peach" : "border-divider bg-surface-raised",
              )}
            >
              {t(`flags.${flag}`)}
            </button>
          ))}
        </div>
        {errorText("pregnancyFlags") && <p className="text-caption text-alert">{errorText("pregnancyFlags")}</p>}
      </fieldset>

      {hasTwins && (
        <Card className="flex flex-col gap-sm">
          <h2 className="font-display text-h2 font-semibold text-text-primary">{t("twinQuestion")}</h2>
          <div className="flex flex-wrap gap-sm">
            {TWIN_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={twinType === type}
                onClick={() => setTwinType(type)}
                className={cn(
                  "tap-target rounded-full border px-md py-sm text-body-sm text-text-primary",
                  twinType === type ? "border-accent-secondary bg-peach font-medium" : "border-divider bg-surface-raised",
                )}
              >
                {t(`twinTypes.${type}`)}
              </button>
            ))}
          </div>
          {errorText("twinType") && <p className="text-caption text-alert">{errorText("twinType")}</p>}
        </Card>
      )}

      <fieldset className="flex flex-col gap-sm">
        <legend className="mb-xs font-display text-h2 font-semibold text-text-primary">{t("experience")}</legend>
        <div className="grid grid-cols-2 gap-sm">
          {([true, false] as const).map((value) => (
            <button
              key={String(value)}
              type="button"
              aria-pressed={isFirstPregnancy === value}
              onClick={() => setIsFirstPregnancy(value)}
              className={cn(
                "tap-target rounded-sm border bg-surface-raised px-md py-sm text-body-sm font-medium text-text-primary",
                isFirstPregnancy === value ? "border-2 border-accent-primary" : "border-divider",
              )}
            >
              {t(value ? "firstPregnancy" : "repeatPregnancy")}
            </button>
          ))}
        </div>
      </fieldset>

      <Card className="flex flex-col gap-md">
        <h2 className="font-display text-h2 font-semibold text-text-primary">{t("babyNames")}</h2>
        <Input
          id="pregnancy-baby-name-1"
          label={t("babyName")}
          placeholder={t("babyNamePlaceholder")}
          value={babyNames[0] ?? ""}
          maxLength={60}
          onChange={(event) => setBabyNames((current) => [event.target.value, current[1] ?? ""])}
          {...(babyNamesError ? { error: babyNamesError } : {})}
        />
        {hasTwins && (
          <Input
            id="pregnancy-baby-name-2"
            label={t("secondBabyName")}
            placeholder={t("babyNamePlaceholder")}
            value={babyNames[1] ?? ""}
            maxLength={60}
            onChange={(event) => setBabyNames((current) => [current[0] ?? "", event.target.value])}
          />
        )}
        <Input
          id="pregnancy-weight"
          label={t("weight")}
          placeholder={t("weightPlaceholder")}
          type="number"
          inputMode="decimal"
          min={25}
          max={250}
          step="0.1"
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
          {...(weightError ? { error: weightError } : {})}
        />
      </Card>

      <Card className="flex flex-col gap-md shadow-1">
        <h2 className="font-display text-h2 font-semibold text-text-primary">{t("doctorCard")}</h2>
        <Input
          id="pregnancy-doctor"
          label={t("doctor")}
          placeholder={t("doctorPlaceholder")}
          value={doctorName}
          maxLength={120}
          onChange={(event) => setDoctorName(event.target.value)}
          {...(doctorError ? { error: doctorError } : {})}
        />
        <Input
          id="pregnancy-clinic"
          label={t("clinic")}
          placeholder={t("clinicPlaceholder")}
          value={clinicName}
          maxLength={120}
          onChange={(event) => setClinicName(event.target.value)}
          {...(clinicError ? { error: clinicError } : {})}
        />
        <p className="text-caption text-text-secondary">{t("doctorHint")}</p>
      </Card>

      <Button type="submit" loading={saving} className="w-full rounded-full">{t("save")}</Button>
    </form>
  );
}
