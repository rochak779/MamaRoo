"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { addAdviceUpdate, createAdvice } from "@/app/actions/advice";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Locale } from "@/lib/config";
import {
  ADVICE_TYPES,
  latestUpdate,
  validateAdviceBody,
  type AdviceBodyValidationError,
  type AdviceRecord,
  type AdviceType,
  type AdviceUpdateRecord,
} from "@/lib/domain/advice";
import { useOnline } from "@/lib/pwa/useOnline";
import type { Transcriber } from "@/lib/speech/transcribe";
import { webSpeechTranscriber } from "@/lib/speech/webspeech";

export interface AdviceFormProps {
  /** null starts a new thread; a record appends an update to it. */
  advice: AdviceRecord | null;
  onCreate?: typeof createAdvice;
  onAddUpdate?: typeof addAdviceUpdate;
  onCreated?: (advice: AdviceRecord) => void;
  onAppended?: (adviceId: string, update: AdviceUpdateRecord) => void;
  onClose: () => void;
  transcriber?: Transcriber;
}

export function AdviceForm({
  advice,
  onCreate = createAdvice,
  onAddUpdate = addAdviceUpdate,
  onCreated,
  onAppended,
  onClose,
  transcriber = webSpeechTranscriber,
}: AdviceFormProps) {
  const t = useTranslations("advice");
  const locale = useLocale() as Locale;
  const online = useOnline();
  const savingRef = useRef(false);
  const stopListeningRef = useRef<(() => void) | null>(null);
  const isEdit = Boolean(advice);
  const last = advice ? latestUpdate(advice) : null;

  const [type, setType] = useState<AdviceType>(advice?.type ?? "medicine");
  const [text, setText] = useState("");
  const [doctorName, setDoctorName] = useState(last?.doctorName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);

  function fieldError(kind: AdviceBodyValidationError): string {
    if (kind === "empty") return t("errors.empty");
    if (kind === "too_long") return t("errors.tooLong");
    return t("errors.invalid");
  }

  function stopListening() {
    stopListeningRef.current?.();
    stopListeningRef.current = null;
    setListening(false);
  }

  function toggleVoice() {
    if (listening) {
      stopListening();
      return;
    }
    setError(null);
    stopListeningRef.current = transcriber.start({
      locale,
      onResult: (result, isFinal) => {
        setText(result);
        if (isFinal) stopListening();
      },
      onError: () => {
        setError(t("errors.voice"));
        stopListening();
      },
    });
    setListening(true);
  }

  async function submit() {
    if (savingRef.current) return;
    const validated = validateAdviceBody(text);
    if (!validated.ok) {
      setError(fieldError(validated.error));
      return;
    }
    if (!online) {
      setError(t("offline"));
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      if (isEdit && advice) {
        const result = await onAddUpdate({ adviceId: advice.id, body: validated.value, doctorName });
        if (result.ok) {
          onAppended?.(advice.id, result.update);
          onClose();
        } else if ("errors" in result && result.errors.body) {
          setError(fieldError(result.errors.body));
        } else {
          setError(t("errors.save"));
        }
      } else {
        const result = await onCreate({ type, body: validated.value, doctorName });
        if (result.ok) {
          onCreated?.(result.advice);
          onClose();
        } else if ("errors" in result && result.errors.body) {
          setError(fieldError(result.errors.body));
        } else {
          setError(t("errors.save"));
        }
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-md">
      {!online && (
        <p role="status" className="rounded-sm bg-surface px-md py-sm text-body-sm text-text-secondary">
          {t("offline")}
        </p>
      )}

      {!isEdit && (
        <div className="flex flex-wrap gap-sm" role="group" aria-label={t("typeLabel")}>
          {ADVICE_TYPES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={type === option}
              className="tap-target rounded-full border border-divider bg-surface px-md py-xs text-body-sm text-text-primary aria-pressed:border-soft-coral aria-pressed:bg-soft-coral aria-pressed:text-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
              onClick={() => setType(option)}
            >
              {t(`types.${option}`)}
            </button>
          ))}
        </div>
      )}

      {isEdit && advice && (
        <ol className="flex flex-col gap-sm">
          {advice.updates.map((update) => (
            <li key={update.id} className="rounded-sm bg-surface px-md py-sm">
              <p className="text-body-sm text-text-primary">{update.body}</p>
              <p className="mt-xs text-caption text-text-secondary">{update.doctorName ?? t("unnamedDoctor")}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-col gap-xs">
        <label htmlFor="advice-body" className="text-body-sm text-text-secondary">
          {t("bodyLabel")}
        </label>
        <textarea
          id="advice-body"
          value={text}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? "advice-body-error" : undefined}
          placeholder={t("placeholder")}
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
          }}
          className="min-h-[96px] w-full resize-y rounded-sm border border-divider bg-surface px-md py-sm text-body text-text-primary placeholder:text-text-secondary focus:border-2 focus:border-accent-primary focus:outline-none"
        />
        {transcriber.isAvailable() && (
          <Button type="button" variant="secondary" onClick={toggleVoice} aria-pressed={listening}>
            {listening ? t("listening") : t("voiceButton")}
          </Button>
        )}
      </div>

      <Input
        id="advice-doctor"
        label={t("doctorLabel")}
        placeholder={t("doctorPlaceholder")}
        value={doctorName}
        onChange={(event) => setDoctorName(event.target.value)}
      />

      {error && (
        <p id="advice-body-error" role="alert" className="text-body-sm text-alert">
          {error}
        </p>
      )}

      <div className="mt-sm flex gap-sm">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          {t("cancel")}
        </Button>
        <Button
          type="button"
          loading={saving}
          disabled={!online || saving}
          {...(!online ? { disabledReason: t("offline") } : {})}
          onClick={() => void submit()}
          className="flex-1"
        >
          {isEdit ? t("saveUpdate") : t("save")}
        </Button>
      </div>
    </div>
  );
}
