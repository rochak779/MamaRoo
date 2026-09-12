"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { resendState } from "@/lib/domain/otp";
import { track } from "@/components/AnalyticsProvider";
import { EVENTS } from "@/lib/analytics/events";
import type { AuthResult } from "@/app/actions/auth";
import "@/styles/start.css";

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

/** Two-step email authentication, with its server actions injected for testability. */
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
  const emailIsValid = EMAIL_PATTERN.test(email.trim());
  const codeIsComplete = code.length === 6;

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
    if (!result.ok) {
      setEmailError(t(ERROR_KEYS[result.code]));
      return;
    }
    // Signin has no equivalent "started" event in the taxonomy: only
    // signup_started exists, since there is no analogous funnel step worth
    // measuring for someone who already has an account.
    if (mode === "signup") track(EVENTS.signup_started, { method: "email_otp" });
  }

  function handleGoogle() {
    if (mode === "signup") track(EVENTS.signup_started, { method: "google" });
    void onGoogle();
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!codeIsComplete) return;
    setVerifying(true);
    try {
      const result = await onVerifyOtp(email.trim(), code).catch(
        () => ({ ok: false, code: "network" }) as const,
      );
      if (!result.ok) {
        setCodeError(t(ERROR_KEYS[result.code]));
        return;
      }
      setCodeError(null);
      setStep("verified");
      track(mode === "signup" ? EVENTS.signup_completed : EVENTS.signin_completed, { method: "email_otp" });
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
    <main className="auth-screen">
      <h1 className="sr-only">{t(mode === "signup" ? "auth.signupTitle" : "auth.signinTitle")}</h1>

      {step === "email" && (
        <form className="auth-form" onSubmit={handleSendCode} noValidate>
          <div className="auth-heading-group">
            <h2 className="auth-title">{t("auth.emailHeading")}</h2>
            <p className="auth-subtitle">{t("auth.emailSubtext")}</p>
          </div>

          <div className="auth-field">
            <label htmlFor={emailId} className="sr-only">
              {t("auth.emailLabel")}
            </label>
            <input
              id={emailId}
              name="email"
              type="email"
              className="auth-email-input"
              placeholder={t("auth.emailLabel")}
              autoComplete="email"
              inputMode="email"
              value={email}
              aria-invalid={emailError ? "true" : undefined}
              aria-describedby={emailError ? `${emailId}-error` : `${emailId}-hint`}
              onChange={(event) => {
                const nextEmail = event.target.value;
                setEmail(nextEmail);
                setEmailError(nextEmail && !EMAIL_PATTERN.test(nextEmail.trim()) ? t("auth.invalidEmail") : null);
              }}
            />
            {emailError && (
              <p id={`${emailId}-error`} className="auth-error">
                {emailError}
              </p>
            )}
          </div>
          <p id={`${emailId}-hint`} className="auth-reassurance">
            {t("auth.emailReassurance")}
          </p>

          <div className="auth-spacer" />

          <div className="auth-actions">
            <Button className="auth-primary" type="submit" loading={sending} disabled={!emailIsValid}>
              {t("auth.sendCode")}
            </Button>
            <Button className="auth-google" type="button" variant="secondary" onClick={handleGoogle}>
              {t("auth.continueWithGoogle")}
            </Button>
          </div>
        </form>
      )}

      {step === "code" && (
        <form className="auth-form" onSubmit={handleVerify} noValidate>
          <div className="auth-heading-group">
            <h2 className="auth-title">{t("auth.codeHeading")}</h2>
            <p className="auth-subtitle">
              {t("auth.codeSentTo", { email })}{" "}
              <button type="button" className="auth-change" onClick={() => setStep("email")}>
                {t("auth.changeEmail")}
              </button>
            </p>
          </div>

          <div className="auth-code-field">
            <label htmlFor={codeId} className="sr-only">
              {t("auth.codeLabel")}
            </label>
            <div className="auth-code-shell">
              <input
                id={codeId}
                name="code"
                type="text"
                className="auth-code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                aria-invalid={codeError ? "true" : undefined}
                aria-describedby={codeError ? `${codeId}-error` : `${codeId}-hint`}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setCodeError(null);
                }}
              />
              {Array.from({ length: 6 }, (_, index) => (
                <span
                  key={index}
                  className="auth-code-cell"
                  data-testid="otp-cell"
                  data-filled={code[index] ? "true" : undefined}
                  data-active={code.length === index ? "true" : undefined}
                  aria-hidden="true"
                >
                  {code[index] ?? ""}
                </span>
              ))}
            </div>
            {codeError && (
              <p id={`${codeId}-error`} className="auth-error">
                {codeError}
              </p>
            )}
          </div>

          <p id={`${codeId}-hint`} className="auth-reassurance">
            {t("auth.checkSpam")}
          </p>

          <div className="auth-resend-row">
            <p>{canResend ? t("auth.resendAvailable") : t("auth.resendWait", { seconds: secondsLeft })}</p>
            <Button
              type="button"
              className="auth-resend"
              variant="tertiary"
              onClick={handleResend}
              disabled={!canResend}
              {...(!canResend
                ? { disabledReason: t("auth.resendDisabledReason", { seconds: secondsLeft }) }
                : {})}
            >
              {t("auth.resend")}
            </Button>
          </div>
          {resendError && (
            <p className="auth-error" role="alert">
              {resendError}
            </p>
          )}

          <div className="auth-spacer" />

          <div className="auth-actions">
            <Button className="auth-primary" type="submit" loading={verifying} disabled={!codeIsComplete}>
              {t("auth.verify")}
            </Button>
            <Button className="auth-google" type="button" variant="secondary" onClick={handleGoogle}>
              {t("auth.continueWithGoogle")}
            </Button>
          </div>
        </form>
      )}

      {step === "verified" && (
        <div className="auth-verified" role="status">
          {t("auth.verified")}
        </div>
      )}
    </main>
  );
}
