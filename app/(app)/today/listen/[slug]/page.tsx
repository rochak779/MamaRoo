import { ContentDetail } from "@/components/content/ContentDetail";
import { getLocale } from "@/i18n/locale";
import { getContentItem } from "@/lib/supabase/queries/content";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function QuickListenPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, locale, supabase] = await Promise.all([
    params,
    getLocale(),
    createServerSupabase(),
  ]);
  const result = await getContentItem({ supabase, slug, locale });

  return (
    <ContentDetail
      item={result?.item ?? null}
      isFallback={result?.isFallback ?? false}
      transcript={result?.item.body_md ?? null}
      backHref="/today"
      backLabelKey="today.backToToday"
      context="today"
    />
  );
}
