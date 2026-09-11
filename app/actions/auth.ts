"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export type AuthResult = { ok: true } | { ok: false; code: "rate_limited" | "invalid_code" | "expired" | "network" | "unknown" };

export async function sendEmailOtp(email: string): Promise<AuthResult> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (!error) return { ok: true };
  if (error.status === 429) return { ok: false, code: "rate_limited" };
  return { ok: false, code: "unknown" };
}

export async function verifyEmailOtp(email: string, code: string): Promise<AuthResult> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (!error) return { ok: true };
  // Branch on GoTrue's structured error code, not the message text: a wrong
  // code and an actually-expired one both come back as the single string
  // "Token has expired or is invalid" (confirmed directly against the live
  // project), which the old message.includes("expired") check matched first
  // for either case -- misreporting a mistyped code as expired every time.
  if (error.code === "otp_expired") return { ok: false, code: "expired" };
  if (error.status === 403 || error.code === "otp_disabled") return { ok: false, code: "invalid_code" };
  return { ok: false, code: "unknown" };
}

export async function startGoogleSignIn(next: string | null): Promise<void> {
  const supabase = await createServerSupabase();
  const callback = new URL("/auth/callback", env.NEXT_PUBLIC_SITE_URL);
  if (next) callback.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });
  if (error || !data.url) redirect("/signin?error=google");
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/");
}
