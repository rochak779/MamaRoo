"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/locale";
import { listChecklistItems } from "@/lib/supabase/queries/checklist";
import type { ChecklistItem, ChecklistProgressRow } from "@/lib/domain/checklist";
import type {
  EmergencyContact,
  ToggleChecklistItemResult,
  SaveContactResult,
  DeleteContactResult,
  SaveBirthNotesResult,
} from "@/app/(app)/me/prep/PrepChecklist";
import type { Database } from "@/lib/supabase/database.types";

export interface PrepData {
  items: ChecklistItem[];
  progress: ChecklistProgressRow[];
  contacts: EmergencyContact[];
  birthNotes: string;
  pregnancyId: string | null;
}

export type LoadPrepDataResult = { ok: true; data: PrepData } | { ok: false; error: string };

/**
 * Seeds emergency_contacts from the onboarding-time snapshot
 * (profiles.emergency_contact_name/phone) the first time she opens Prep, so
 * she is never asked to re-type a contact she already gave at onboarding.
 * profiles.emergency_contact_name/phone stays untouched afterwards -- this
 * table becomes the live, editable list from here on. Only fires when the
 * table is empty for her: if she later deletes every contact, the next
 * visit reseeds from the onboarding pair rather than tracking a separate
 * "already seeded" flag -- for a safety-relevant contact list, defaulting
 * back to a known contact beats defaulting to none.
 */
async function getOrSeedEmergencyContacts(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<EmergencyContact[]> {
  const existing = await supabase
    .from("emergency_contacts")
    .select("id, name, phone")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  if (existing.error) throw existing.error;
  if ((existing.data ?? []).length > 0) return existing.data;

  const { data: profile } = await supabase
    .from("profiles")
    .select("emergency_contact_name, emergency_contact_phone")
    .eq("id", userId)
    .single();

  if (!profile?.emergency_contact_name || !profile.emergency_contact_phone) return [];

  const seeded = await supabase
    .from("emergency_contacts")
    .insert({ user_id: userId, name: profile.emergency_contact_name, phone: profile.emergency_contact_phone, sort_order: 0 })
    .select("id, name, phone")
    .single();
  if (seeded.error) throw seeded.error;
  return [seeded.data];
}

export async function loadPrepData(): Promise<LoadPrepDataResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const locale = await getLocale();
  const items = await listChecklistItems({ supabase, locale });

  const { data: progressRows, error: progressError } = await supabase
    .from("checklist_progress")
    .select("item_key, done")
    .eq("user_id", user.id);
  if (progressError) return { ok: false, error: progressError.message };

  const contacts = await getOrSeedEmergencyContacts(supabase, user.id);

  const { data: pregnancy } = await supabase
    .from("pregnancies")
    .select("id, birth_notes")
    .eq("status", "active")
    .maybeSingle();

  return {
    ok: true,
    data: {
      items,
      progress: (progressRows ?? []).map((r) => ({ itemId: r.item_key, done: r.done })),
      contacts,
      birthNotes: pregnancy?.birth_notes ?? "",
      pregnancyId: pregnancy?.id ?? null,
    },
  };
}

export async function toggleChecklistItem(itemId: string, done: boolean): Promise<ToggleChecklistItemResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { error } = await supabase
    .from("checklist_progress")
    .upsert({ user_id: user.id, item_key: itemId, done }, { onConflict: "user_id,item_key" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function addEmergencyContact(name: string, phone: string): Promise<SaveContactResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data, error } = await supabase
    .from("emergency_contacts")
    .insert({ user_id: user.id, name, phone })
    .select("id, name, phone")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "insert_failed" };
  return { ok: true, contact: data };
}

export async function updateEmergencyContact(
  id: string,
  patch: { name?: string; phone?: string },
): Promise<SaveContactResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data, error } = await supabase
    .from("emergency_contacts")
    .update(patch)
    .eq("id", id)
    .select("id, name, phone")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "update_failed" };
  return { ok: true, contact: data };
}

export async function deleteEmergencyContact(id: string): Promise<DeleteContactResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function saveBirthNotes(pregnancyId: string, notes: string): Promise<SaveBirthNotesResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { error } = await supabase
    .from("pregnancies")
    .update({ birth_notes: notes.trim().length > 0 ? notes : null })
    .eq("id", pregnancyId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
