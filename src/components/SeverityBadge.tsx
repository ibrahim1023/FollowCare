import { Severity, PatientStatus } from "@/lib/types";

const severityDot: Record<Severity, string> = {
  LOW: "bg-accent",
  MEDIUM: "bg-warning",
  HIGH: "bg-danger",
};

const severityText: Record<Severity, string> = {
  LOW: "text-accent",
  MEDIUM: "text-warning",
  HIGH: "text-danger",
};

const statusDot: Record<PatientStatus, string> = {
  Stable: "bg-accent",
  "Needs nurse review": "bg-warning",
  "Doctor review": "bg-danger",
  Completed: "bg-muted",
};

const statusText: Record<PatientStatus, string> = {
  Stable: "text-accent",
  "Needs nurse review": "text-warning",
  "Doctor review": "text-danger",
  Completed: "text-muted",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`mono-label inline-flex items-center gap-1.5 rounded-md border border-line bg-panel-raised px-2 py-0.5 text-[10px] ${severityText[severity]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${severityDot[severity]}`} aria-hidden />
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: PatientStatus }) {
  return (
    <span className={`mono-label inline-flex items-center gap-1.5 rounded-md border border-line bg-panel-raised px-2 py-0.5 text-[10px] ${statusText[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${statusDot[status]}`} aria-hidden />
      {status}
    </span>
  );
}
