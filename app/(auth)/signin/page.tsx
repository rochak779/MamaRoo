import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/app/(auth)/AuthForm";
import { sendEmailOtp, verifyEmailOtp, startGoogleSignIn } from "@/app/actions/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const startGoogle = startGoogleSignIn.bind(null, next ?? null);
  const t = await getTranslations("auth");
  const signUpHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  return (
    <>
      <AuthForm mode="signin" onSendOtp={sendEmailOtp} onVerifyOtp={verifyEmailOtp} onGoogle={startGoogle} />
      <p>
        <Link href={signUpHref}>{t("switchToSignUp")}</Link>
      </p>
    </>
  );
}
