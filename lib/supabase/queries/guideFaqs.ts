import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/lib/config";
import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
export type GuideFaq = Tables["guide_faqs"]["Row"];
export type GuideScheme = Tables["guide_schemes"]["Row"];

export async function listGuideFaqs({
  supabase,
  locale,
}: {
  supabase: SupabaseClient<Database>;
  locale: Locale;
}): Promise<GuideFaq[]> {
  const { data, error } = await supabase
    .from("guide_faqs")
    .select("*")
    .eq("locale", locale)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listGuideSchemes({
  supabase,
  locale,
}: {
  supabase: SupabaseClient<Database>;
  locale: Locale;
}): Promise<GuideScheme[]> {
  const { data, error } = await supabase
    .from("guide_schemes")
    .select("*")
    .eq("locale", locale)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
