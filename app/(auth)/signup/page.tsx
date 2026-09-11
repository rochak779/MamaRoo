import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/app/(auth)/AuthForm";
import { sendEmailOtp, verifyEmailOtp, startGoogleSignIn } from "@/app/actions/auth";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const startGoogle = startGoogleSignIn.bind(null, next ?? null);
  const t = await getTranslations("auth");
  const signInHref = next ? `/signin?next=${encodeURIComponent(next)}` : "/signin";

  return (
    <>
      <AuthForm mode="signup" onSendOtp={sendEmailOtp} onVerifyOtp={verifyEmailOtp} onGoogle={startGoogle} />
      <p>
        <Link href={signInHref}>{t("switchToSignIn")}</Link>
      </p>
    </>
  );
}
