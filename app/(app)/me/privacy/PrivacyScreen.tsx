"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SectionHeader } from "@/components/patterns/SectionHeader";
import { confirmationWordMatches, DELETE_ACCOUNT_CONFIRMATION_WORD } from "@/lib/domain/privacy";
import { PRODUCT_NAME, type Locale } from "@/lib/config";
import type { ConsentKey, ConsentState } from "@/lib/supabase/queries/consent";
import type { ExportEnvelope } from "@/lib/domain/export";
import type { AuthResult } from "@/app/actions/auth";

export type WithdrawConsentResult = { ok: true } | { ok: false; error: string };
export type RequestExportResult = { ok: true; data: ExportEnvelope } | { ok: false; error: string };
export type DeletePregnancyJourneyResult = { ok: true } | { ok: false; error: string };
export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

export interface PrivacyScreenProps {
  email: string;
  locale: Locale;
  consents: Record<ConsentKey, ConsentState>;
  /** Null when she has no active pregnancy -- the delete-journey card renders nothing. */
  activePregnancyId: string | null;
  onWithdrawConsent: (key: ConsentKey, locale: Locale) => Promise<WithdrawConsentResult>;
  onRequestExport: () => Promise<RequestExportResult>;
  onDeletePregnancyJourney: (pregnancyId: string) => Promise<DeletePregnancyJourneyResult>;
  onSendCode: (email: string) => Promise<AuthResult>;
  onVerifyCode: (email: string, code: string) => Promise<AuthResult>;
  onDeleteAccount: (confirmationWord: string) => Promise<DeleteAccountResult>;
  onSignOut: () => Promise<void>;
}

const WITHDRAWABLE_KEYS = ["optional_data_sharing", "analytics"] as const;

