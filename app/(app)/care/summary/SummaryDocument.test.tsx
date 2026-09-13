import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { SummaryDocument } from "@/app/(app)/care/summary/SummaryDocument";
import { PRODUCT_NAME } from "@/lib/config";
import type { SummaryModel } from "@/lib/domain/summary";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";

function emptyModel(): SummaryModel {
  return {
    header: { name: "Aarti Verma", week: 24, day: 3, edd: "2026-12-12", doctorName: null, clinicName: null },
    circumstances: { multiplicity: "single", twinType: null, isIvf: false, hasComplication: false },
    medicines: [],
    lastAppointment: null,
    nextAppointment: null,
    advice: [],
    adviceRemainderCount: 0,
    careTasks: [],
    vitals: { weight: null, bloodPressure: [] },
    reports: [],
    checkins: [],
    markedQuestions: [],
    provenanceKey: "provenanceLine",
  };
}

function fullModel(): SummaryModel {
  return {
    ...emptyModel(),
    header: { name: "Aarti Verma", week: 24, day: 3, edd: "2026-12-12", doctorName: "Dr. Sharma", clinicName: "Sunrise Clinic" },
    medicines: [{ id: "m1", name: "Iron and folic acid", dosage: "1 tablet", scheduleTimes: ["21:00"], taken: 10, expected: 14 }],
    lastAppointment: { id: "a1", title: "Checkup", doctorName: "Dr. Sharma", clinicName: "Sunrise Clinic", scheduledAt: "2026-09-02T09:00:00.000Z" },
    nextAppointment: { id: "a2", title: "Checkup", doctorName: "Dr. Sharma", clinicName: "Sunrise Clinic", scheduledAt: "2026-09-24T09:00:00.000Z" },
    advice: [{ id: "adv1", type: "other", latestBody: "Rest well", createdAt: "2026-09-01T00:00:00.000Z" }],
    adviceRemainderCount: 2,
    careTasks: [{ id: "adv2", type: "test", latestBody: "Get a glucose test done", createdAt: "2026-09-01T00:00:00.000Z" }],
    vitals: { weight: { measuredOn: "2026-09-08", kg: 61 }, bloodPressure: [{ measuredOn: "2026-09-12", systolic: 121, diastolic: 79 }] },
    reports: [{ id: "r1", title: "Ultrasound scan", reportDate: "2026-09-10" }],
    checkins: [{ id: "c1", body: "Mild headache", severity: "general", createdAt: "2026-09-10T00:00:00.000Z" }],
    markedQuestions: [{ id: "q1", text: "Is my baby's position normal?" }],
  };
}

function renderDocument(model: SummaryModel, locale: "en" | "hi" = "en") {
  const messages = locale === "en" ? en : hi;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <SummaryDocument model={model} />
    </NextIntlClientProvider>,
  );
}

describe("SummaryDocument", () => {
  it("renders every section the model provides", () => {
    renderDocument(fullModel());
    expect(screen.getByText("Iron and folic acid", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Sharma, Sunrise Clinic, 2026-09-02/)).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Sharma, Sunrise Clinic, 2026-09-24/)).toBeInTheDocument();
    expect(screen.getByText("Rest well")).toBeInTheDocument();
    expect(screen.getByText("Get a glucose test done")).toBeInTheDocument();
    expect(screen.getByText("Ultrasound scan (2026-09-10)")).toBeInTheDocument();
    expect(screen.getByText("Mild headache", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Is my baby's position normal?")).toBeInTheDocument();
    expect(screen.getByText("2 more entries not shown")).toBeInTheDocument();
  });

  it("shows 'Nothing added yet' rather than an empty gap when a list section is empty", () => {
    renderDocument(emptyModel());
    const emptyLines = screen.getAllByText("Nothing added yet");
    // Medicines, reports, symptoms and questions each render their own empty line.
    expect(emptyLines.length).toBeGreaterThanOrEqual(4);
  });

  it("renders no appointments, vitals, advice or care-tasks section when all their data is empty", () => {
    const { container } = renderDocument(emptyModel());
    expect(screen.queryByText("Appointments")).not.toBeInTheDocument();
    expect(screen.queryByText("Vitals")).not.toBeInTheDocument();
    expect(screen.queryByText("Doctor's advice")).not.toBeInTheDocument();
    expect(screen.queryByText("Open care tasks")).not.toBeInTheDocument();
    expect(container).toBeTruthy();
  });

  it("renders the provenance line in English", () => {
    renderDocument(emptyModel(), "en");
    expect(
      screen.getByText(`This information was entered by me and has not been medically verified by ${PRODUCT_NAME}.`),
    ).toBeInTheDocument();
  });

  it("renders the provenance line in Hindi", () => {
    renderDocument(emptyModel(), "hi");
    expect(
      screen.getByText(`यह जानकारी मेरे द्वारा दर्ज की गई है और ${PRODUCT_NAME} द्वारा चिकित्सकीय रूप से सत्यापित नहीं है।`),
    ).toBeInTheDocument();
  });

  it("uses only the two document colours, plus neutral surfaces -- no other accent class", () => {
    const { container } = renderDocument(fullModel());
    const html = container.innerHTML;
    for (const forbidden of ["text-accent-secondary", "text-success", "text-alert", "bg-gold", "bg-peach", "bg-blush"]) {
      expect(html).not.toContain(forbidden);
    }
  });

  it("renders no illustration, texture motif or animation/motion class", () => {
    const { container } = renderDocument(fullModel());
    const html = container.innerHTML;
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).toBeNull();
    expect(html).not.toContain("texture-motif");
    expect(html).not.toMatch(/animate-|transition-|duration-\(/);
  });
});
