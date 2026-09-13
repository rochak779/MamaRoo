import { useTranslations } from "next-intl";
import { PRODUCT_NAME } from "@/lib/config";
import { SUMMARY_PROVENANCE_KEY, type SummaryModel } from "@/lib/domain/summary";

export interface SummaryDocumentProps {
  model: SummaryModel;
}

/**
 * The doctor-facing document itself -- the restrained register Gate A asked
 * for. No illustration, no motion class, no `texture-motif`, and only two
 * text colours (`text-text-primary`, `text-accent-primary`) plus neutral
 * surfaces, enforced by SummaryDocument.test.tsx. Laid out as a real
 * `<table>`, not a styled `<div>` stack: `thead` is the only DOM mechanism
 * every print engine repeats across pages (see styles/print.css), so the
 * date and the provenance line have to live there to survive a multi-page
 * print, not just at the top of a scrolling screen.
 */
export function SummaryDocument({ model }: SummaryDocumentProps) {
  const t = useTranslations("summary");
  const { header, circumstances } = model;

  const circumstanceParts = [
    circumstances.multiplicity === "twins"
      ? circumstances.twinType
        ? t("circumstances.twinsWithType", { type: circumstances.twinType })
        : t("circumstances.twins")
      : t("circumstances.single"),
    ...(circumstances.isIvf ? [t("circumstances.ivf")] : []),
    circumstances.hasComplication ? t("circumstances.complicationsNoted") : t("circumstances.noComplicationsNoted"),
  ];

  return (
    <table data-print-root className="w-full border-collapse text-body-sm text-text-primary">
      <thead>
        <tr>
          <td data-print-block className="border-b border-divider pb-md">
            <p className="font-display text-h1 font-semibold text-text-primary">{header.name}</p>
            <p className="mt-xs text-body-sm text-text-primary">
              {t("headerSub", { week: header.week, day: header.day, date: header.edd })}
            </p>
            {(header.doctorName || header.clinicName) && (
              <p className="mt-xs text-body-sm text-text-primary">
                {[header.doctorName, header.clinicName].filter(Boolean).join(", ")}
              </p>
            )}
            <p className="mt-sm text-caption italic text-text-primary">
              {t(SUMMARY_PROVENANCE_KEY, { productName: PRODUCT_NAME })}
            </p>
          </td>
        </tr>
      </thead>

      <tbody>
        <tr data-print-block>
          <td className="border-b border-divider py-md">
            <SectionHeading>{t("sectionCircumstances")}</SectionHeading>
            <p className="text-body-sm">{circumstanceParts.join(", ")}</p>
          </td>
        </tr>

        <tr data-print-block>
          <td className="border-b border-divider py-md">
            <SectionHeading>{t("sectionMedicines")}</SectionHeading>
            {model.medicines.length === 0 ? (
              <EmptyLine>{t("empty")}</EmptyLine>
            ) : (
              <ul className="flex flex-col gap-xs">
                {model.medicines.map((medicine) => (
                  <li key={medicine.id} className="text-body-sm">
                    <span className="font-medium">{medicine.name}</span>
                    {medicine.dosage ? `, ${medicine.dosage}` : ""}
                    {medicine.scheduleTimes.length > 0 ? ` (${medicine.scheduleTimes.join(", ")})` : ""}
                    {" — "}
                    {t("doseRatio", { taken: medicine.taken, expected: medicine.expected })}
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>

        {(model.lastAppointment || model.nextAppointment) && (
          <tr data-print-block>
            <td className="border-b border-divider py-md">
              <SectionHeading>{t("sectionAppointments")}</SectionHeading>
              <ul className="flex flex-col gap-xs">
                {model.lastAppointment && (
                  <li className="text-body-sm">
                    {t("lastAppointment")}: {appointmentLine(model.lastAppointment)}
                  </li>
                )}
                {model.nextAppointment && (
                  <li className="text-body-sm">
                    {t("nextAppointment")}: {appointmentLine(model.nextAppointment)}
                  </li>
                )}
              </ul>
            </td>
          </tr>
        )}

        {(model.vitals.weight || model.vitals.bloodPressure.length > 0) && (
          <tr data-print-block>
            <td className="border-b border-divider py-md">
              <SectionHeading>{t("sectionVitals")}</SectionHeading>
              <ul className="flex flex-col gap-xs">
                {model.vitals.weight && (
                  <li className="text-body-sm">
                    {t("weightLabel")}: {t("weightValue", { kg: model.vitals.weight.kg })} ({model.vitals.weight.measuredOn})
                  </li>
                )}
                {model.vitals.bloodPressure.map((bp) => (
                  <li key={bp.measuredOn} className="text-body-sm">
                    {t("bpLabel")}: {t("bpValue", { systolic: bp.systolic, diastolic: bp.diastolic })} ({bp.measuredOn})
                  </li>
                ))}
              </ul>
            </td>
          </tr>
        )}

        <tr data-print-block>
          <td className="border-b border-divider py-md">
            <SectionHeading>{t("sectionReports")}</SectionHeading>
            {model.reports.length === 0 ? (
              <EmptyLine>{t("empty")}</EmptyLine>
            ) : (
              <ul className="flex flex-col gap-xs">
                {model.reports.map((report) => (
                  <li key={report.id} className="text-body-sm">
                    {report.title} ({report.reportDate})
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>

        <tr data-print-block>
          <td className="border-b border-divider py-md">
            <SectionHeading>{t("sectionSymptoms")}</SectionHeading>
            {model.checkins.length === 0 ? (
              <EmptyLine>{t("empty")}</EmptyLine>
            ) : (
              <ul className="flex flex-col gap-xs">
                {model.checkins.map((checkin) => (
                  <li key={checkin.id} className="text-body-sm">
                    {checkin.body}
                    {checkin.severity && <span className="text-accent-primary"> ({checkin.severity})</span>}
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>

        {(model.advice.length > 0 || model.careTasks.length > 0) && (
          <>
            {model.advice.length > 0 && (
              <tr data-print-block>
                <td className="border-b border-divider py-md">
                  <SectionHeading>{t("sectionAdvice")}</SectionHeading>
                  <ul className="flex flex-col gap-xs">
                    {model.advice.map((entry) => (
                      <li key={entry.id} className="text-body-sm">
                        {entry.latestBody}
                      </li>
                    ))}
                  </ul>
                  {model.adviceRemainderCount > 0 && (
                    <p className="mt-xs text-caption text-text-primary">
                      {t("adviceRemainder", { count: model.adviceRemainderCount })}
                    </p>
                  )}
                </td>
              </tr>
            )}

            {model.careTasks.length > 0 && (
              <tr data-print-block>
                <td className="border-b border-divider py-md">
                  <SectionHeading>{t("sectionCareTasks")}</SectionHeading>
                  <ul className="flex flex-col gap-xs">
                    {model.careTasks.map((task) => (
                      <li key={task.id} className="text-body-sm">
                        {task.latestBody}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            )}
          </>
        )}

        <tr data-print-block>
          <td className="py-md">
            <SectionHeading>{t("sectionQuestions")}</SectionHeading>
            {model.markedQuestions.length === 0 ? (
              <EmptyLine>{t("empty")}</EmptyLine>
            ) : (
              <ul className="flex flex-col gap-xs">
                {model.markedQuestions.map((question) => (
                  <li key={question.id} className="text-body-sm">
                    {question.text}
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      </tbody>

      <tfoot>
        <tr>
          <td data-print="hide" className="pt-md text-center text-body-sm text-text-primary">
            {t("closingLine")}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <p className="mb-xs font-display text-body font-semibold text-text-primary">{children}</p>;
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="text-body-sm text-text-primary">{children}</p>;
}

function appointmentLine(appointment: SummaryModel["lastAppointment"]): string {
  if (!appointment) return "";
  const who = [appointment.doctorName, appointment.clinicName].filter(Boolean).join(", ");
  const date = appointment.scheduledAt.slice(0, 10);
  return who ? `${who}, ${date}` : date;
}
