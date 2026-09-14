import { NotificationsScreen } from "@/app/(app)/me/notifications/NotificationsScreen";
import { updateNotificationPrivacy } from "@/app/actions/settings";
import type { NotificationPrivacy } from "@/lib/domain/onboarding";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = await createServerSupabase();
  const { data: profile } = await supabase.from("profiles").select("notification_privacy").maybeSingle();
  const initialPrivacy = profile?.notification_privacy === "detailed" ? "detailed" : "private";

  return (
    <NotificationsScreen
      initialPrivacy={initialPrivacy as NotificationPrivacy}
      onSavePrivacy={updateNotificationPrivacy}
    />
  );
}
