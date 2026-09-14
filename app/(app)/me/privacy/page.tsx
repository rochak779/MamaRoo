import { redirect } from "next/navigation";
import { PrivacyScreen } from "@/app/(app)/me/privacy/PrivacyScreen";
import { withdrawConsent } from "@/app/actions/consent";
import { sendEmailOtp, verifyEmailOtp, signOut } from "@/app/actions/auth";
import { deleteAccount, deletePregnancyJourney, requestExport } from "@/app/actions/privacy";
import { getCurrentConsents } from "@/lib/supabase/queries/consent";
import { getLocale } from "@/i18n/locale";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function PrivacyPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const [locale, consents, pregnancy] = await Promise.all([
    getLocale(),
    getCurrentConsents(supabase),
    supabase.from("pregnancies").select("id").eq("status", "active").maybeSingle(),
  ]);

  return (
    <PrivacyScreen
      email={user.email ?? ""}
      locale={locale}
      consents={consents}
      activePregnancyId={pregnancy.data?.id ?? null}
      onWithdrawConsent={withdrawConsent}
      onRequestExport={requestExport}
      onDeletePregnancyJourney={deletePregnancyJourney}
      onSendCode={sendEmailOtp}
      onVerifyCode={verifyEmailOtp}
      onDeleteAccount={deleteAccount}
      onSignOut={signOut}
    />
  );
}
