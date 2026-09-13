import type { LetterRecord } from "@/lib/domain/letters";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type LetterRow = Database["public"]["Tables"]["letters"]["Row"];

export async function getLettersData(): Promise<LetterRecord[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("letters")
    .select("id,pregnancy_id,gestational_week,body,created_at,updated_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as LetterRow[]).map((row) => ({
    id: row.id,
    pregnancyId: row.pregnancy_id,
    gestationalWeek: row.gestational_week,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
