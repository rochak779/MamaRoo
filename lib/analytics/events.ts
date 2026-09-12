import type { DueDateMethod } from "@/lib/domain/onboarding";

/**
 * The complete event taxonomy. Screens import EVENTS; no screen writes an event
 * name inline. Property values are enums, counts, booleans and week numbers only:
 * never free text, never a name, never anything she typed.
 */
export const EVENTS = {
  app_opened: "app_opened",
  language_chosen: "language_chosen",
  signup_started: "signup_started",
  signup_completed: "signup_completed",
  signin_completed: "signin_completed",
  consent_granted: "consent_granted",
  onboarding_step_viewed: "onboarding_step_viewed",
  onboarding_completed: "onboarding_completed",
  tab_viewed: "tab_viewed",
  checkin_submitted: "checkin_submitted",
  triage_result_shown: "triage_result_shown",
  kick_session_started: "kick_session_started",
  kick_session_completed: "kick_session_completed",
  medicine_added: "medicine_added",
  medicine_dose_logged: "medicine_dose_logged",
  appointment_added: "appointment_added",
  vital_logged: "vital_logged",
  advice_saved: "advice_saved",
  report_uploaded: "report_uploaded",
  summary_viewed: "summary_viewed",
  summary_printed: "summary_printed",
  content_opened: "content_opened",
  content_completed: "content_completed",
  chat_opened: "chat_opened",
  chat_question_asked: "chat_question_asked",
  chat_answer_shown: "chat_answer_shown",
  contraction_session_started: "contraction_session_started",
  checklist_item_toggled: "checklist_item_toggled",
  install_prompt_accepted: "install_prompt_accepted",
  offline_write_blocked: "offline_write_blocked",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export interface EventProperties {
  app_opened: { source: "browser" | "standalone" | "twa" };
  language_chosen: { locale: "en" | "hi" };
  signup_started: { method: "email_otp" | "google" };
  signup_completed: { method: "email_otp" | "google" };
  signin_completed: { method: "email_otp" | "google" };
  consent_granted: { optional_data_sharing: boolean; analytics: boolean };
  onboarding_step_viewed: { step: number };
  // date_mode is DueDateMethod, not a fixed lmp/edd binary: Sessions 15+16 shipped
  // five due-date methods (lib/domain/onboarding.ts), not the two this event was
  // originally scoped for. Bucketing four of the five into "edd" would misrepresent
  // the funnel, so the schema tracks the real domain type instead.
  onboarding_completed: { date_mode: DueDateMethod; optional_fields_filled: number };
  tab_viewed: { tab: "today" | "baby" | "care" | "reading" | "profile" };
  checkin_submitted: { input_method: "text" | "voice"; length_bucket: "short" | "medium" | "long" };
  triage_result_shown: { severity: "general" | "contact_clinic" | "urgent" | "no_match" };
  kick_session_started: { week: number };
  kick_session_completed: { week: number; kicks: number; minutes: number };
  medicine_added: { schedule_count: number };
  medicine_dose_logged: { status: "taken" | "skipped"; late: boolean };
  appointment_added: { days_ahead: number };
  vital_logged: { kind: "weight" | "bp" };
  advice_saved: { input_method: "text" | "voice"; linked_to_appointment: boolean };
  report_uploaded: { mime_group: "image" | "pdf"; size_bucket: "small" | "medium" | "large" };
  summary_viewed: { week: number };
  summary_printed: { week: number };
  content_opened: { kind: "article" | "video" | "audio"; is_fallback_locale: boolean };
  content_completed: { kind: "article" | "video" | "audio" };
  chat_opened: Record<string, never>;
  chat_question_asked: { locale: "en" | "hi" };
  chat_answer_shown: { answer_kind: "data" | "retrieved" | "no_match" | "refused" };
  contraction_session_started: { week: number };
  checklist_item_toggled: { category: string; done: boolean };
  install_prompt_accepted: { platform: "android" | "ios" | "other" };
  offline_write_blocked: { feature: string };
}
