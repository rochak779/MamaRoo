"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { createNote, deleteNote, updateNote, type DeleteNoteResult, type SaveNoteResult } from "@/app/actions/notes";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { APP_TIMEZONE, type Locale } from "@/lib/config";
import { todayInAppZone } from "@/lib/domain/dates";
import {
  NOTE_BODY_MAX_LENGTH,
  notePreview,
  sortNotesByRecency,
  validateNoteBody,
  type NoteBodyValidationError,
  type NoteRecord,
} from "@/lib/domain/notes";
import { useOnline } from "@/lib/pwa/useOnline";
import { webSpeechTranscriber } from "@/lib/speech/webspeech";
import type { Transcriber } from "@/lib/speech/transcribe";

type ScreenState =
  | { mode: "list" }
  | { mode: "read"; noteId: string }
  | { mode: "write"; noteId: string | null };

export interface NotesScreenProps {
  initialNotes: NoteRecord[];
  onCreate?: (input: { body: unknown }) => Promise<SaveNoteResult>;
  onUpdate?: (input: { noteId: unknown; body: unknown }) => Promise<SaveNoteResult>;
  onDelete?: (input: { noteId: unknown }) => Promise<DeleteNoteResult>;
  transcriber?: Transcriber;
}

export function NotesScreen({
  initialNotes,
  onCreate = createNote,
  onUpdate = updateNote,
  onDelete = deleteNote,
  transcriber = webSpeechTranscriber,
}: NotesScreenProps) {
  const t = useTranslations("notes");
  const locale = useLocale() as Locale;
  const online = useOnline();
  const { show } = useToast();
  const savingRef = useRef(false);
  const stopListeningRef = useRef<(() => void) | null>(null);
  const [notes, setNotes] = useState(sortNotesByRecency(initialNotes));
  const [state, setState] = useState<ScreenState>({ mode: "list" });
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const selected = state.mode === "read" || state.mode === "write"
    ? notes.find((note) => note.id === state.noteId) ?? null
    : null;

  function dateLabel(createdAt: string): string {
    if (todayInAppZone(new Date(createdAt)) === todayInAppZone()) return t("today");
    return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
      day: "numeric",
      month: "long",
      timeZone: APP_TIMEZONE,
    }).format(new Date(createdAt));
  }

  function fieldError(kind: NoteBodyValidationError): string {
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
        setDraft(result);
        if (isFinal) stopListening();
      },
      onError: () => {
        setError(t("errors.voice"));
        stopListening();
      },
    });
    setListening(true);
  }

  function openComposer(note: NoteRecord | null) {
    stopListening();
    setDraft(note?.body ?? "");
    setError(null);
    setState({ mode: "write", noteId: note?.id ?? null });
  }

  function returnToList() {
    stopListening();
    setDraft("");
    setError(null);
    setConfirmingDelete(false);
    setState({ mode: "list" });
  }

  async function save() {
    if (savingRef.current) return;
    const validated = validateNoteBody(draft);
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
      const result = state.mode === "write" && state.noteId
        ? await onUpdate({ noteId: state.noteId, body: validated.value })
        : await onCreate({ body: validated.value });
      if (result.ok) {
        setNotes((current) => sortNotesByRecency([
          result.note,
          ...current.filter((note) => note.id !== result.note.id),
        ]));
        show(state.mode === "write" && state.noteId ? t("updatedToast") : t("savedToast"));
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

  async function confirmDelete() {
    if (state.mode !== "read" || deleting) return;
    const { noteId } = state;
    setDeleting(true);
    try {
      const result = await onDelete({ noteId });
      if (result.ok) {
        setNotes((current) => current.filter((note) => note.id !== noteId));
        show(t("deletedToast"));
        returnToList();
      } else {
        setError(t("errors.delete"));
        setConfirmingDelete(false);
      }
    } finally {
      setDeleting(false);
    }
  }

  if (state.mode === "write") {
    const editing = Boolean(state.noteId);
    return (
      <section
        data-testid="notes-screen"
        className="mx-auto flex min-h-[calc(100dvh-140px)] w-full max-w-[680px] flex-col gap-lg py-screen"
        aria-labelledby="notes-compose-title"
      >
        <header className="flex items-center gap-md">
          <button
            type="button"
            aria-label={t("backToNotes")}
            onClick={returnToList}
            className="tap-target inline-flex shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
          >
            <Icon name="ArrowLeft" size="inline" />
          </button>
          <h1 id="notes-compose-title" className="font-display text-h1 font-semibold text-text-primary">
            {editing ? t("editTitle") : t("addTitle")}
          </h1>
        </header>

        <div className="flex flex-1 flex-col rounded-[16px] bg-surface-raised p-md shadow-1 focus-within:shadow-2">
          <label htmlFor="note-body" className="sr-only">{t("bodyLabel")}</label>
          <textarea
            id="note-body"
            value={draft}
            maxLength={NOTE_BODY_MAX_LENGTH}
            autoFocus
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? "note-body-error" : undefined}
            placeholder={t("placeholder")}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            className="min-h-[220px] w-full flex-1 resize-none bg-transparent text-body text-text-primary outline-none placeholder:text-text-secondary/60"
          />
        </div>

        {transcriber.isAvailable() && (
          <Button type="button" variant="secondary" onClick={toggleVoice} aria-pressed={listening}>
            {listening ? t("listening") : t("voiceButton")}
          </Button>
        )}

        {!online && <p role="status" className="text-body-sm text-text-secondary">{t("offline")}</p>}
        {error && <p id="note-body-error" role="alert" className="text-body-sm text-alert">{error}</p>}

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
          <Button type="button" variant="tertiary" onClick={returnToList} className="w-full sm:w-auto">
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
        data-testid="notes-screen"
        className="mx-auto flex min-h-[calc(100dvh-140px)] w-full max-w-[680px] flex-col gap-lg py-screen"
        aria-labelledby="note-read-title"
      >
        <header className="flex items-center gap-md">
          <button
            type="button"
            aria-label={t("backToNotes")}
            onClick={returnToList}
            className="tap-target inline-flex shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
          >
            <Icon name="ArrowLeft" size="inline" />
          </button>
          <div className="min-w-0">
            <h1 id="note-read-title" className="font-display text-h1 font-semibold text-text-primary">{t("readTitle")}</h1>
            <p className="text-caption text-text-secondary">{date}</p>
          </div>
        </header>

        <article className="flex-1 rounded-[16px] bg-surface-raised px-lg py-xl shadow-1">
          <p data-testid="note-body-read" className="whitespace-pre-wrap text-body text-text-primary">
            {selected.body}
          </p>
        </article>

        {error && <p role="alert" className="text-body-sm text-alert">{error}</p>}

        <div className="flex gap-lg">
          <button
            type="button"
            onClick={() => openComposer(selected)}
            className="text-button font-medium text-accent-primary underline-offset-4 hover:underline"
          >
            {t("edit")}
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-button font-medium text-text-secondary underline-offset-4 hover:underline"
          >
            {t("delete")}
          </button>
        </div>

        <BottomSheet open={confirmingDelete} onClose={() => setConfirmingDelete(false)} title={t("deleteConfirmTitle")}>
          <p className="text-body text-text-secondary">{t("deleteConfirmBody")}</p>
          <div className="mt-md flex gap-sm">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="tap-target flex-1 rounded-sm border border-divider px-lg py-sm text-button font-medium text-text-primary"
            >
              {t("deleteCancel")}
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              disabled={deleting}
              className="tap-target flex-1 rounded-sm bg-accent-primary px-lg py-sm text-button font-medium text-surface-raised disabled:opacity-60"
            >
              {t("deleteConfirm")}
            </button>
          </div>
        </BottomSheet>
      </section>
    );
  }

  return (
    <section
      data-testid="notes-screen"
      className="mx-auto flex w-full max-w-[680px] flex-col gap-lg py-screen"
      aria-labelledby="notes-title"
    >
      <header className="flex items-start gap-md">
        <Link
          href="/care"
          aria-label={t("backToCare")}
          className="tap-target inline-flex shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
        >
          <Icon name="ArrowLeft" size="inline" />
        </Link>
        <div className="min-w-0 flex-1 pt-xs">
          <h1 id="notes-title" className="font-display text-h1 font-semibold text-text-primary">{t("title")}</h1>
        </div>
      </header>

      {notes.length === 0 ? (
        <EmptyState
          iconName="NotePencil"
          message={t("empty")}
          action={(
            <Button type="button" onClick={() => openComposer(null)} className="rounded-full">
              {t("addNote")}
            </Button>
          )}
        />
      ) : (
        <ol className="flex flex-col gap-sm">
          {notes.map((note) => {
            const date = dateLabel(note.createdAt);
            return (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setState({ mode: "read", noteId: note.id });
                  }}
                  className="tap-target group flex w-full flex-col gap-xs rounded-[16px] bg-surface-raised px-md py-md text-left shadow-1 transition-[transform,box-shadow] duration-(--motion-fast) ease-standard active:scale-[0.99] active:shadow-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
                >
                  <span className="block truncate text-body font-medium text-text-primary">
                    {notePreview(note.body)}
                  </span>
                  <span className="block text-caption text-text-secondary">{date}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {notes.length > 0 && (
        <Button type="button" sticky onClick={() => openComposer(null)}>
          <Icon name="Plus" size="inline" />
          {t("addNote")}
        </Button>
      )}
    </section>
  );
}
