"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { resendState } from "@/lib/domain/otp";
import type { AuthResult } from "@/app/actions/auth";

const EMAIL_PATTERN = /.+@.+\..+/;
const RESEND_COOLDOWN_SECONDS = 60;

type Step = "email" | "code" | "verified";
type FailureCode = Exclude<AuthResult, { ok: true }>["code"];

const ERROR_KEYS: Record<FailureCode, string> = {
  rate_limited: "auth.errorRateLimited",
  invalid_code: "auth.errorInvalidCode",
  expired: "auth.errorExpired",
  network: "auth.errorNetwork",
  unknown: "auth.errorUnknown",
};

export interface AuthFormProps {
  mode: "signup" | "signin";
  onSendOtp: (email: string) => Promise<AuthResult>;
  onVerifyOtp: (email: string, code: string) => Promise<AuthResult>;
  onGoogle: () => void | Promise<void>;
}

/**
 * Two steps, email then code, because a single long form reads as more work than it
 * is. Takes its three actions as props rather than importing the server actions
 * directly, so it is testable without mocking the Supabase client.
 */
export function AuthForm({ mode, onSendOtp, onVerifyOtp, onGoogle }: AuthFormProps) {
  const t = useTranslations();
  const emailId = useId();
  const codeId = useId();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  // Ticks the resend countdown while she is on the code step, so the button
  // re-enables itself without a manual refresh.
  useEffect(() => {
    if (step !== "code") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [step]);

  const { canResend, secondsLeft } = resendState({
    lastSentAt,
    now,
    cooldownSeconds: RESEND_COOLDOWN_SECONDS,
  });

  // Only decides whether the send succeeded and, if so, advances the step and
  // starts the cooldown. It never writes an error message itself: the email
  // step and the resend button render in different steps, so each caller
  // decides where its own failure is visible, sharing the same ERROR_KEYS map.
  // The .catch() turns a rejected network call (offline, DNS failure, a 5xx
  // that never reaches the server action's own try/catch) into the same
  // AuthResult shape as a handled failure, and `finally` guarantees the
  // pending flag clears no matter how the call ends -- otherwise a network
  // failure leaves the button spinning forever with nothing on screen.
  async function requestCode(address: string): Promise<AuthResult> {
    setSending(true);
    try {
      const result = await onSendOtp(address).catch(() => ({ ok: false, code: "network" }) as const);
      if (result.ok) {
        const sentAt = Date.now();
        setLastSentAt(sentAt);
        setNow(sentAt);
        setCodeError(null);
        setResendError(null);
        setStep("code");
      }
      return result;
    } finally {
      setSending(false);
    }
  }

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setEmailError(t("auth.invalidEmail"));
      return;
    }
    setEmailError(null);
    const result = await requestCode(trimmed);
    if (!result.ok) setEmailError(t(ERROR_KEYS[result.code]));
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifying(true);
    try {
      const result = await onVerifyOtp(email.trim(), code.trim()).catch(
        () => ({ ok: false, code: "network" }) as const,
      );
      if (!result.ok) {
        setCodeError(t(ERROR_KEYS[result.code]));
        return;
      }
      setCodeError(null);
      setStep("verified");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (!canResend) return;
    setResendError(null);
    const result = await requestCode(email.trim());
    if (!result.ok) setResendError(t(ERROR_KEYS[result.code]));
  }

  return (
    <div>
      <h1>{t(mode === "signup" ? "auth.signupTitle" : "auth.signinTitle")}</h1>

      {step === "email" && (
        <form onSubmit={handleSendCode} noValidate>
          <Input
            id={emailId}
            name="email"
            type="email"
            label={t("auth.emailLabel")}
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError(null);
            }}
            {...(emailError ? { error: emailError } : {})}
          />
          <Button type="submit" loading={sending}>
            {t("auth.sendCode")}
          </Button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleVerify} noValidate>
          <p>{t("auth.checkSpam")}</p>
          <Input
            id={codeId}
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            label={t("auth.codeLabel")}
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setCodeError(null);
            }}
            {...(codeError ? { error: codeError } : {})}
          />
          <Button type="submit" loading={verifying}>
            {t("auth.verify")}
          </Button>
          <Button
            type="button"
            variant="tertiary"
            onClick={handleResend}
            disabled={!canResend}
            {...(!canResend ? { disabledReason: t("auth.resendWait", { seconds: secondsLeft }) } : {})}
          >
            {t("auth.resend")}
          </Button>
          {resendError && <p role="alert">{resendError}</p>}
        </form>
      )}

      {step === "verified" && <p role="status">{t("auth.verified")}</p>}

      {step !== "verified" && (
        <Button type="button" variant="secondary" onClick={() => onGoogle()}>
          {t("auth.continueWithGoogle")}
        </Button>
      )}
    </div>
  );
}
