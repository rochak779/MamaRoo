import { z } from "zod";
import { EVENTS } from "@/lib/analytics/events";

const locale = z.enum(["en", "hi"]);
const week = z.number().int().min(0).max(42);

/**
 * One schema per event, declaring EXACT permitted keys and, per key, an enum or a
 * numeric range. `.strict()` rejects any key not listed, so a free-text property is
 * not discouraged, it is unrepresentable. Analytics is hosted outside India and must
 * never carry health data or free text (Global Constraints).
 */
export const EVENT_SCHEMAS = {
  [EVENTS.app_opened]: z.object({ source: z.enum(["browser", "standalone", "twa"]) }).strict(),
  [EVENTS.language_chosen]: z.object({ locale }).strict(),
  [EVENTS.signup_started]: z.object({ method: z.enum(["email_otp", "google"]) }).strict(),
  [EVENTS.signup_completed]: z.object({ method: z.enum(["email_otp", "google"]) }).strict(),
  [EVENTS.signin_completed]: z.object({ method: z.enum(["email_otp", "google"]) }).strict(),
  [EVENTS.consent_granted]: z.object({
    optional_data_sharing: z.boolean(),
    analytics: z.boolean(),
  }).strict(),
  [EVENTS.onboarding_step_viewed]: z.object({ step: z.number().int().min(1).max(10) }).strict(),
  [EVENTS.onboarding_completed]: z.object({
    // The five due-date methods actually shipped (lib/domain/onboarding.ts), not the
    // two-value lmp/edd split this event was originally scoped for — see events.ts.
    date_mode: z.enum(["lmp", "scan", "manual", "ivf", "unsure"]),
    optional_fields_filled: z.number().int().min(0).max(10),
  }).strict(),
  [EVENTS.tab_viewed]: z.object({
    tab: z.enum(["today", "baby", "care", "reading", "profile"]),
  }).strict(),
  [EVENTS.checkin_submitted]: z.object({
    input_method: z.enum(["text", "voice"]),
    length_bucket: z.enum(["short", "medium", "long"]),
  }).strict(),
  [EVENTS.triage_result_shown]: z.object({
    severity: z.enum(["general", "contact_clinic", "urgent", "no_match"]),
  }).strict(),
  [EVENTS.kick_session_started]: z.object({ week }).strict(),
  [EVENTS.kick_session_completed]: z.object({
    week,
    kicks: z.number().int().min(0).max(100),
    minutes: z.number().int().min(0).max(720),
  }).strict(),
  [EVENTS.medicine_added]: z.object({ schedule_count: z.number().int().min(1).max(6) }).strict(),
  [EVENTS.medicine_dose_logged]: z.object({
    status: z.enum(["taken", "skipped"]),
    late: z.boolean(),
  }).strict(),
  [EVENTS.appointment_added]: z.object({ days_ahead: z.number().int().min(-365).max(730) }).strict(),
  [EVENTS.vital_logged]: z.object({ kind: z.enum(["weight", "bp"]) }).strict(),
  [EVENTS.advice_saved]: z.object({
    input_method: z.enum(["text", "voice"]),
    linked_to_appointment: z.boolean(),
  }).strict(),
  [EVENTS.report_uploaded]: z.object({
    mime_group: z.enum(["image", "pdf"]),
    size_bucket: z.enum(["small", "medium", "large"]),
  }).strict(),
  [EVENTS.summary_viewed]: z.object({ week }).strict(),
  [EVENTS.summary_printed]: z.object({ week }).strict(),
  [EVENTS.content_opened]: z.object({
    kind: z.enum(["article", "video", "audio"]),
    is_fallback_locale: z.boolean(),
  }).strict(),
  [EVENTS.content_completed]: z.object({ kind: z.enum(["article", "video", "audio"]) }).strict(),
  [EVENTS.chat_opened]: z.object({}).strict(),
  [EVENTS.chat_question_asked]: z.object({ locale }).strict(),
  [EVENTS.chat_answer_shown]: z.object({
    answer_kind: z.enum(["data", "retrieved", "no_match", "refused"]),
  }).strict(),
  [EVENTS.contraction_session_started]: z.object({ week }).strict(),
  [EVENTS.checklist_item_toggled]: z.object({
    // A closed enum, not an arbitrary string: "category" would otherwise be a free-text hole.
    category: z.enum(["hospital_bag", "documents", "birth_prep", "home"]),
    done: z.boolean(),
  }).strict(),
  [EVENTS.install_prompt_accepted]: z.object({
    platform: z.enum(["android", "ios", "other"]),
  }).strict(),
  [EVENTS.offline_write_blocked]: z.object({
    // Also a closed enum. Every feature that can block offline is listed here.
    feature: z.enum([
      "medicine", "medicine_log", "appointment", "vital", "advice", "report",
      "checkin", "kick", "contraction", "checklist", "baby_name", "profile",
    ]),
  }).strict(),
} as const;

/**
 * Validates an event against its schema. Throws on an unknown event, an unknown key,
 * or an out-of-range value, so a mistake is caught in development and in tests rather
 * than discovered in a vendor dashboard.
 */
export function validateEvent(event: string, properties: Record<string, unknown>): Record<string, unknown> {
  const schema = (EVENT_SCHEMAS as Record<string, z.ZodType | undefined>)[event];
  if (!schema) throw new Error(`Unknown analytics event "${event}". Add it to EVENTS and EVENT_SCHEMAS.`);

  const result = schema.safeParse(properties);
  if (!result.success) {
    const detail = result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.code}`).join("; ");
    throw new Error(`Analytics event "${event}" rejected: ${detail}`);
  }
  return result.data as Record<string, unknown>;
}
