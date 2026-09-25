export interface SummaryInput {
  patient: { name: string; diagnosis: string; treatment: string; lastVisit: string };
  previousStatus?: string;
  message: string;
  symptoms: string[];
  severity: "LOW" | "MEDIUM" | "HIGH";
  route: "NURSE" | "DOCTOR";
}

export function buildFallbackSummary(input: SummaryInput): string {
  const { patient, previousStatus, symptoms, severity, route } = input;
  const symptomText = symptoms.length ? symptoms.join(", ") : "no specific symptoms reported";
  const lines = [
    `Patient: ${patient.name}`,
    `Visit: ${patient.diagnosis} (${patient.lastVisit})`,
    previousStatus ? `Previous status: ${previousStatus}` : `Treatment: ${patient.treatment}`,
    `New report: ${symptomText}`,
    severity === "HIGH"
      ? "Reason for escalation: red flags detected; routed to doctor."
      : `Assessed as ${severity.toLowerCase()} severity; routed to ${route === "NURSE" ? "nurse" : "doctor"} queue.`,
  ];
  return lines.join("\n");
}
