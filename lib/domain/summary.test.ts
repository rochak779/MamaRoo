import { describe, expect, it } from "vitest";
import { buildSummary, SUMMARY_PROVENANCE_KEY, type SummaryInput } from "@/lib/domain/summary";

const TODAY = "2026-09-13";

function baseInput(overrides: Partial<SummaryInput> = {}): SummaryInput {
  return {
    profile: { displayName: "Aarti Verma", doctorName: null, clinicName: null },
    pregnancy: { edd: "2026-12-12", flags: [], twinType: null },
    progress: { week: 24, day: 3, trimester: 2 },
    medicines: [],
    logs: [],
    appointments: [],
    advice: [],
    vitals: [],
    reports: [],
    checkins: [],
    markedQuestions: [],
    today: TODAY,
    ...overrides,
  };
}

describe("buildSummary", () => {
  it("carries her name, current week and day, and EDD in the header", () => {
    const model = buildSummary(baseInput());
    expect(model.header).toEqual({
      name: "Aarti Verma",
      week: 24,
      day: 3,
      edd: "2026-12-12",
      doctorName: null,
      clinicName: null,
    });
  });

  it("includes doctor and clinic when known", () => {
    const model = buildSummary(
      baseInput({ profile: { displayName: "Aarti Verma", doctorName: "Dr. Priya Sharma", clinicName: "Sunrise Clinic" } }),
    );
    expect(model.header.doctorName).toBe("Dr. Priya Sharma");
    expect(model.header.clinicName).toBe("Sunrise Clinic");
  });

  it("omits a missing doctor or clinic rather than an empty label", () => {
    const model = buildSummary(baseInput());
    expect(model.header.doctorName).toBeNull();
    expect(model.header.clinicName).toBeNull();
  });

  it("reports a singleton pregnancy with no complications when no flags are set", () => {
    const model = buildSummary(baseInput());
    expect(model.circumstances).toEqual({ multiplicity: "single", twinType: null, isIvf: false, hasComplication: false });
  });

  it("reports a twin pregnancy, with the twin type when known, when flagged", () => {
    const model = buildSummary(
      baseInput({ pregnancy: { edd: "2026-12-12", flags: ["twins"], twinType: "dichorionic" } }),
    );
    expect(model.circumstances.multiplicity).toBe("twins");
    expect(model.circumstances.twinType).toBe("dichorionic");
  });

  it("reports IVF conception and flagged complications separately, as structured data, not baked English", () => {
    const model = buildSummary(
      baseInput({ pregnancy: { edd: "2026-12-12", flags: ["ivf", "monitored"], twinType: null } }),
    );
    expect(model.circumstances.isIvf).toBe(true);
    expect(model.circumstances.hasComplication).toBe(true);
  });

  it("shows only active medicines, each with dosage, schedule and a 14-day taken-out-of-expected ratio", () => {
    const model = buildSummary(
      baseInput({
        medicines: [
          {
            id: "m1",
            name: "Iron and folic acid",
            dosage: "1 tablet",
            schedule_times: ["21:00:00"],
            days_of_week: null,
            start_date: "2026-01-01",
            end_date: null,
            is_active: true,
          },
          {
            id: "m2",
            name: "Old medicine",
            dosage: null,
            schedule_times: ["08:00:00"],
            days_of_week: null,
            start_date: "2026-01-01",
            end_date: "2026-02-01",
            is_active: false,
          },
        ],
        logs: [{ medicine_id: "m1", scheduled_date: TODAY, scheduled_time: "21:00:00", status: "taken" }],
      }),
    );
    expect(model.medicines).toHaveLength(1);
    expect(model.medicines[0]).toMatchObject({ id: "m1", name: "Iron and folic acid", dosage: "1 tablet" });
    expect(model.medicines[0]!.expected).toBeGreaterThan(0);
    expect(model.medicines[0]!.taken).toBe(1);
  });

  it("surfaces both the last completed appointment and the next upcoming one, each with its date", () => {
    const model = buildSummary(
      baseInput({
        appointments: [
          {
            id: "a1",
            title: "Checkup",
            doctor_name: "Dr. Sharma",
            clinic_name: "Sunrise",
            scheduled_at: "2026-09-02T09:00:00.000Z",
            status: "completed",
          },
          {
            id: "a2",
            title: "Checkup",
            doctor_name: "Dr. Sharma",
            clinic_name: "Sunrise",
            scheduled_at: "2026-09-24T09:00:00.000Z",
            status: "upcoming",
          },
        ],
      }),
    );
    expect(model.lastAppointment?.id).toBe("a1");
    expect(model.nextAppointment?.id).toBe("a2");
  });

  it("lists advice entries newest first, limited to five, with a remainder count", () => {
    const advice = Array.from({ length: 7 }, (_, i) => ({
      id: `adv${i}`,
      type: "other" as const,
      is_reminder: false,
      updates: [
        { id: `u${i}`, advice_id: `adv${i}`, body: `Advice ${i}`, doctor_name: null, created_at: `2026-09-0${(i % 9) + 1}T00:00:00.000Z` },
      ],
    }));
    const model = buildSummary(baseInput({ advice }));
    expect(model.advice).toHaveLength(5);
    expect(model.adviceRemainderCount).toBe(2);
  });

  it("lists only reminder-confirmed advice as open care tasks", () => {
    const model = buildSummary(
      baseInput({
        advice: [
          {
            id: "adv1",
            type: "test",
            is_reminder: true,
            updates: [
              { id: "u1", advice_id: "adv1", body: "Get a glucose test done", doctor_name: null, created_at: "2026-09-01T00:00:00.000Z" },
            ],
          },
          {
            id: "adv2",
            type: "other",
            is_reminder: false,
            updates: [
              { id: "u2", advice_id: "adv2", body: "Just a note", doctor_name: null, created_at: "2026-09-01T00:00:00.000Z" },
            ],
          },
        ],
      }),
    );
    expect(model.careTasks).toHaveLength(1);
    expect(model.careTasks[0]!.id).toBe("adv1");
  });

  it("shows the latest weight and the latest three blood-pressure readings", () => {
    const model = buildSummary(
      baseInput({
        vitals: [
          { measured_on: "2026-09-01", kind: "weight", value_1: 60, value_2: null },
          { measured_on: "2026-09-08", kind: "weight", value_1: 61, value_2: null },
          { measured_on: "2026-09-01", kind: "bp", value_1: 118, value_2: 76 },
          { measured_on: "2026-09-05", kind: "bp", value_1: 120, value_2: 78 },
          { measured_on: "2026-09-10", kind: "bp", value_1: 122, value_2: 80 },
          { measured_on: "2026-09-12", kind: "bp", value_1: 121, value_2: 79 },
        ],
      }),
    );
    expect(model.vitals.weight).toEqual({ measuredOn: "2026-09-08", kg: 61 });
    expect(model.vitals.bloodPressure).toHaveLength(3);
    expect(model.vitals.bloodPressure[0]).toEqual({ measuredOn: "2026-09-12", systolic: 121, diastolic: 79 });
  });

  it("renders 'Nothing added yet' state as an empty vitals section, not an error", () => {
    const model = buildSummary(baseInput());
    expect(model.vitals.weight).toBeNull();
    expect(model.vitals.bloodPressure).toEqual([]);
  });

  it("shows reports as name and date only, never as content", () => {
    const model = buildSummary(
      baseInput({
        reports: [{ id: "r1", title: "Ultrasound scan", report_date: "2026-09-10", created_at: "2026-09-10T00:00:00.000Z" }],
      }),
    );
    expect(model.reports).toEqual([{ id: "r1", title: "Ultrasound scan", reportDate: "2026-09-10" }]);
  });

  it("shows check-ins from the last 14 days with severity, and plain notes when severity is absent", () => {
    const model = buildSummary(
      baseInput({
        today: "2026-09-13",
        checkins: [
          { id: "c1", body: "Mild headache", severity: "general", created_at: "2026-09-10T00:00:00.000Z" },
          { id: "c2", body: "Feeling good today", severity: null, created_at: "2026-09-11T00:00:00.000Z" },
          { id: "c3", body: "Too old", severity: "urgent", created_at: "2026-08-01T00:00:00.000Z" },
        ],
      }),
    );
    expect(model.checkins).toHaveLength(2);
    expect(model.checkins.find((c) => c.id === "c1")?.severity).toBe("general");
    expect(model.checkins.find((c) => c.id === "c2")?.severity).toBeNull();
  });

  it("lists marked questions in their own section", () => {
    const model = buildSummary(baseInput({ markedQuestions: [{ id: "q1", text: "Is my baby's position normal?" }] }));
    expect(model.markedQuestions).toEqual([{ id: "q1", text: "Is my baby's position normal?" }]);
  });

  it("always includes the provenance line key, in every branch, including entirely empty", () => {
    const model = buildSummary(baseInput());
    expect(model.provenanceKey).toBe(SUMMARY_PROVENANCE_KEY);
  });

  it("produces a valid model with header and provenance for an entirely empty summary, never null", () => {
    const model = buildSummary(baseInput());
    expect(model).not.toBeNull();
    expect(model.header.name).toBe("Aarti Verma");
    expect(model.provenanceKey).toBe(SUMMARY_PROVENANCE_KEY);
    expect(model.medicines).toEqual([]);
    expect(model.lastAppointment).toBeNull();
    expect(model.nextAppointment).toBeNull();
    expect(model.advice).toEqual([]);
    expect(model.careTasks).toEqual([]);
    expect(model.reports).toEqual([]);
    expect(model.checkins).toEqual([]);
    expect(model.markedQuestions).toEqual([]);
  });
});
