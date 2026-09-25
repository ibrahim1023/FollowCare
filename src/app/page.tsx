"use client";

import Link from "next/link";
import { Users, ClipboardList, Stethoscope, CalendarClock } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getProtocol } from "@/lib/protocols";
import { SeverityBadge, StatusBadge } from "@/components/SeverityBadge";
import { PageHeader } from "@/components/PageHeader";

export default function DashboardPage() {
  const { state } = useApp();

  const activeAlerts = state.alerts.filter((a) => a.status !== "resolved");
  const nurseAlerts = activeAlerts.filter((a) => a.assignedRole === "NURSE");
  const doctorAlerts = activeAlerts.filter((a) => a.assignedRole === "DOCTOR");
  const activeFollowUps = state.patientProtocols.filter((p) => p.status === "active").length;
  const pendingAppointments = state.appointments.filter((a) => a.status === "OPTIONS_SENT" || a.status === "SUGGESTED").length;
  const stableCount = state.patients.filter((p) => p.status === "Stable" || p.status === "Completed").length;

  const attention = [...doctorAlerts, ...nurseAlerts].slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Care overview"
        subtitle="Patients who need follow-up today."
        aside={<span className="text-sm text-muted">Thursday, 12 Jun 2025</span>}
      />

      <div className="grid grid-cols-1 divide-y divide-line-soft rounded-lg border border-line bg-panel sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="flex items-center gap-4 px-5 py-4">
          <Users size={18} className="text-accent" aria-hidden />
          <div>
            <p className="text-2xl font-semibold text-ink">{activeFollowUps}</p>
            <p className="text-sm text-muted">Active follow-ups</p>
          </div>
        </div>
        <Link href="/nurse-queue" className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-panel-hover">
          <ClipboardList size={18} className="text-warning" aria-hidden />
          <div>
            <p className="text-2xl font-semibold text-ink">{nurseAlerts.length}</p>
            <p className="text-sm text-muted">Nurse review</p>
          </div>
        </Link>
        <Link href="/doctor-queue" className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-panel-hover">
          <Stethoscope size={18} className="text-danger" aria-hidden />
          <div>
            <p className="text-2xl font-semibold text-ink">{doctorAlerts.length}</p>
            <p className="text-sm text-muted">Doctor attention</p>
          </div>
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-lg border border-line bg-panel lg:col-span-2">
          <div className="border-b border-line px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink">Needs attention</h2>
          </div>
          {attention.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">
              No active alerts. All follow-ups are routine — queues fill automatically as replies arrive.
            </p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {attention.map((a) => {
                const patient = state.patients.find((p) => p.id === a.patientId);
                return (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-panel-hover">
                    <SeverityBadge severity={a.severity} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/patients/${a.patientId}`} className="text-sm font-semibold text-ink hover:text-accent">
                        {patient?.name}
                      </Link>
                      <p className="truncate text-[13px] text-muted">{a.summary.split("\n")[0]}</p>
                    </div>
                    <Link
                      href={a.assignedRole === "DOCTOR" ? "/doctor-queue" : "/nurse-queue"}
                      className="shrink-0 rounded-md border border-line bg-panel-raised px-3 py-1.5 text-xs font-medium text-body hover:text-accent"
                    >
                      {a.assignedRole === "DOCTOR" ? "Doctor queue" : "Nurse queue"}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-line bg-panel">
          <div className="border-b border-line px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink">Today</h2>
          </div>
          <dl className="divide-y divide-line-soft px-5">
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm text-body">Patients on plan</dt>
              <dd className="text-sm font-semibold text-ink">{state.patients.length}</dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm text-body">Stable or completed</dt>
              <dd className="text-sm font-semibold text-ink">{stableCount}</dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="flex items-center gap-1.5 text-sm text-body">
                <CalendarClock size={14} className="text-accent" aria-hidden /> Awaiting confirmation
              </dt>
              <dd className="text-sm font-semibold text-ink">{pendingAppointments}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-panel">
        <div className="border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink">All follow-ups</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                {["Patient", "Diagnosis", "Follow-up", "Status", "Next check-in", "Alert"].map((h) => (
                  <th key={h} className="px-5 py-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {state.patients.map((p) => {
                const pp = state.patientProtocols.find((x) => x.patientId === p.id);
                const visit = state.visits.find((v) => v.patientId === p.id);
                const patientAlerts = activeAlerts.filter((a) => a.patientId === p.id);
                const topSeverity = patientAlerts.some((a) => a.severity === "HIGH")
                  ? "HIGH"
                  : patientAlerts.some((a) => a.severity === "MEDIUM")
                    ? "MEDIUM"
                    : "LOW";
                return (
                  <tr key={p.id} className="hover:bg-panel-hover">
                    <td className="px-5 py-3">
                      <Link href={`/patients/${p.id}`} className="font-semibold text-ink hover:text-accent">
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted">Age {p.age} · {p.assignedDoctor}</p>
                    </td>
                    <td className="max-w-56 truncate px-5 py-3 text-body">{visit?.diagnosis ?? "—"}</td>
                    <td className="px-5 py-3 text-body">{pp ? getProtocol(pp.protocolId).name : "—"}</td>
                    <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-5 py-3 text-body">{pp?.nextCheckin ?? "—"}</td>
                    <td className="px-5 py-3">
                      {patientAlerts.length === 0 ? (
                        <span className="text-xs font-medium text-emerald-700">None</span>
                      ) : (
                        <SeverityBadge severity={topSeverity} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
