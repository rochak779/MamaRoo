import { ConsentForm, type ConsentInput } from "@/app/(auth)/consent/ConsentForm";
import { recordConsents } from "@/app/actions/consent";
import { changeLocale } from "@/app/actions/locale";
import { getLocale } from "@/i18n/locale";

export default async function ConsentPage() {
  const locale = await getLocale();

  async function handleSubmit(input: ConsentInput): Promise<void> {
    "use server";
    await recordConsents({ ...input, locale });
  }

  return <ConsentForm onSubmit={handleSubmit} locale={locale} onLocaleChange={changeLocale} />;
}
