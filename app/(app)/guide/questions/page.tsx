import { CommonQuestions } from "@/app/(app)/guide/questions/CommonQuestions";
import { getLocale } from "@/i18n/locale";
import { listGuideFaqs, listGuideSchemes } from "@/lib/supabase/queries/guideFaqs";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function CommonQuestionsPage() {
  const locale = await getLocale();
  const supabase = await createServerSupabase();
  const [faqs, schemes] = await Promise.all([
    listGuideFaqs({ supabase, locale }),
    listGuideSchemes({ supabase, locale }),
  ]);

  return <CommonQuestions faqs={faqs} schemes={schemes} />;
}
