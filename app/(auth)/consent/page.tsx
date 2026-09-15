import { ConsentForm, type ConsentInput } from "@/app/(auth)/consent/ConsentForm";
import { recordConsents } from "@/app/actions/consent";
import { getLocale } from "@/i18n/locale";

export default async function ConsentPage() {
  // Still needed to stamp the locale onto the consent rows below, even
  // though ConsentForm itself no longer offers a switcher to change it here.
  const locale = await getLocale();

  async function handleSubmit(input: ConsentInput): Promise<void> {
    "use server";
    await recordConsents({ ...input, locale });
  }

  return <ConsentForm onSubmit={handleSubmit} />;
}
