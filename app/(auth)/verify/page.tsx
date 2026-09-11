import { AuthForm } from "@/app/(auth)/AuthForm";
import { sendEmailOtp, verifyEmailOtp, startGoogleSignIn } from "@/app/actions/auth";

// A standalone landing spot for a code she is already mid-way through requesting
// (for example, a bookmarked or re-opened tab). It offers the same email-then-code
// flow as sign-in; resolveRedirect() keeps it public so a signed-out visitor is
// never bounced off it mid-flow.
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const startGoogle = startGoogleSignIn.bind(null, next ?? null);

  return (
    <AuthForm mode="signin" onSendOtp={sendEmailOtp} onVerifyOtp={verifyEmailOtp} onGoogle={startGoogle} />
  );
}
