"use client";

import Link from "next/link";
import { Users, ClipboardList, Stethoscope, AlertTriangle, ArrowRight, Cpu, ShieldCheck, PhoneCall, Inbox, CalendarClock } from "lucide-react";
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
  const needsAttention = new Set(activeAlerts.map((a) => a.patientId)).size;
  const checkinCount = state.checkins.length;
  const pendingAppointments = state.appointments.filter((a) => a.status === "OPTIONS_SENT").length;

  const metrics = [
    { index: "01", label: "Active follow-ups", value: activeFollowUps, icon: Users, tone: "text-accent", foot: `${activeFollowUps} protocols running` },
    { index: "02", label: "Nurse alerts", value: nurseAlerts.length, icon: ClipboardList, tone: "text-warning", foot: `${nurseAlerts.length} awaiting review` },
    { index: "03", label: "Doctor alerts", value: doctorAlerts.length, icon: Stethoscope, tone: "text-danger", foot: `${doctorAlerts.length} red-flag case${doctorAlerts.length === 1 ? "" : "s"}` },
    { index: "04", label: "Patients needing attention", value: needsAttention, icon: AlertTriangle, tone: "text-danger", foot: "Across active plans" },
    { index: "05", label: "Appointments awaiting confirmation", value: pendingAppointments, icon: CalendarClock, tone: "text-warning", foot: `${pendingAppointments} slot option${pendingAppointments === 1 ? "" : "s"} sent` },
  ];

  const flow = [
    { label: "Check-in sent", value: checkinCount, icon: Inbox },
    { label: "Rule engine", value: activeAlerts.length, icon: Cpu },
    { label: "Nurse review", value: nurseAlerts.length, icon: ClipboardList },
    { label: "Doctor escalation", value: doctorAlerts.length, icon: PhoneCall },
  ];

  const attention = [...doctorAlerts, ...nurseAlerts].slice(0, 6);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Care operations"
        title="Follow-up control center"
        subtitle="Deterministic triage watches the gap between visits and escalates only what matters."
        aside={
          <span className="mono-label rounded-md border border-line bg-panel px-3 py-1.5 text-[10px] text-body">
            12 JUN 2025 · 09:42 GST
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {metrics.map(({ index, label, value, icon: Icon, tone, foot }) => (
          <div key={label} className="rounded-lg border border-line bg-panel p-4">
            <div className="flex items-center justify-between">
              <span className="mono-label text-[10px] text-muted">{index}</span>
              <Icon size={15} className={tone} aria-hidden />
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-ink">{value}</p>
            <p className="mt-1 text-[13px] font-medium text-body">{label}</p>
            <p className="mono-label mt-2.5 border-t border-line-soft pt-2 text-[9px] text-muted">{foot}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-panel p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="mono-label text-[10px] text-muted">Care orchestration</p>
            <p className="mt-1 text-sm font-semibold text-ink">Deterministic routing pipeline</p>
          </div>
          <span className="mono-label flex items-center gap-1.5 rounded-md border border-line bg-panel-raised px-2.5 py-1 text-[9px] text-accent">
            <ShieldCheck size={11} aria-hidden /> Rule-based · no LLM triage
          </span>
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-stretch">
          {flow.map((step, i) => (
            <div key={step.label} className="contents">
              <div className="flex items-center gap-3 rounded-md border border-line-soft bg-canvas px-3 py-2.5">
                <step.icon size={14} className={i === 3 ? "text-danger" : "text-accent"} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="mono-label truncate text-[9px] text-muted">{step.label}</p>
                  <p className="text-lg font-bold leading-tight text-ink">{step.value}</p>
                </div>
              </div>
              {i < flow.length - 1 && (
                <div className="hidden items-center md:flex" aria-hidden>
                  <span className="h-px w-4 bg-line" />
                  <ArrowRight size={12} className="text-muted" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="mono-label text-[10px] text-muted">Needs attention now</p>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
              <span className="mono-label text-[9px] text-accent">Live</span>
            </span>
          </div>
          <p className="mono-label text-[9px] text-muted">{activeAlerts.length} open</p>
        </div>
        {attention.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            No active alerts. All follow-ups are routine — queues fill automatically as replies arrive.
          </p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {attention.map((a) => {
              const patient = state.patients.find((p) => p.id === a.patientId);
              return (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-panel-hover">
                  <SeverityBadge severity={a.severity} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/patients/${a.patientId}`} className="text-[13px] font-semibold text-ink hover:text-accent">
                      {patient?.name}
                    </Link>
                    <p className="truncate text-xs text-muted">{a.summary.split("\n")[0]}</p>
                  </div>
                  <span className="mono-label hidden text-[9px] text-muted sm:block">{a.createdAt}</span>
                  <Link
                    href={a.assignedRole === "DOCTOR" ? "/doctor-queue" : "/nurse-queue"}
                    className="mono-label shrink-0 rounded-md border border-line bg-panel-raised px-2.5 py-1 text-[9px] text-body hover:border-accent/40 hover:text-accent"
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
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="mono-label text-[10px] text-muted">Patient follow-up list</p>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
            <span className="mono-label text-[9px] text-accent">Live</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line bg-panel-raised">
                {["Patient", "Diagnosis / visit reason", "Protocol", "Status", "Next check-in", "Alert"].map((h) => (
                  <th key={h} className="mono-label px-4 py-2.5 text-[10px] font-semibold text-muted">{h}</th>
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
                    <td className="px-4 py-2.5">
                      <Link href={`/patients/${p.id}`} className="font-semibold text-ink hover:text-accent">
                        {p.name}
                      </Link>
                      <p className="mono-label text-[9px] text-muted">Age {p.age}</p>
                    </td>
                    <td className="max-w-56 truncate px-4 py-2.5 text-body">{visit?.diagnosis ?? "—"}</td>
                    <td className="px-4 py-2.5 text-body">{pp ? getProtocol(pp.protocolId).name : "—"}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-2.5 text-body">{pp?.nextCheckin ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      {patientAlerts.length === 0 ? (
                        <span className="mono-label text-[10px] text-accent">None</span>
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
