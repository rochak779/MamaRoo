"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/components/AnalyticsProvider";
import { ErrorBanner } from "@/components/patterns/ErrorBanner";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/ToastProvider";
import { EVENTS } from "@/lib/analytics/events";
import { PRODUCT_NAME } from "@/lib/config";
import {
  parseReminderPreferences,
  type ReminderPreferences,
} from "@/lib/domain/settings";
import type { NotificationPrivacy } from "@/lib/domain/onboarding";
import { useOnline } from "@/lib/pwa/useOnline";
import { cn } from "@/lib/cn";

type SaveResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> }
  | { ok: false; error: string };

export const REMINDER_STORAGE_KEY = "mamaroo.notification-reminders.v1";
const REMINDER_CHANGE_EVENT = "mamaroo:notification-reminders-change";

function subscribeToReminderPreferences(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(REMINDER_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(REMINDER_CHANGE_EVENT, onStoreChange);
  };
}

function readReminderPreferences(): string | null {
  try {
    return localStorage.getItem(REMINDER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function NotificationsScreen({
  initialPrivacy,
  onSavePrivacy,
}: {
  initialPrivacy: NotificationPrivacy;
  onSavePrivacy: (privacy: NotificationPrivacy) => Promise<SaveResult>;
}) {
  const t = useTranslations("meNotifications");
  const isOnline = useOnline();
  const { show } = useToast();
  const rawPreferences = useSyncExternalStore(subscribeToReminderPreferences, readReminderPreferences, () => null);
  const preferences = parseReminderPreferences(rawPreferences);
  const [privacy, setPrivacy] = useState<NotificationPrivacy>(initialPrivacy);
  const [error, setError] = useState<"offline" | "save" | null>(null);

  function setReminder(key: keyof ReminderPreferences, value: boolean) {
    const next = { ...preferences, [key]: value };
    try {
      localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(REMINDER_CHANGE_EVENT));
    } catch {
      // The profile privacy control still works if browser storage is blocked;
      // device-only reminder choices simply keep their safe defaults.
    }
  }

  async function setPrivacyChoice(next: NotificationPrivacy) {
    if (next === privacy) return;
    if (!isOnline) {
      track(EVENTS.offline_write_blocked, { feature: "profile" });
      setError("offline");
      return;
    }
    const previous = privacy;
    setPrivacy(next);
    setError(null);
    const result = await onSavePrivacy(next);
    if (!result.ok) {
      setPrivacy(previous);
      setError("save");
      return;
    }
    track(EVENTS.settings_saved, { section: "notifications" });
    show(t("saved"));
  }

  const allOff = !preferences.medicine && !preferences.appointments && !preferences.weekly;
  const detailed = privacy === "detailed";

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-lg py-screen">
      <h1 className="font-display text-h1 font-bold text-text-primary">{t("title")}</h1>

      {error && (
        <ErrorBanner
          message={t(error === "offline" ? "offline" : "saveError")}
          nextStep={t(error === "offline" ? "offlineNext" : "saveNext")}
        />
      )}

      <section className="flex flex-col gap-sm" aria-labelledby="reminders-heading">
        <h2 id="reminders-heading" className="font-display text-h2 font-semibold text-text-primary">{t("reminders")}</h2>
        <div className="rounded-md bg-surface-raised px-md shadow-1">
          {([
            ["medicine", "medicine"],
            ["appointments", "appointments"],
            ["weekly", "weekly"],
          ] as const).map(([key, label], index) => (
            <div key={key} className={cn("py-sm", index < 2 && "border-b border-divider")}>
              <Toggle
                id={`reminder-${key}`}
                label={t(label)}
                checked={preferences[key]}
                onCheckedChange={(next) => setReminder(key, next)}
              />
            </div>
          ))}
        </div>
        {allOff && <p className="text-body-sm text-text-secondary">{t("allOff")}</p>}
        <p className="text-caption text-text-secondary">{t("deviceHint")}</p>
      </section>

      <section className="flex flex-col gap-sm" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading" className="font-display text-h2 font-semibold text-text-primary">{t("lockTitle")}</h2>
        <p className="text-body-sm text-text-secondary">{t("lockBody")}</p>

        <div className="flex flex-col gap-sm">
          {(["detailed", "private"] as const).map((mode) => {
            const selected = privacy === mode;
            return (
              <button
                key={mode}
                type="button"
                aria-label={t(mode === "detailed" ? "fullTitle" : "privateTitle")}
                aria-pressed={selected}
                onClick={() => void setPrivacyChoice(mode)}
                className={cn(
                  "tap-target flex flex-col gap-xs rounded-sm border bg-surface-raised p-md text-left text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary",
                  selected ? "border-2 border-accent-primary" : "border-divider",
                )}
              >
                <span className="text-body font-semibold">{t(mode === "detailed" ? "fullTitle" : "privateTitle")}</span>
                <span className="text-caption text-text-secondary">{t(mode === "detailed" ? "fullBody" : "privateBody")}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-xs text-caption font-semibold tracking-[0.04em] text-text-secondary uppercase">{t("previewLabel")}</p>
        <div className="flex flex-col gap-xs rounded-sm bg-surface-raised px-md py-sm shadow-1">
          <div className="flex items-center gap-sm">
            <span aria-hidden="true" className="size-[18px] shrink-0 rounded-full bg-peach" />
            <span className="min-w-0 flex-1 text-caption font-bold text-text-primary">{PRODUCT_NAME}</span>
            <span className="text-caption text-text-secondary">{t("now")}</span>
          </div>
          <p className="text-body-sm text-text-primary">{t(detailed ? "detailedPreview" : "privatePreview")}</p>
        </div>
      </section>
    </div>
  );
}
