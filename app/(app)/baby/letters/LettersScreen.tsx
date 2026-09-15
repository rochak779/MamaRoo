"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { createLetter, updateLetter, type SaveLetterResult } from "@/app/actions/letters";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { APP_TIMEZONE } from "@/lib/config";
import {
  LETTER_BODY_MAX_LENGTH,
  formatWeekLabel,
  openingLine,
  validateLetterBody,
  type LetterBodyValidationError,
  type LetterRecord,
} from "@/lib/domain/letters";
import { useOnline } from "@/lib/pwa/useOnline";

type ScreenState =
  | { mode: "list" }
  | { mode: "read"; letterId: string }
  | { mode: "write"; letterId: string | null };

export interface LettersScreenProps {
  initialLetters: LetterRecord[];
  sensitiveMode: boolean;
  onCreate?: (input: { body: unknown }) => Promise<SaveLetterResult>;
  onUpdate?: (input: { letterId: unknown; body: unknown }) => Promise<SaveLetterResult>;
}

export function LettersScreen({
  initialLetters,
  sensitiveMode,
  onCreate = createLetter,
  onUpdate = updateLetter,
}: LettersScreenProps) {
  const t = useTranslations("letters");
  const locale = useLocale();
  const online = useOnline();
  const { show } = useToast();
  const savingRef = useRef(false);
  const [letters, setLetters] = useState(initialLetters);
  const [state, setState] = useState<ScreenState>({ mode: "list" });
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected =
    state.mode === "list" ? null : (letters.find((letter) => letter.id === state.letterId) ?? null);

  function dateLabel(createdAt: string): string {
    return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: APP_TIMEZONE,
    }).format(new Date(createdAt));
  }

  function weekLabel(week: number): string {
    return formatWeekLabel({
      week,
      locale,
      template: String(t.raw("weekLabel")),
    });
  }

  function fieldError(kind: LetterBodyValidationError): string {
    if (kind === "empty") return t("errors.empty");
    if (kind === "too_long") return t("errors.tooLong");
    return t("errors.invalid");
  }

  function openComposer(letter: LetterRecord | null) {
    setDraft(letter?.body ?? "");
    setError(null);
    setState({ mode: "write", letterId: letter?.id ?? null });
  }

  function returnToList() {
    setDraft("");
    setError(null);
    setState({ mode: "list" });
  }

  async function save() {
    if (savingRef.current) return;
    const validated = validateLetterBody(draft);
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
      const result =
        state.mode === "write" && state.letterId
          ? await onUpdate({ letterId: state.letterId, body: validated.value })
          : await onCreate({ body: validated.value });
      if (result.ok) {
        setLetters((current) => {
          const withoutSaved = current.filter((letter) => letter.id !== result.letter.id);
          return [result.letter, ...withoutSaved].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        });
        show(state.mode === "write" && state.letterId ? t("updatedToast") : t("savedToast"));
        returnToList();
      } else if ("errors" in result && result.errors.body) {
        setError(fieldError(result.errors.body));
      } else {
        setError(t("errors.save"));
      }
    } catch {
      setError(t("errors.save"));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (state.mode === "write") {
    const editing = Boolean(state.letterId);
    return (
      <section
        data-testid="letters-screen"
        className="mx-auto flex min-h-[calc(100dvh-140px)] w-full max-w-[680px] flex-col gap-lg py-screen selection:bg-blush selection:text-text-primary"
        aria-labelledby="letters-compose-title"
      >
        <header className="flex items-center gap-md">
          <button
            type="button"
            aria-label={t("backToLetters")}
            onClick={returnToList}
            className="tap-target inline-flex shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
          >
            <Icon name="ArrowLeft" size="inline" />
          </button>
          <h1
            id="letters-compose-title"
            className="font-display text-h1 font-semibold text-text-primary"
          >
            {editing ? t("editTitle") : t("composeTitle")}
          </h1>
        </header>

        <div className="flex flex-1 flex-col rounded-[16px] bg-surface-raised p-md shadow-1 focus-within:shadow-2">
          <label htmlFor="letter-body" className="sr-only">
            {t("bodyLabel")}
          </label>
          <textarea
            id="letter-body"
            value={draft}
            maxLength={LETTER_BODY_MAX_LENGTH}
            autoFocus
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? "letter-body-error" : "letter-body-hint"}
            placeholder={t("placeholder")}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            className="min-h-[360px] w-full flex-1 resize-none bg-transparent font-letter text-[21px] leading-[1.65] text-text-primary caret-accent-primary outline-none placeholder:text-text-secondary/60"
          />
          <p
            id="letter-body-hint"
            className="mt-sm text-right text-caption tabular-nums text-text-secondary"
          >
            {t("characterCount", { count: draft.length, max: LETTER_BODY_MAX_LENGTH })}
          </p>
        </div>

        {!online && (
          <p role="status" className="text-body-sm text-text-secondary">
            {t("offline")}
          </p>
        )}
        {error && (
          <p id="letter-body-error" role="alert" className="text-body-sm text-alert">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-sm sm:flex-row-reverse">
          <Button
            type="button"
            loading={saving}
            disabled={!online || saving}
            {...(!online ? { disabledReason: t("offline") } : {})}
            onClick={() => void save()}
            className="w-full rounded-full sm:w-auto sm:min-w-[180px]"
          >
            {editing ? t("saveChanges") : t("save")}
          </Button>
          <Button
            type="button"
            variant="tertiary"
            onClick={returnToList}
            className="w-full sm:w-auto"
          >
            {t("cancel")}
          </Button>
        </div>
      </section>
    );
  }

  if (state.mode === "read" && selected) {
    const date = dateLabel(selected.createdAt);
    return (
      <section
        data-testid="letters-screen"
        className="mx-auto flex min-h-[calc(100dvh-140px)] w-full max-w-[680px] flex-col gap-lg py-screen selection:bg-blush selection:text-text-primary"
        aria-labelledby="letter-read-title"
      >
        <header className="flex items-center gap-md">
          <button
            type="button"
            aria-label={t("backToLetters")}
            onClick={returnToList}
            className="tap-target inline-flex shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
          >
            <Icon name="ArrowLeft" size="inline" />
          </button>
          <div className="min-w-0">
            <h1
              id="letter-read-title"
              className="font-display text-h1 font-semibold text-text-primary"
            >
              {t("readTitle")}
            </h1>
            <p className="text-caption text-text-secondary">
              {t("meta", { week: weekLabel(selected.gestationalWeek), date })}
            </p>
          </div>
        </header>

        <article className="relative flex-1 rounded-[16px] bg-surface-raised px-lg py-xl shadow-1">
          <Icon
            name="EnvelopeSimpleOpen"
            size="default"
            weight="duotone"
            className="absolute right-md top-md text-accent-primary/60"
          />
          <p
            data-testid="letter-body-read"
            className="max-w-[70ch] whitespace-pre-wrap font-letter text-[21px] leading-[1.7] text-text-primary"
          >
            {selected.body}
          </p>
        </article>

        {!sensitiveMode && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => openComposer(selected)}
            className="w-full rounded-full sm:self-end sm:w-auto"
          >
            <Icon name="PencilSimple" size="inline" />
            {t("edit")}
          </Button>
        )}
      </section>
    );
  }

  return (
    <section
      data-testid="letters-screen"
      className="mx-auto flex w-full max-w-[680px] flex-col gap-lg py-screen selection:bg-blush selection:text-text-primary"
      aria-labelledby="letters-title"
    >
      <header className="flex items-start gap-md">
        <Link
          href="/baby"
          aria-label={t("backToBaby")}
          className="tap-target inline-flex shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
        >
          <Icon name="ArrowLeft" size="inline" />
        </Link>
        <div className="min-w-0 flex-1 pt-xs">
          <h1 id="letters-title" className="font-display text-h1 font-semibold text-text-primary">
            {t("title")}
          </h1>
        </div>
      </header>

      {!sensitiveMode && (
        <Card
          interactive
          surface="raised"
          accent="coral"
          accentIcon="PencilSimpleLine"
          onClick={() => openComposer(null)}
          className="text-left"
        >
          <span className="block text-body font-semibold text-text-primary">
            {t("writeLetter")}
          </span>
          <span aria-hidden="true" className="mt-xs block text-caption text-text-secondary">
            {t("subtitle")}
          </span>
        </Card>
      )}

      {letters.length === 0 ? (
        <EmptyState iconName="EnvelopeSimpleOpen" message={t("empty")} />
      ) : (
        <ol className="flex flex-col gap-[14px]">
          {letters.map((letter) => {
            const date = dateLabel(letter.createdAt);
            return (
              <li key={letter.id}>
                <button
                  type="button"
                  aria-label={t("openLetter", { date })}
                  onClick={() => {
                    setError(null);
                    setState({ mode: "read", letterId: letter.id });
                  }}
                  className="tap-target flex w-full flex-col items-start gap-xs rounded-[18px] bg-surface-raised px-[18px] py-md text-left shadow-1 transition-[transform,box-shadow] duration-(--motion-fast) ease-standard active:scale-[0.99] active:shadow-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
                >
                  <span className="block text-caption font-semibold tracking-[0.04em] text-text-secondary uppercase">
                    {t("meta", { week: weekLabel(letter.gestationalWeek), date })}
                  </span>
                  <span className="line-clamp-2 font-letter text-[21px] leading-[26px] text-text-primary">
                    {openingLine(letter.body)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
