import { Severity, PatientStatus } from "@/lib/types";

const severityDot: Record<Severity, string> = {
  LOW: "bg-emerald-500",
  MEDIUM: "bg-warning",
  HIGH: "bg-danger",
};

const severityText: Record<Severity, string> = {
  LOW: "text-emerald-700",
  MEDIUM: "text-warning",
  HIGH: "text-danger",
};

const severityLabel: Record<Severity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const statusDot: Record<PatientStatus, string> = {
  Stable: "bg-emerald-500",
  "Needs nurse review": "bg-warning",
  "Doctor review": "bg-danger",
  Completed: "bg-muted",
};

const statusText: Record<PatientStatus, string> = {
  Stable: "text-emerald-700",
  "Needs nurse review": "text-warning",
  "Doctor review": "text-danger",
  Completed: "text-muted",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-2 py-0.5 text-xs font-medium ${severityText[severity]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${severityDot[severity]}`} aria-hidden />
      {severityLabel[severity]}
    </span>
  );
}

export function StatusBadge({ status }: { status: PatientStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-2 py-0.5 text-xs font-medium ${statusText[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${statusDot[status]}`} aria-hidden />
      {status}
    </span>
  );
}
