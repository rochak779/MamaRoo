"use server";

import { revalidatePath } from "next/cache";
import {
  validateLetterBody,
  type LetterBodyValidationError,
  type LetterRecord,
} from "@/lib/domain/letters";
import { pregnancyProgress } from "@/lib/domain/pregnancy";
import { todayInAppZone } from "@/lib/domain/dates";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type LetterRow = Database["public"]["Tables"]["letters"]["Row"];
type LetterSelection = Pick<
  LetterRow,
  "id" | "pregnancy_id" | "gestational_week" | "body" | "created_at" | "updated_at"
>;

type FieldErrors = {
  body?: LetterBodyValidationError;
  letterId?: "invalid";
};

export type SaveLetterResult =
  | { ok: true; letter: LetterRecord }
  | { ok: false; errors: FieldErrors }
  | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LETTER_COLUMNS = "id,pregnancy_id,gestational_week,body,created_at,updated_at";

function toLetter(row: LetterSelection): LetterRecord {
  return {
    id: row.id,
    pregnancyId: row.pregnancy_id,
    gestationalWeek: row.gestational_week,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createLetter(input: { body: unknown }): Promise<SaveLetterResult> {
  const validated = validateLetterBody(input.body);
  if (!validated.ok) return { ok: false, errors: { body: validated.error } };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data: pregnancy, error: pregnancyError } = await supabase
    .from("pregnancies")
    .select("id,edd")
    .eq("status", "active")
    .maybeSingle();
  if (pregnancyError) return { ok: false, error: pregnancyError.message };
  if (!pregnancy) return { ok: false, error: "pregnancy_not_found" };

  const progress = pregnancyProgress({ edd: pregnancy.edd, today: todayInAppZone() });
  const { data, error } = await supabase
    .from("letters")
    .insert({
      user_id: user.id,
      pregnancy_id: pregnancy.id,
      gestational_week: progress.week,
      body: validated.value,
    })
    .select(LETTER_COLUMNS)
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/baby/letters");
  return { ok: true, letter: toLetter(data) };
}

export async function updateLetter(input: {
  letterId: unknown;
  body: unknown;
}): Promise<SaveLetterResult> {
  if (typeof input.letterId !== "string" || !UUID.test(input.letterId)) {
    return { ok: false, errors: { letterId: "invalid" } };
  }
  const validated = validateLetterBody(input.body);
  if (!validated.ok) return { ok: false, errors: { body: validated.error } };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data, error } = await supabase
    .from("letters")
    .update({ body: validated.value })
    .eq("id", input.letterId)
    .eq("user_id", user.id)
    .select(LETTER_COLUMNS)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "letter_not_found" };

  revalidatePath("/baby/letters");
  return { ok: true, letter: toLetter(data) };
}
