"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/components/AnalyticsProvider";
import { ErrorBanner } from "@/components/patterns/ErrorBanner";
import { LanguageSwitcher } from "@/components/patterns/LanguageSwitcher";
import { ListRow } from "@/components/patterns/ListRow";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import { EVENTS } from "@/lib/analytics/events";
import type { Locale } from "@/lib/config";
import { ageFromBirthYear, type SettingsFieldError } from "@/lib/domain/settings";
import { useOnline } from "@/lib/pwa/useOnline";

type SaveResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> }
  | { ok: false; error: string };

export interface PersonalInfoFormProps {
  initial: {
    displayName: string;
    birthYear: number | null;
    city: string | null;
    heightCm: number | null;
    mobileNumber: string | null;
    locale: Locale;
  };
  today: string;
  onSave: (input: {
    displayName: string;
    age: string;
    city: string;
    heightCm: string;
    mobileNumber: string;
  }) => Promise<SaveResult>;
  onLocaleChange: (locale: Locale) => Promise<SaveResult>;
}

export function PersonalInfoForm({ initial, today, onSave, onLocaleChange }: PersonalInfoFormProps) {
  const t = useTranslations("mePersonal");
  const isOnline = useOnline();
  const { show } = useToast();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [age, setAge] = useState(String(ageFromBirthYear(initial.birthYear, today) ?? ""));
  const [city, setCity] = useState(initial.city ?? "");
  const [heightCm, setHeightCm] = useState(String(initial.heightCm ?? ""));
  const [mobileNumber, setMobileNumber] = useState(initial.mobileNumber ?? "");
  const [locale, setLocale] = useState(initial.locale);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<"offline" | "save" | "language" | null>(null);
  const [saving, setSaving] = useState(false);

  const errorText = (field: string) => {
    const code = errors[field];
    return code && code !== "locale_invalid"
      ? t(`errors.${code as SettingsFieldError}` as "errors.name_required")
      : undefined;
  };
  const nameError = errorText("displayName");
  const ageError = errorText("age");
  const heightError = errorText("heightCm");
  const mobileError = errorText("mobileNumber");

  async function handleLocaleChange(next: Locale) {
    if (!isOnline) {
      track(EVENTS.offline_write_blocked, { feature: "profile" });
      setGeneralError("offline");
      return;
    }
    const previous = locale;
    setGeneralError(null);
    setLocale(next);
    const result = await onLocaleChange(next);
    if (!result.ok) {
      setLocale(previous);
      setGeneralError("language");
      return;
    }
    track(EVENTS.settings_saved, { section: "personal" });
    show(t("languageSaved"));
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
      const result = await onSave({ displayName, age, city, heightCm, mobileNumber });
      if (!result.ok) {
        if ("errors" in result) setErrors(result.errors);
        else setGeneralError("save");
        return;
      }
      track(EVENTS.settings_saved, { section: "personal" });
      show(t("saved"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="mx-auto flex w-full max-w-[680px] flex-col gap-lg py-screen" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <h1 className="font-display text-h1 font-bold text-text-primary">{t("title")}</h1>

      {generalError && (
        <ErrorBanner
          message={t(generalError === "offline" ? "offline" : generalError === "language" ? "languageError" : "saveError")}
          nextStep={t(generalError === "offline" ? "offlineNext" : "saveNext")}
        />
      )}

      <Card className="flex flex-col gap-md bg-surface-raised shadow-1">
        <h2 className="font-display text-h2 font-semibold text-text-primary">{t("details")}</h2>
        <Input
          id="personal-name"
          label={t("name")}
          placeholder={t("namePlaceholder")}
          value={displayName}
          maxLength={80}
          onChange={(event) => setDisplayName(event.target.value)}
          {...(nameError ? { error: nameError } : {})}
        />
        <Input
          id="personal-age"
          label={t("age")}
          placeholder={t("agePlaceholder")}
          type="number"
          inputMode="numeric"
          min={12}
          max={70}
          value={age}
          onChange={(event) => setAge(event.target.value)}
          {...(ageError ? { error: ageError } : {})}
        />
        <Input
          id="personal-city"
          label={t("city")}
          placeholder={t("cityPlaceholder")}
          value={city}
          maxLength={120}
          onChange={(event) => setCity(event.target.value)}
        />
        <Input
          id="personal-height"
          label={t("height")}
          placeholder={t("heightPlaceholder")}
          type="number"
          inputMode="decimal"
          min={100}
          max={220}
          step="0.1"
          value={heightCm}
          onChange={(event) => setHeightCm(event.target.value)}
          {...(heightError ? { error: heightError } : {})}
        />
        <div className="flex flex-col gap-xs">
          <label htmlFor="personal-mobile" className="text-body-sm text-text-secondary">
            {t("mobile")}
          </label>
          <div className="flex min-h-[48px] overflow-hidden rounded-sm border border-divider bg-surface">
            <span aria-hidden="true" className="flex items-center border-r border-divider px-md text-body text-text-primary">
              +91
            </span>
            <input
              id="personal-mobile"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              value={mobileNumber}
              placeholder={t("mobilePlaceholder")}
              aria-invalid={mobileError ? "true" : undefined}
              aria-describedby={mobileError ? "personal-mobile-error" : "personal-mobile-hint"}
              onChange={(event) => setMobileNumber(event.target.value.replace(/\D/g, "").slice(0, 10))}
              className="min-w-0 flex-1 bg-transparent px-md py-sm text-body outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-primary"
            />
          </div>
          {mobileError ? (
            <p id="personal-mobile-error" className="text-caption text-alert">{mobileError}</p>
          ) : (
            <p id="personal-mobile-hint" className="text-caption text-text-secondary">{t("mobileHint")}</p>
          )}
        </div>
      </Card>

      <section className="flex flex-col gap-sm" aria-labelledby="language-heading">
        <h2 id="language-heading" className="font-display text-h2 font-semibold text-text-primary">{t("language")}</h2>
        <LanguageSwitcher current={locale} onSelect={(next) => void handleLocaleChange(next)} />
      </section>

      <Card className="p-0 shadow-1">
        <div className="px-md pt-md">
          <p className="text-body-sm text-text-secondary">{t("emergencyContactsHint")}</p>
        </div>
        <div className="px-md">
          <ListRow
            title={t("emergencyContacts")}
            href="/me/prep"
            iconName="PhoneCall"
            trailing={<Icon name="CaretRight" size="inline" className="text-text-primary/40" />}
          />
        </div>
      </Card>

      <Button type="submit" loading={saving} className="w-full rounded-full">
        {t("save")}
      </Button>
    </form>
  );
}
