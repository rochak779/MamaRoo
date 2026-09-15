"use client";

import { useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { track } from "@/components/AnalyticsProvider";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/patterns/BackButton";
import { ErrorBanner } from "@/components/patterns/ErrorBanner";
import { ProgressRing } from "@/components/patterns/ProgressRing";
import { SectionHeader } from "@/components/patterns/SectionHeader";
import { EVENTS } from "@/lib/analytics/events";
import { checklistProgress, type ChecklistItem, type ChecklistProgressRow } from "@/lib/domain/checklist";
import { useOnline } from "@/lib/pwa/useOnline";
import { webSpeechTranscriber } from "@/lib/speech/webspeech";
import type { Transcriber } from "@/lib/speech/transcribe";
import type { Locale } from "@/lib/config";

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

export type ToggleChecklistItemResult = { ok: true } | { ok: false; error: string };
export type SaveContactResult = { ok: true; contact: EmergencyContact } | { ok: false; error: string };
export type DeleteContactResult = { ok: true } | { ok: false; error: string };
export type SaveBirthNotesResult = { ok: true } | { ok: false; error: string };

export interface PrepChecklistProps {
  items: ChecklistItem[];
  progress: ChecklistProgressRow[];
  contacts: EmergencyContact[];
  birthNotes: string;
  /** Null when she has no active pregnancy row yet -- the notes field still
   * renders, but saving is a no-op until pregnancyId exists. */
  pregnancyId: string | null;
  onToggleItem: (itemId: string, done: boolean) => Promise<ToggleChecklistItemResult>;
  onAddContact: (name: string, phone: string) => Promise<SaveContactResult>;
  onUpdateContact: (id: string, patch: { name?: string; phone?: string }) => Promise<SaveContactResult>;
  onDeleteContact: (id: string) => Promise<DeleteContactResult>;
  // Takes pregnancyId as a real parameter, not a closure over it -- passed
  // straight through as saveBirthNotes from the server component, matching
  // TodayScreen's onSubmitCheckin precedent: only a genuine "use server"
  // reference (not a wrapping closure) is allowed to cross the Server-to-
  // Client boundary.
  onSaveBirthNotes: (pregnancyId: string, notes: string) => Promise<SaveBirthNotesResult>;
  transcriber?: Transcriber;
}

const PHONE_PATTERN = /^[0-9]{10}$/;

interface Draft {
  localId: string;
  name: string;
  phone: string;
}

export function PrepChecklist({
  items,
  progress: initialProgress,
  contacts: initialContacts,
  birthNotes: initialBirthNotes,
  pregnancyId,
  onToggleItem,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onSaveBirthNotes,
  transcriber = webSpeechTranscriber,
}: PrepChecklistProps) {
  const t = useTranslations("me.prep");
  const locale = useLocale() as Locale;
  const isOnline = useOnline();
  const notesId = useId();
  const stopListeningRef = useRef<(() => void) | null>(null);
  const [listening, setListening] = useState(false);

  const [progress, setProgress] = useState<ChecklistProgressRow[]>(initialProgress);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const [contacts, setContacts] = useState<EmergencyContact[]>(initialContacts);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [contactError, setContactError] = useState<string | null>(null);

  const [birthNotes, setBirthNotes] = useState(initialBirthNotes);
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  const result = checklistProgress({ items, progress });

  async function handleToggle(itemId: string, category: string, currentlyDone: boolean) {
    const nextDone = !currentlyDone;
    if (!isOnline) {
      track(EVENTS.offline_write_blocked, { feature: "checklist" });
      setToggleError(t("offlineToggleError"));
      return;
    }
    setToggleError(null);
    setProgress((current) => {
      const withoutItem = current.filter((p) => p.itemId !== itemId);
      return [...withoutItem, { itemId, done: nextDone }];
    });
    track(EVENTS.checklist_item_toggled, { category, done: nextDone });

    const res = await onToggleItem(itemId, nextDone);
    if (!res.ok) {
      // Revert the optimistic tick.
      setProgress((current) => {
        const withoutItem = current.filter((p) => p.itemId !== itemId);
        return [...withoutItem, { itemId, done: currentlyDone }];
      });
      setToggleError(t("toggleError"));
    }
  }

  function addDraft() {
    setDrafts((current) => [...current, { localId: `draft-${Date.now()}`, name: "", phone: "" }]);
  }

  function updateDraft(localId: string, field: "name" | "phone", value: string) {
    setDrafts((current) => current.map((d) => (d.localId === localId ? { ...d, [field]: value } : d)));
  }

  async function trySaveDraft(localId: string) {
    const draft = drafts.find((d) => d.localId === localId);
    if (!draft) return;
    const name = draft.name.trim();
    if (name.length === 0 || !PHONE_PATTERN.test(draft.phone)) return; // wait for both fields to be valid

    setContactError(null);
    const res = await onAddContact(name, draft.phone);
    if (res.ok) {
      setDrafts((current) => current.filter((d) => d.localId !== localId));
      setContacts((current) => [...current, res.contact]);
    } else {
      setContactError(t("contactSaveError"));
    }
  }

  async function saveExistingContact(id: string, patch: { name?: string; phone?: string }) {
    setContactError(null);
    const res = await onUpdateContact(id, patch);
    if (res.ok) {
      setContacts((current) => current.map((c) => (c.id === id ? res.contact : c)));
    } else {
      setContactError(t("contactSaveError"));
    }
  }

  async function removeContact(id: string) {
    setContactError(null);
    const previous = contacts;
    setContacts((current) => current.filter((c) => c.id !== id));
    const res = await onDeleteContact(id);
    if (!res.ok) {
      setContacts(previous);
      setContactError(t("contactDeleteError"));
    }
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
    setNotesError(null);
    stopListeningRef.current = transcriber.start({
      locale,
      onResult: (result, isFinal) => {
        setBirthNotes(result);
        if (isFinal) stopListening();
      },
      onError: () => {
        setNotesError(t("voiceError"));
        stopListening();
      },
    });
    setListening(true);
  }

  async function saveNotes() {
    if (!pregnancyId) return;
    setNotesError(null);
    const res = await onSaveBirthNotes(pregnancyId, birthNotes);
    if (res.ok) {
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 1800);
    } else {
      setNotesError(t("notesSaveError"));
    }
  }

  const categoryLabel: Record<string, string> = {
    me: t("categoryMe"),
    baby: t("categoryBaby"),
    docs: t("categoryDocs"),
  };

  return (
    <div className="flex flex-col gap-lg py-lg">
      <BackButton href="/me" label={t("backLabel")} />

      <div className="flex justify-center">
        <ProgressRing fraction={result.overall.fraction} label={t("progressLabel", { done: result.overall.done, total: result.overall.total })} />
      </div>

      {result.byCategory.map(
        (category) =>
          category.items.length > 0 && (
            <div key={category.category} className="flex flex-col gap-sm">
              <SectionHeader>{categoryLabel[category.category] ?? category.category}</SectionHeader>
              <div className="flex flex-col gap-xs rounded-lg bg-surface-raised p-md shadow-1">
                {category.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void handleToggle(item.id, category.category, item.done)}
                    className="flex items-center gap-sm py-xs text-left"
                  >
                    <span
                      data-testid="checklist-mark"
                      data-checked={item.done}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                        // Darkened sage, not CTA coral -- Mamaroo-Designfinal.md
                        // §13.6 reserves CTA coral for button fills only.
                        item.done ? "border-accent-secondary bg-accent-secondary" : "border-divider bg-transparent"
                      }`}
                    >
                      {item.done && <Icon name="Check" size="inline" className="text-surface-raised" />}
                    </span>
                    <span className={`text-body-sm ${item.done ? "text-text-secondary line-through" : "text-text-primary"}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ),
      )}

      {toggleError && <ErrorBanner message={toggleError} nextStep={t("toggleErrorNextStep")} />}

      <div className="flex flex-col gap-sm">
        <SectionHeader>{t("documentsTitle")}</SectionHeader>
        <div className="flex flex-col gap-xs rounded-lg bg-surface-raised p-md shadow-1">
          {[t("documentIdentification"), t("documentInsurance"), t("documentRecords")].map((doc) => (
            <div key={doc} className="flex items-center gap-sm py-xs">
              <Icon name="FileText" size="inline" className="text-accent-secondary" />
              <span className="text-body-sm text-text-primary">{doc}</span>
            </div>
          ))}
        </div>
        <p className="text-caption text-text-secondary">{t("documentsHelper")}</p>
      </div>

      <div className="flex flex-col gap-sm">
        <SectionHeader>{t("contactsTitle")}</SectionHeader>
        <div className="flex flex-col gap-sm rounded-lg bg-surface-raised p-md shadow-1">
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center gap-sm">
              <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <input
                  className="border-none bg-transparent text-body-sm font-medium text-text-primary outline-none"
                  defaultValue={c.name}
                  placeholder={t("contactNamePlaceholder")}
                  onBlur={(e) => e.target.value.trim() !== c.name && void saveExistingContact(c.id, { name: e.target.value.trim() })}
                />
                <input
                  className="border-none bg-transparent text-caption text-text-secondary outline-none"
                  type="tel"
                  defaultValue={c.phone}
                  placeholder={t("contactPhonePlaceholder")}
                  onBlur={(e) => e.target.value !== c.phone && void saveExistingContact(c.id, { phone: e.target.value })}
                />
              </div>
              <a
                href={`tel:${c.phone}`}
                aria-label={`${t("callContact")} ${c.phone}`}
                // CTA coral, not the alert/error colour -- calling a saved
                // contact is a routine action here, not a warning state.
                className="tap-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-primary text-surface-raised"
              >
                <Icon name="Phone" size="inline" />
              </a>
              <button type="button" aria-label={t("removeContact")} onClick={() => void removeContact(c.id)} className="tap-target shrink-0">
                <Icon name="X" size="inline" className="text-text-secondary" />
              </button>
            </div>
          ))}

          {drafts.map((d) => (
            <div key={d.localId} className="flex items-center gap-sm">
              <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <input
                  className="border-none bg-transparent text-body-sm font-medium text-text-primary outline-none"
                  value={d.name}
                  placeholder={t("contactNamePlaceholder")}
                  onChange={(e) => updateDraft(d.localId, "name", e.target.value)}
                  onBlur={() => void trySaveDraft(d.localId)}
                />
                <input
                  className="border-none bg-transparent text-caption text-text-secondary outline-none"
                  type="tel"
                  value={d.phone}
                  placeholder={t("contactPhonePlaceholder")}
                  onChange={(e) => updateDraft(d.localId, "phone", e.target.value.replace(/[^\d]/g, ""))}
                  onBlur={() => void trySaveDraft(d.localId)}
                />
              </div>
            </div>
          ))}

          {contactError && <p role="alert" className="text-body-sm text-alert">{contactError}</p>}
        </div>
        <Button variant="secondary" onClick={addDraft}>
          {t("addContact")}
        </Button>
      </div>

      <div className="flex flex-col gap-sm">
        <SectionHeader>{t("notesTitle")}</SectionHeader>
        <div className="relative">
          <textarea
            id={notesId}
            className="min-h-[120px] w-full rounded-lg border border-divider bg-surface-raised p-md pr-[56px] text-body-sm text-text-primary outline-none"
            value={birthNotes}
            placeholder={t("notesPlaceholder")}
            onChange={(e) => setBirthNotes(e.target.value)}
          />
          {transcriber.isAvailable() && (
            <button
              type="button"
              onClick={toggleVoice}
              aria-pressed={listening}
              aria-label={listening ? t("listening") : t("voiceButton")}
              className={`tap-target absolute bottom-sm right-sm flex size-[32px] shrink-0 items-center justify-center rounded-full ${
                listening ? "bg-accent-secondary/40" : "bg-accent-secondary/20"
              }`}
            >
              <Icon name="Microphone" size="inline" className="text-accent-secondary" />
            </button>
          )}
        </div>
        {listening && <p className="text-body-sm text-accent-secondary">{t("listening")}</p>}
        {notesError && <p role="alert" className="text-body-sm text-alert">{notesError}</p>}
        <Button onClick={() => void saveNotes()}>{t("saveNotes")}</Button>
        {notesSaved && <p className="text-body-sm text-accent-primary">{t("notesSaved")}</p>}
      </div>
    </div>
  );
}
