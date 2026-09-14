"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { track } from "@/components/AnalyticsProvider";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EVENTS } from "@/lib/analytics/events";
import type { Locale } from "@/lib/config";
import { useOnline } from "@/lib/pwa/useOnline";
import type { Transcriber } from "@/lib/speech/transcribe";

export type Feeling = "good" | "new" | "worried";

export interface FeelingBoxProps {
  onSubmit: (input: {
    text: string;
    feeling: Feeling | null;
    inputMethod: "text" | "voice";
  }) => Promise<void>;
  transcriber: Transcriber;
}

const FEELINGS: Feeling[] = ["good", "new", "worried"];
const FEELING_ICONS: Record<Feeling, string> = { good: "Smiley", new: "SmileyMeh", worried: "SmileySad" };

function lengthBucket(text: string): "short" | "medium" | "long" {
  if (text.length <= 40) return "short";
  if (text.length <= 160) return "medium";
  return "long";
}

export function FeelingBox({ onSubmit, transcriber }: FeelingBoxProps) {
  const t = useTranslations("today.feeling");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const isOnline = useOnline();
  const [text, setText] = useState("");
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [usedVoice, setUsedVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitText(rawText: string, inputMethod: "text" | "voice") {
    const trimmed = rawText.trim();
    if (!trimmed) {
      setError(t("emptyError"));
      return;
    }
    if (!isOnline) {
      setError(t("offlineError"));
      return;
    }
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ text: trimmed, feeling, inputMethod });
      track(EVENTS.checkin_submitted, {
        input_method: inputMethod,
        length_bucket: lengthBucket(trimmed),
        feeling,
      });
      setText("");
      setFeeling(null);
      setUsedVoice(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitText(text, usedVoice ? "voice" : "text");
  }

  return (
    <form
      data-testid="feeling-box"
      className="rounded-lg bg-surface-raised p-lg shadow-2"
      onSubmit={handleSubmit}
      noValidate
    >
      <p className="text-h3 font-display font-semibold text-text-primary">{t("prompt")}</p>
      <div className="mt-md grid grid-cols-3 gap-sm" role="group" aria-label={t("prompt")}>
        {FEELINGS.map((option) => {
          const isSelected = feeling === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              className={`tap-target flex min-h-[76px] flex-col items-center justify-center gap-xs rounded-md border-[1.5px] px-sm py-sm text-center text-body-sm font-medium text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary ${
                isSelected ? "border-accent-primary bg-bg" : "border-divider bg-surface-raised"
              }`}
              onClick={() => setFeeling((current) => (current === option ? null : option))}
            >
              <Icon name={FEELING_ICONS[option]} size="inline" className={isSelected ? "text-accent-primary" : "text-text-primary"} />
              {t(option)}
            </button>
          );
        })}
      </div>

      <label className="sr-only" htmlFor="feeling-detail">
        {t("placeholder")}
      </label>
      <div className="mt-md flex items-center gap-sm rounded-full bg-bg py-xs pl-md pr-xs">
        <input
          id="feeling-detail"
          type="text"
          value={text}
          className="min-w-0 flex-1 bg-transparent text-body-sm text-text-primary outline-none placeholder:text-text-secondary/70"
          placeholder={t("placeholder")}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? "feeling-error" : !isOnline ? "feeling-offline" : undefined}
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
          }}
        />
        {transcriber.isAvailable() && (
          <button
            type="button"
            disabled={isSubmitting}
            aria-label={t("voiceButton")}
            className="tap-target flex size-[38px] shrink-0 items-center justify-center rounded-full bg-accent-primary text-surface-raised disabled:opacity-60"
            onClick={() =>
              transcriber.start({
                locale,
                onResult: (result, isFinal) => {
                  setUsedVoice(true);
                  setText(result);
                  setError(null);
                  if (isFinal) void submitText(result, "voice");
                },
                onError: () => setError(t("voiceError")),
              })
            }
          >
            <Icon name="Microphone" size="inline" />
          </button>
        )}
      </div>

      {!isOnline && (
        <p id="feeling-offline" role="status" className="mt-sm text-body-sm text-text-secondary">
          {t("offlineError")}
        </p>
      )}
      {error && (
        <p id="feeling-error" role="alert" className="mt-sm text-body-sm text-alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="mt-md w-full"
        loading={isSubmitting}
        disabled={!isOnline}
        {...(!isOnline ? { disabledReason: t("offlineError") } : {})}
      >
        {tCommon("submit")}
      </Button>
    </form>
  );
}
