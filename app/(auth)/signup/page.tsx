import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/app/(auth)/AuthForm";
import { sendEmailOtp, verifyEmailOtp, startGoogleSignIn } from "@/app/actions/auth";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const startGoogle = startGoogleSignIn.bind(null, next ?? null);
  const t = await getTranslations("auth");
  const signInHref = next ? `/signin?next=${encodeURIComponent(next)}` : "/signin";

  return (
    <>
      {/* Currently startGoogleSignIn() and the callback route always redirect a
          failure to /signin, never back to /signup -- this stays here too so a
          future change or a direct link to /signup?error=... isn't silent either. */}
      {error && <p role="alert">{t("errorGoogle")}</p>}
      <AuthForm mode="signup" onSendOtp={sendEmailOtp} onVerifyOtp={verifyEmailOtp} onGoogle={startGoogle} />
      <p>
        <Link href={signInHref}>{t("switchToSignIn")}</Link>
      </p>
    </>
  );
}
