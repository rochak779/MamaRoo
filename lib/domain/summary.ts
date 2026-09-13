import { adherenceGrid, adherenceRatio, type AdherenceLog, type AdherenceMedicine } from "@/lib/domain/adherence";
import { addDays, diffDays } from "@/lib/domain/dates";
import { assembleAdvice, sortAdviceByRecency, type AdviceRow, type AdviceUpdateRow } from "@/lib/domain/advice";

/** Relative to the `summary` i18n namespace -- read by both the on-screen
 * document and the print stylesheet's running header, always present even
 * when every other section is empty, so a printed page can never be mistaken
 * for a doctor-verified record. */
export const SUMMARY_PROVENANCE_KEY = "provenanceLine";

const ADVICE_SECTION_LIMIT = 5;
const CHECKIN_WINDOW_DAYS = 14;
const VITALS_BP_LIMIT = 3;

const COMPLICATION_FLAGS = new Set(["monitored", "priorLoss"]);

export interface SummaryProfileInput {
  displayName: string;
  doctorName: string | null;
  clinicName: string | null;
}

export interface SummaryPregnancyInput {
  edd: string;
  flags: string[];
  twinType: string | null;
}

export interface SummaryProgressInput {
  week: number;
  day: number;
  trimester: 1 | 2 | 3;
}

export interface SummaryMedicineInput extends AdherenceMedicine {
  name: string;
  dosage: string | null;
}

export interface SummaryAppointmentInput {
  id: string;
  title: string;
  doctor_name: string | null;
  clinic_name: string | null;
  scheduled_at: string;
  status: "upcoming" | "completed" | "cancelled";
}

export interface SummaryAdviceInput extends AdviceRow {
  updates: AdviceUpdateRow[];
}

export interface SummaryVitalInput {
  measured_on: string;
  kind: "weight" | "bp";
  value_1: number;
  value_2: number | null;
}

export interface SummaryReportInput {
  id: string;
  title: string;
  report_date: string;
  created_at: string;
}

export interface SummaryCheckinInput {
  id: string;
  body: string;
  severity: "general" | "contact_clinic" | "urgent" | null;
  created_at: string;
}

export interface SummaryQuestionInput {
  id: string;
  text: string;
}

export interface SummaryInput {
  profile: SummaryProfileInput;
  pregnancy: SummaryPregnancyInput;
  progress: SummaryProgressInput;
  medicines: SummaryMedicineInput[];
  logs: AdherenceLog[];
  appointments: SummaryAppointmentInput[];
  advice: SummaryAdviceInput[];
  vitals: SummaryVitalInput[];
  reports: SummaryReportInput[];
  checkins: SummaryCheckinInput[];
  markedQuestions: SummaryQuestionInput[];
  today: string;
}

export interface SummaryHeader {
  name: string;
  week: number;
  day: number;
  edd: string;
  doctorName: string | null;
  clinicName: string | null;
}

export interface SummaryMedicine {
  id: string;
  name: string;
  dosage: string | null;
  scheduleTimes: string[];
  taken: number;
  expected: number;
}

export interface SummaryAppointment {
  id: string;
  title: string;
  doctorName: string | null;
  clinicName: string | null;
  scheduledAt: string;
}

export interface SummaryAdviceEntry {
  id: string;
  type: string;
  latestBody: string;
  createdAt: string;
}

export interface SummaryVitalWeight {
  measuredOn: string;
  kg: number;
}

export interface SummaryVitalBp {
  measuredOn: string;
  systolic: number;
  diastolic: number;
}

export interface SummaryReport {
  id: string;
  title: string;
  reportDate: string;
}

export interface SummaryCheckin {
  id: string;
  body: string;
  severity: "general" | "contact_clinic" | "urgent" | null;
  createdAt: string;
}

export interface SummaryQuestion {
  id: string;
  text: string;
}

export interface SummaryCircumstances {
  multiplicity: "single" | "twins";
  twinType: string | null;
  isIvf: boolean;
  hasComplication: boolean;
}

export interface SummaryModel {
  header: SummaryHeader;
  circumstances: SummaryCircumstances;
  medicines: SummaryMedicine[];
  lastAppointment: SummaryAppointment | null;
  nextAppointment: SummaryAppointment | null;
  advice: SummaryAdviceEntry[];
  adviceRemainderCount: number;
  careTasks: SummaryAdviceEntry[];
  vitals: { weight: SummaryVitalWeight | null; bloodPressure: SummaryVitalBp[] };
  reports: SummaryReport[];
  checkins: SummaryCheckin[];
  markedQuestions: SummaryQuestion[];
  provenanceKey: typeof SUMMARY_PROVENANCE_KEY;
}

/**
 * Structured, not prose: the model never bakes an English sentence, since the
 * document renders in Hindi too. `multiplicity`/`twinType`/`isIvf`/
 * `hasComplication` are display-ready values the component composes into a
 * translated line -- same division of labour as `activity.ts`'s `params`.
 */
function buildCircumstances({ flags, twinType }: SummaryPregnancyInput): SummaryCircumstances {
  const isTwins = flags.includes("twins");
  return {
    multiplicity: isTwins ? "twins" : "single",
    twinType: isTwins && twinType && twinType !== "unconfirmed" ? twinType : null,
    isIvf: flags.includes("ivf"),
    hasComplication: flags.some((flag) => COMPLICATION_FLAGS.has(flag)),
  };
}

