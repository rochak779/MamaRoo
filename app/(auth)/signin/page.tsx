import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/app/(auth)/AuthForm";
import { sendEmailOtp, verifyEmailOtp, startGoogleSignIn } from "@/app/actions/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const startGoogle = startGoogleSignIn.bind(null, next ?? null);
  const t = await getTranslations("auth");
  const signUpHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  return (
    <>
      {/* startGoogleSignIn() and the callback route (app/auth/callback/route.ts)
          both redirect failures here as ?error=google|missing_code|exchange_failed
          -- without this, she lands back on a blank form with no explanation. */}
      {error && <p role="alert">{t("errorGoogle")}</p>}
      <AuthForm mode="signin" onSendOtp={sendEmailOtp} onVerifyOtp={verifyEmailOtp} onGoogle={startGoogle} />
      <p>
        <Link href={signUpHref}>{t("switchToSignUp")}</Link>
      </p>
    </>
  );
}
