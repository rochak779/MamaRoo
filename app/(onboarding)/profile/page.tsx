import { OnboardingForm } from "@/app/(onboarding)/profile/OnboardingForm";
import { saveOnboarding } from "@/app/actions/onboarding";

export default function OnboardingProfilePage() {
  return <OnboardingForm onSave={saveOnboarding} />;
}