function buildMedicines({
  medicines,
  logs,
  today,
}: {
  medicines: SummaryMedicineInput[];
  logs: AdherenceLog[];
  today: string;
}): SummaryMedicine[] {
  const from = addDays(today, -(CHECKIN_WINDOW_DAYS - 1));
  return medicines
    .filter((medicine) => medicine.is_active)
    .map((medicine) => {
      const grid = adherenceGrid({ medicines: [medicine], logs, from, to: today });
      const { taken, expected } = adherenceRatio(grid);
      return {
        id: medicine.id,
        name: medicine.name,
        dosage: medicine.dosage,
        scheduleTimes: medicine.schedule_times.map((t) => t.slice(0, 5)),
        taken,
        expected,
      };
    });
}

function toSummaryAppointment(row: SummaryAppointmentInput): SummaryAppointment {
  return { id: row.id, title: row.title, doctorName: row.doctor_name, clinicName: row.clinic_name, scheduledAt: row.scheduled_at };
}

function buildAppointments(
  appointments: SummaryAppointmentInput[],
  now: number,
): { last: SummaryAppointment | null; next: SummaryAppointment | null } {
  const active = appointments.filter((a) => a.status !== "cancelled");

  const past = active
    .filter((a) => a.status === "completed" || new Date(a.scheduled_at).getTime() < now)
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  const upcoming = active
    .filter((a) => a.status === "upcoming" && new Date(a.scheduled_at).getTime() >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  return {
    last: past[0] ? toSummaryAppointment(past[0]) : null,
    next: upcoming[0] ? toSummaryAppointment(upcoming[0]) : null,
  };
}

function toAdviceEntry(record: { id: string; type: string; updates: { body: string; createdAt: string }[] }): SummaryAdviceEntry {
  const latest = record.updates.at(-1);
  return { id: record.id, type: record.type, latestBody: latest?.body ?? "", createdAt: latest?.createdAt ?? "" };
}

function buildAdviceSections(advice: SummaryAdviceInput[]): {
  advice: SummaryAdviceEntry[];
  remainderCount: number;
  careTasks: SummaryAdviceEntry[];
} {
  const rows: AdviceRow[] = advice.map((a) => ({ id: a.id, type: a.type, is_reminder: a.is_reminder }));
  const updateRows = advice.flatMap((a) => a.updates);
  const assembled = assembleAdvice({ adviceRows: rows, updateRows });

  const sorted = sortAdviceByRecency(assembled);
  const limited = sorted.slice(0, ADVICE_SECTION_LIMIT).map(toAdviceEntry);
  const remainderCount = Math.max(0, sorted.length - ADVICE_SECTION_LIMIT);

  const careTasks = sorted.filter((a) => a.isReminder).map(toAdviceEntry);

  return { advice: limited, remainderCount, careTasks };
}

function buildVitals(vitals: SummaryVitalInput[]): { weight: SummaryVitalWeight | null; bloodPressure: SummaryVitalBp[] } {
  const weights = vitals
    .filter((v) => v.kind === "weight")
    .sort((a, b) => b.measured_on.localeCompare(a.measured_on));
  const bp = vitals
    .filter((v) => v.kind === "bp")
    .sort((a, b) => b.measured_on.localeCompare(a.measured_on))
    .slice(0, VITALS_BP_LIMIT);

  return {
    weight: weights[0] ? { measuredOn: weights[0].measured_on, kg: weights[0].value_1 } : null,
    bloodPressure: bp.map((v) => ({ measuredOn: v.measured_on, systolic: v.value_1, diastolic: v.value_2 ?? 0 })),
  };
}

function buildReports(reports: SummaryReportInput[]): SummaryReport[] {
  return [...reports]
    .sort((a, b) => b.report_date.localeCompare(a.report_date))
    .map((r) => ({ id: r.id, title: r.title, reportDate: r.report_date }));
}

function buildCheckins(checkins: SummaryCheckinInput[], today: string): SummaryCheckin[] {
  return checkins
    .filter((c) => diffDays(c.created_at.slice(0, 10), today) <= CHECKIN_WINDOW_DAYS - 1)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((c) => ({ id: c.id, body: c.body, severity: c.severity, createdAt: c.created_at }));
}

/**
 * The single source of truth for the Visit Summary. Every field here is a
 * display-ready value, never a raw database row -- SummaryDocument cannot
 * accidentally render something unintended, and this model is valid (header +
 * provenance line) even for a brand-new user with nothing tracked yet.
 */
export function buildSummary(input: SummaryInput): SummaryModel {
  const now = new Date(`${input.today}T12:00:00.000Z`).getTime();
  const { last, next } = buildAppointments(input.appointments, now);
  const adviceSections = buildAdviceSections(input.advice);

  return {
    header: {
      name: input.profile.displayName,
      week: input.progress.week,
      day: input.progress.day,
      edd: input.pregnancy.edd,
      doctorName: input.profile.doctorName,
      clinicName: input.profile.clinicName,
    },
    circumstances: buildCircumstances(input.pregnancy),
    medicines: buildMedicines({ medicines: input.medicines, logs: input.logs, today: input.today }),
    lastAppointment: last,
    nextAppointment: next,
    advice: adviceSections.advice,
    adviceRemainderCount: adviceSections.remainderCount,
    careTasks: adviceSections.careTasks,
    vitals: buildVitals(input.vitals),
    reports: buildReports(input.reports),
    checkins: buildCheckins(input.checkins, input.today),
    markedQuestions: input.markedQuestions.map((q) => ({ id: q.id, text: q.text })),
    provenanceKey: SUMMARY_PROVENANCE_KEY,
  };
}
