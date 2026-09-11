"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { resendState } from "@/lib/domain/otp";
import type { AuthResult } from "@/app/actions/auth";

const EMAIL_PATTERN = /.+@.+\..+/;
const RESEND_COOLDOWN_SECONDS = 60;

type Step = "email" | "code";
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

  async function requestCode(address: string) {
    setSending(true);
    const result = await onSendOtp(address);
    setSending(false);
    if (!result.ok) {
      setEmailError(t(ERROR_KEYS[result.code]));
      return;
    }
    const sentAt = Date.now();
    setLastSentAt(sentAt);
    setNow(sentAt);
    setCodeError(null);
    setStep("code");
  }

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setEmailError(t("auth.invalidEmail"));
      return;
    }
    setEmailError(null);
    await requestCode(trimmed);
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifying(true);
    const result = await onVerifyOtp(email.trim(), code.trim());
    setVerifying(false);
    if (!result.ok) {
      setCodeError(t(ERROR_KEYS[result.code]));
      return;
    }
    setCodeError(null);
  }

  async function handleResend() {
    if (!canResend) return;
    await requestCode(email.trim());
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
        </form>
      )}

      <Button type="button" variant="secondary" onClick={() => onGoogle()}>
        {t("auth.continueWithGoogle")}
      </Button>
    </div>
  );
}
