"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  HeartIcon,
  PlantIcon,
  LockSimpleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BrandFilters, BrandIcon, BrandWordmark } from "./Brand";
import { landingCopy } from "@/lib/landing-copy";
import type { Locale } from "@/lib/config";
import "@/styles/landing.css";

export function ComingSoon() {
  const [locale, setLocale] = useState<Locale>("en");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [emailError, setEmailError] = useState(false);
  const [nameError, setNameError] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const copy = landingCopy[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (status === "success") successRef.current?.focus({ preventScroll: true });
  }, [status]);

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    if (!name || name.length > 80) {
      setNameError(true);
      nameRef.current?.focus();
      return;
    }
    if (!email || !emailRef.current?.validity.valid) {
      setEmailError(true);
      emailRef.current?.focus();
      return;
    }
    pending.current = true;
    setEmailError(false);
    setNameError(false);
    setStatus("loading");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, locale, website: form.get("website") }),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error("Signup failed");
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      pending.current = false;
    }
  }

  return (
    <div className="coming-soon" lang={locale}>
      <BrandFilters />
      <header className="landing-header">
        <BrandWordmark />
        <div className="header-actions">
          <button
            className="language-switch"
            type="button"
            onClick={() => setLocale(locale === "en" ? "hi" : "en")}
            aria-label={locale === "en" ? "हिंदी में पढ़ें" : "Read in English"}
            lang={locale === "en" ? "hi" : "en"}
          >
            {locale === "en" ? "हिन्दी" : "English"}
          </button>
        </div>
      </header>

      <main className="landing-main">
        <div className="landing-story">
          <h1>
            {copy.title}
            <br />
            <span>{copy.titleAccent}</span>
          </h1>
          <p className="landing-description">{copy.description}</p>
          <div className="waitlist-area" data-success={status === "success"}>
            {status === "success" && (
              <div className="waitlist-success" role="status" tabIndex={-1} ref={successRef}>
                <svg className="success-check" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                  <circle
                    className="success-check-ring"
                    cx="24"
                    cy="24"
                    r="21"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    className="success-check-stroke"
                    d="m14 24 7 7 14-14"
                    pathLength="1"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <h2>{copy.successTitle}</h2>
                  <p>{copy.success}</p>
                </div>
              </div>
            )}
            <form
              className="waitlist-form"
              onSubmit={join}
              noValidate
              aria-label={copy.join}
              inert={status === "success"}
              aria-hidden={status === "success"}
            >
              <p className="waitlist-invitation">{copy.invitation}</p>
              <div className="signup-fields">
                <Input
                  ref={nameRef}
                  id="waitlist-name"
                  name="name"
                  type="text"
                  label={copy.name}
                  placeholder={copy.namePlaceholder}
                  autoComplete="name"
                  required
                  maxLength={80}
                  {...(nameError ? { error: copy.invalidName } : {})}
                  onChange={() => {
                    setNameError(false);
                    if (status === "error") setStatus("idle");
                  }}
                />
                <Input
                  ref={emailRef}
                  id="waitlist-email"
                  name="email"
                  type="email"
                  label={copy.email}
                  placeholder={copy.placeholder}
                  autoComplete="email"
                  inputMode="email"
                  required
                  maxLength={254}
                  {...(emailError ? { error: copy.invalid } : {})}
                  onChange={() => {
                    setEmailError(false);
                    if (status === "error") setStatus("idle");
                  }}
                />
                <Button
                  type="submit"
                  loading={status === "loading"}
                  aria-label={status === "loading" ? copy.joining : copy.join}
                  className="join-button"
                >
                  <span>
                    {copy.join}
                    <ArrowRightIcon aria-hidden="true" />
                  </span>
                </Button>
              </div>
              <div className="signup-trap" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <p className="signup-feedback" role={status === "error" ? "alert" : undefined}>
                {status === "error" ? (
                  copy.unavailable
                ) : (
                  <>
                    <LockSimpleIcon aria-hidden="true" />
                    {copy.note}
                  </>
                )}
              </p>
              <p className="signup-consent">{copy.consent}</p>
            </form>
          </div>
        </div>

        <div className="landing-art" aria-hidden="true">
          <div className="art-orbit orbit-outer" />
          <div className="art-orbit orbit-inner" />
          <div className="art-cradle">
            <BrandIcon />
          </div>
        </div>

        <div className="landing-features">
          <span>
            <PlantIcon aria-hidden="true" />
            {copy.featureBaby}
          </span>
          <span>
            <HeartIcon aria-hidden="true" />
            {copy.featureCare}
          </span>
          <span>
            <CheckCircleIcon aria-hidden="true" />
            {copy.featurePeace}
          </span>
        </div>
      </main>

      <footer className="landing-footer">
        <span>{copy.footer}</span>
        <span>{copy.place}</span>
        <span>
          {copy.builtByBefore}
          <a href="https://www.rochakagarwal.com" className="landing-credit">
            Rochak Agarwal
          </a>
          {copy.builtByAfter}
        </span>
      </footer>
    </div>
  );
}