type DeleteAccountStep = "closed" | "reauth" | "code" | "confirm" | "deleting";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function PrivacyScreen({
  email,
  locale,
  consents: initialConsents,
  activePregnancyId,
  onWithdrawConsent,
  onRequestExport,
  onDeletePregnancyJourney,
  onSendCode,
  onVerifyCode,
  onDeleteAccount,
  onSignOut,
}: PrivacyScreenProps) {
  const t = useTranslations("mePrivacy");

  const [consents, setConsents] = useState(initialConsents);
  const [withdrawError, setWithdrawError] = useState<ConsentKey | null>(null);

  const [exportError, setExportError] = useState(false);

  const [journeySheetOpen, setJourneySheetOpen] = useState(false);
  const [journeyError, setJourneyError] = useState(false);

  const [accountStep, setAccountStep] = useState<DeleteAccountStep>("closed");
  const [code, setCode] = useState("");
  const [reauthError, setReauthError] = useState(false);
  const [confirmWord, setConfirmWord] = useState("");
  const [deleteAccountError, setDeleteAccountError] = useState(false);

  async function handleWithdraw(key: ConsentKey) {
    setWithdrawError(null);
    const res = await onWithdrawConsent(key, locale);
    if (res.ok) {
      setConsents((current) => ({ ...current, [key]: { granted: false, version: current[key].version, grantedAt: current[key].grantedAt } }));
    } else {
      setWithdrawError(key);
    }
  }

  async function handleExport() {
    setExportError(false);
    const res = await onRequestExport();
    if (res.ok) {
      downloadJson(`mamaroo-export-${res.data.meta.generatedAt.slice(0, 10)}.json`, res.data);
    } else {
      setExportError(true);
    }
  }

  async function handleDeleteJourney() {
    if (!activePregnancyId) return;
    setJourneyError(false);
    const res = await onDeletePregnancyJourney(activePregnancyId);
    setJourneySheetOpen(false);
    if (!res.ok) setJourneyError(true);
  }

  async function handleSendCode() {
    setReauthError(false);
    const res = await onSendCode(email);
    if (res.ok) setAccountStep("code");
    else setReauthError(true);
  }

  async function handleVerifyCode() {
    setReauthError(false);
    const res = await onVerifyCode(email, code);
    if (res.ok) setAccountStep("confirm");
    else setReauthError(true);
  }

  async function handleConfirmDelete() {
    setDeleteAccountError(false);
    setAccountStep("deleting");
    const res = await onDeleteAccount(confirmWord);
    if (res.ok) {
      await onSignOut();
    } else {
      setDeleteAccountError(true);
      setAccountStep("confirm");
    }
  }

  const consentLabel: Record<ConsentKey, string> = {
    terms: t("consentTerms"),
    privacy: t("consentPrivacyPolicy"),
    optional_data_sharing: t("consentOptionalDataSharing"),
    analytics: t("consentAnalytics"),
  };

  const expectedWord = DELETE_ACCOUNT_CONFIRMATION_WORD[locale];

  return (
    <div className="flex flex-col gap-lg py-lg">
      <div className="flex flex-col gap-sm">
        <SectionHeader>{t("consentsTitle")}</SectionHeader>
        <div className="flex flex-col gap-sm rounded-lg bg-surface-raised p-md shadow-1">
          {(Object.keys(consentLabel) as ConsentKey[]).map((key) => {
            const state = consents[key];
            const withdrawable = (WITHDRAWABLE_KEYS as readonly string[]).includes(key);
            return (
              <div key={key} className="flex flex-col gap-xs border-b border-divider pb-sm last:border-b-0">
                <div className="flex items-center justify-between gap-sm">
                  <span className="text-body-sm font-medium text-text-primary">{consentLabel[key]}</span>
                  {withdrawable && state.granted && (
                    <Button variant="tertiary" onClick={() => void handleWithdraw(key)}>
                      {t("withdraw")}
                    </Button>
                  )}
                </div>
                <span className="text-caption text-text-secondary">
                  {state.granted
                    ? state.grantedAt
                      ? t("consentGrantedOn", { date: new Date(state.grantedAt).toLocaleDateString() })
                      : t("consentGranted")
                    : t("consentNotShared")}
                </span>
                {!withdrawable && <span className="text-caption text-text-secondary">{t("consentRequiredHint", { productName: PRODUCT_NAME })}</span>}
                {withdrawError === key && <p role="alert" className="text-caption text-alert">{t("withdrawError")}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-sm rounded-lg bg-surface-raised p-md shadow-1">
        <SectionHeader>{t("exportTitle")}</SectionHeader>
        <p className="text-body-sm text-text-secondary">{t("exportBody", { productName: PRODUCT_NAME })}</p>
        <Button onClick={() => void handleExport()}>{t("exportButton")}</Button>
        {exportError && <p role="alert" className="text-body-sm text-alert">{t("exportError")}</p>}
      </div>

      {activePregnancyId && (
        <div className="flex flex-col gap-sm rounded-lg bg-surface-raised p-md shadow-1">
          <SectionHeader>{t("deleteJourneyTitle")}</SectionHeader>
          <p className="text-body-sm text-text-secondary">{t("deleteJourneyBody", { productName: PRODUCT_NAME })}</p>
          <Button variant="secondary" onClick={() => setJourneySheetOpen(true)}>
            {t("deleteJourneyButton")}
          </Button>
          {journeyError && <p role="alert" className="text-body-sm text-alert">{t("deleteJourneyError")}</p>}
        </div>
      )}

      <div className="flex flex-col gap-sm rounded-lg bg-surface-raised p-md shadow-1">
        <SectionHeader>{t("deleteAccountTitle")}</SectionHeader>
        <p className="text-body-sm text-text-secondary">{t("deleteAccountBody", { productName: PRODUCT_NAME })}</p>
        <Button variant="secondary" onClick={() => setAccountStep("reauth")}>
          {t("deleteAccountButton")}
        </Button>
      </div>

      <BottomSheet open={journeySheetOpen} onClose={() => setJourneySheetOpen(false)} title={t("deleteJourneySheetTitle")}>
        <p className="text-body-sm text-text-secondary">{t("deleteJourneySheetBody", { productName: PRODUCT_NAME })}</p>
        <div className="mt-md flex gap-sm">
          <Button variant="secondary" onClick={() => setJourneySheetOpen(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={() => void handleDeleteJourney()}>{t("deleteJourneyConfirm")}</Button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={accountStep === "reauth" || accountStep === "code"}
        onClose={() => setAccountStep("closed")}
        title={t("reauthTitle")}
      >
        <p className="text-body-sm text-text-secondary">{t("reauthBody", { email })}</p>
        {accountStep === "reauth" && (
          <Button className="mt-md" onClick={() => void handleSendCode()}>
            {t("reauthSendCode")}
          </Button>
        )}
        {accountStep === "code" && (
          <div className="mt-md flex flex-col gap-sm">
            <Input
              id="reauth-code"
              label={t("reauthCodeLabel")}
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button onClick={() => void handleVerifyCode()}>{t("reauthVerify")}</Button>
          </div>
        )}
        {reauthError && <p role="alert" className="mt-sm text-body-sm text-alert">{t("reauthError")}</p>}
      </BottomSheet>

      <BottomSheet
        open={accountStep === "confirm" || accountStep === "deleting"}
        onClose={() => setAccountStep("closed")}
        title={t("confirmDeleteTitle")}
      >
        <p className="text-body-sm text-text-secondary">{t("confirmDeleteBody", { productName: PRODUCT_NAME })}</p>
        <div className="mt-md flex flex-col gap-sm">
          <Input
            id="confirm-delete-word"
            label={t("confirmDeleteWordLabel", { word: expectedWord })}
            placeholder={t("confirmDeleteWordPlaceholder")}
            value={confirmWord}
            onChange={(e) => setConfirmWord(e.target.value)}
          />
          <Button
            onClick={() => void handleConfirmDelete()}
            disabled={!confirmationWordMatches(confirmWord, locale) || accountStep === "deleting"}
          >
            {t("confirmDeleteButton")}
          </Button>
        </div>
        {deleteAccountError && <p role="alert" className="mt-sm text-body-sm text-alert">{t("deleteAccountError")}</p>}
      </BottomSheet>
    </div>
  );
}
