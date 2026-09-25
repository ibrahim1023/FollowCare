"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquarePlus, CalendarDays, Phone, UserRound, MessagesSquare } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getProtocol } from "@/lib/protocols";
import { SeverityBadge, StatusBadge } from "@/components/SeverityBadge";
import { SimulateReplyModal } from "@/components/SimulateReplyModal";
import { ConversationDrawer } from "@/components/ConversationDrawer";
import { Severity, Checkin, Appointment } from "@/lib/types";

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state } = useApp();
  const [simOpen, setSimOpen] = useState(false);
  const [drawerCheckin, setDrawerCheckin] = useState<Checkin | null>(null);

  const patient = state.patients.find((p) => p.id === id);
  if (!patient) {
    return (
      <div className="rounded-lg border border-line bg-panel p-10 text-center">
        <p className="text-sm text-muted">Patient not found.</p>
        <Link href="/patients" className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">
          Back to patients
        </Link>
      </div>
    );
  }

  const visit = state.visits.find((v) => v.patientId === patient.id);
  const pp = state.patientProtocols.find((x) => x.patientId === patient.id);
  const protocol = pp ? getProtocol(pp.protocolId) : null;
  const checkins = state.checkins.filter((c) => c.patientId === patient.id);
  const alerts = state.alerts.filter((a) => a.patientId === patient.id);
  const appointments = state.appointments.filter((a) => a.patientId === patient.id);
  const initials = patient.name.split(" ").map((n) => n[0]).slice(0, 2).join("");

  const timeline: { key: string; date: string; type: string; title: string; detail: string; severity?: Severity; checkin?: Checkin }[] = [
    ...(visit
      ? [{ key: `visit-${visit.id}`, date: visit.date, type: "Visit", title: visit.diagnosis, detail: `${visit.treatment} — ${visit.notes}` }]
      : []),
    ...(pp ? [{ key: `pp-${pp.id}`, date: pp.startDate, type: "Protocol", title: protocol?.name ?? "", detail: `Status: ${pp.status} · Next check-in: ${pp.nextCheckin}` }] : []),
    ...checkins.map((c) => {
      const lastReply = c.conversation
        ? [...c.conversation].reverse().find((m) => m.role === "PATIENT")?.content ?? c.response
        : c.response;
      return {
        key: c.id,
        date: c.createdAt,
        type: c.conversation ? `Check-in · ${c.conversation.length} message conversation` : "Check-in",
        title: `Reply: “${lastReply}”`,
        detail: c.summary,
        severity: c.severity as Severity,
        checkin: c,
      };
    }),
    ...alerts.map((a) => ({
      key: `alert-${a.id}`,
      date: a.createdAt,
      type: "Alert",
      title: `${a.assignedRole === "DOCTOR" ? "Doctor" : "Nurse"} alert · ${a.status.replace(/_/g, " ")}`,
      detail: a.reason,
      severity: a.severity as Severity,
    })),
  ];

  return (
    <div className="space-y-5">
      <Link href="/patients" className="mono-label inline-flex items-center gap-1.5 text-[10px] text-muted hover:text-ink">
        <ArrowLeft size={12} aria-hidden /> Patients
      </Link>

      <div className="rounded-lg border border-line bg-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-line bg-panel-raised text-sm font-bold text-accent" aria-hidden>
              {initials}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[22px] font-bold leading-tight tracking-tight text-ink">{patient.name}</h1>
                <StatusBadge status={patient.status} />
              </div>
              <div className="mono-label mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted">
                <span className="inline-flex items-center gap-1"><UserRound size={11} aria-hidden /> Age {patient.age}</span>
                <span className="inline-flex items-center gap-1"><Phone size={11} aria-hidden /> {patient.phone}</span>
                <span className="inline-flex items-center gap-1"><CalendarDays size={11} aria-hidden /> Last visit {visit?.date ?? "—"}</span>
              </div>
              <p className="mt-2.5 text-[13px] text-body">
                <span className="font-semibold text-ink">Diagnosis:</span> {visit?.diagnosis ?? "—"}
              </p>
              <p className="mt-1 text-[13px] text-body">
                <span className="font-semibold text-ink">Assigned doctor:</span> {patient.assignedDoctor}
              </p>
            </div>
          </div>
          {pp?.status === "active" && (
            <button
              onClick={() => setSimOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-canvas hover:bg-accent-deep"
            >
              <MessageSquarePlus size={15} aria-hidden /> Simulate Patient Reply
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="rounded-lg border border-line bg-panel p-5 lg:col-span-3">
          <p className="mono-label mb-4 text-[10px] text-muted">Recent history · execution trace</p>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted">No history yet.</p>
          ) : (
            <ol className="relative space-y-5 border-l border-line pl-5">
              {timeline.map((t) => (
                <li key={t.key} className="relative">
                  <span className="absolute -left-[23px] top-1.5 h-2 w-2 rounded-full bg-accent ring-4 ring-panel" aria-hidden />
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="mono-label text-[9px] text-muted">{t.date}</p>
                    <span className="mono-label rounded border border-line bg-panel-raised px-1.5 py-0.5 text-[9px] text-body">{t.type}</span>
                    {t.severity && <SeverityBadge severity={t.severity} />}
                  </div>
                  <p className="mt-1 text-[13px] font-semibold text-ink">{t.title}</p>
                  <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-muted">{t.detail}</p>
                  {t.checkin && (
                    <button
                      onClick={() => setDrawerCheckin(t.checkin!)}
                      className="mono-label mt-1.5 inline-flex items-center gap-1 rounded-md border border-line bg-panel-raised px-2 py-1 text-[9px] text-body hover:text-accent"
                    >
                      <MessagesSquare size={11} aria-hidden /> View conversation
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-lg border border-line bg-panel p-5 lg:col-span-2">
          <p className="mono-label mb-4 text-[10px] text-muted">Active care plan · runbook</p>
          {protocol && pp ? (
            <>
              <p className="text-sm font-semibold text-accent">{protocol.name}</p>
              <p className="mono-label mt-1 text-[9px] text-muted">
                Started {pp.startDate} · {pp.status === "completed" ? "Completed" : `Next: ${pp.nextCheckin}`}
              </p>
              <ul className="mt-4 space-y-2">
                {protocol.steps.map((s, i) => (
                  <li key={s.day} className="flex gap-3 rounded-md border border-line-soft bg-canvas p-3">
                    <span className="mono-label w-12 shrink-0 text-[10px] text-accent">{String(i + 1).padStart(2, "0")} · {s.day}</span>
                    <span className="text-[13px] text-body">{s.instruction}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <p className="mono-label text-[9px] text-muted">Red flags monitored</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {protocol.redFlags.map((f) => (
                    <span key={f} className="mono-label rounded border border-danger/30 bg-danger/10 px-2 py-0.5 text-[9px] text-danger">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">No active protocol for this patient.</p>
          )}
        </div>
      </div>

      {appointments.length > 0 && (
        <div className="rounded-lg border border-line bg-panel p-5">
          <p className="mono-label mb-3 text-[10px] text-muted">Appointments</p>
          <ul className="space-y-2">
            {appointments.map((a: Appointment) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line-soft bg-canvas px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-ink">{a.type} · {a.clinician}</p>
                  <p className="mono-label mt-0.5 text-[9px] text-muted">
                    {a.selectedSlot ? `Booked: ${a.selectedSlot}` : `Proposed: ${a.proposedSlots.join(" · ")}`} · {a.reason}
                  </p>
                </div>
                <span className={`mono-label rounded-md border px-2 py-0.5 text-[9px] ${
                  a.status === "BOOKED" || a.status === "PATIENT_CONFIRMED"
                    ? "border-accent/40 bg-accent-soft/40 text-accent"
                    : a.status === "OPTIONS_SENT"
                      ? "border-warning/40 bg-warning/10 text-warning"
                      : "border-line text-muted"
                }`}>
                  {a.status.replace(/_/g, " ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {simOpen && <SimulateReplyModal patient={patient} onClose={() => setSimOpen(false)} />}
      {drawerCheckin && (
        <ConversationDrawer
          checkin={drawerCheckin}
          patient={patient}
          alert={state.alerts.find((a) => a.checkinId === drawerCheckin.id)}
          onClose={() => setDrawerCheckin(null)}
        />
      )}
    </div>
  );
}
