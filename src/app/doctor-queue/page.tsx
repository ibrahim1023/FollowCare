"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, PhoneCall, Check, ShieldCheck, MessagesSquare } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { SeverityBadge } from "@/components/SeverityBadge";
import { PageHeader } from "@/components/PageHeader";
import { ConversationDrawer } from "@/components/ConversationDrawer";
import { Alert } from "@/lib/types";

export default function DoctorQueuePage() {
  const { state, reviewAlert, contactPatient, resolveAlert } = useApp();
  const isNurseView = state.role === "NURSE";
  const alerts = state.alerts.filter((a) => a.assignedRole === "DOCTOR" && a.status !== "resolved");
  const [drawerAlert, setDrawerAlert] = useState<Alert | null>(null);
  const drawerPatient = drawerAlert ? state.patients.find((p) => p.id === drawerAlert.patientId) : undefined;
  const drawerCheckin = drawerAlert ? state.checkins.find((c) => c.id === drawerAlert.checkinId) : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Escalation · Tier 2"
        title="Doctor Queue"
        subtitle={
          isNurseView
            ? "Only high-severity or nurse-escalated cases, with a concise clinical summary. Viewing as nurse — doctor actions shown for demo."
            : "Only high-severity or nurse-escalated cases, with a concise clinical summary."
        }
        aside={
          <span className="mono-label rounded-md border border-line bg-panel px-3 py-1.5 text-[10px] text-body">
            {alerts.length} open
          </span>
        }
      />

      {alerts.length === 0 ? (
        <div className="rounded-lg border border-line bg-panel p-10 text-center">
          <ShieldCheck size={28} className="mx-auto text-accent" aria-hidden />
          <p className="mt-3 font-semibold text-ink">No cases need the doctor</p>
          <p className="mt-1 text-sm text-muted">
            Red-flag replies and nurse escalations appear here — the doctor is only pulled in when necessary.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {alerts.map((a) => {
            const patient = state.patients.find((p) => p.id === a.patientId);
            const visit = state.visits.find((v) => v.patientId === a.patientId);
            return (
              <li key={a.id} className="flex overflow-hidden rounded-lg border border-line bg-panel">
                <span className="w-1 shrink-0 bg-danger" aria-hidden />
                <div className="flex-1 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={`/patients/${a.patientId}`} className="text-[15px] font-bold text-ink hover:text-accent">
                        {patient?.name}
                      </Link>
                      <p className="mono-label mt-1 text-[9px] text-muted">Age {patient?.age} · {a.createdAt}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={a.severity} />
                      {a.status === "reviewed" && (
                        <span className="mono-label rounded-md border border-line bg-panel-raised px-2 py-0.5 text-[10px] text-body">Reviewed</span>
                      )}
                      {a.status === "contacted" && (
                        <span className="mono-label rounded-md border border-accent/40 bg-accent-soft px-2 py-0.5 text-[10px] text-accent">Patient contacted</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-md border border-accent/25 bg-accent-soft/30 p-4">
                    <p className="mono-label text-[9px] text-accent">Clinical summary</p>
                    <p className="mt-1.5 whitespace-pre-line text-[13px] font-medium leading-relaxed text-ink">{a.summary}</p>
                  </div>

                  <dl className="mt-3 grid gap-3 text-[13px] sm:grid-cols-2">
                    <div>
                      <dt className="mono-label text-[9px] text-muted">Recent visit</dt>
                      <dd className="mt-0.5 text-body">{visit?.diagnosis} ({visit?.date})</dd>
                    </div>
                    <div>
                      <dt className="mono-label text-[9px] text-muted">Relevant history</dt>
                      <dd className="mt-0.5 text-body">{visit?.treatment}</dd>
                    </div>
                    <div>
                      <dt className="mono-label text-[9px] text-muted">Detected red flags</dt>
                      <dd className="mt-1 flex flex-wrap gap-1.5">
                        {a.matchedRules.map((r) => (
                          <span key={r} className="mono-label rounded border border-danger/30 bg-danger/10 px-2 py-0.5 text-[9px] text-danger">{r}</span>
                        ))}
                      </dd>
                    </div>
                    <div>
                      <dt className="mono-label text-[9px] text-muted">Escalation reason</dt>
                      <dd className="mt-0.5 text-body">{a.reason}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="mono-label text-[9px] text-muted">Latest message</dt>
                      <dd className="mt-1 rounded-md border border-line-soft bg-canvas px-3 py-2 text-body">“{a.message}”</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {state.checkins.some((c) => c.id === a.checkinId) && (
                      <button
                        onClick={() => setDrawerAlert(a)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel-raised px-3 py-1.5 text-xs font-semibold text-body hover:text-ink"
                      >
                        <MessagesSquare size={13} aria-hidden /> View conversation
                      </button>
                    )}
                    <button
                      onClick={() => reviewAlert(a.id)}
                      disabled={a.status === "reviewed" || a.status === "contacted"}
                      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel-raised px-3 py-1.5 text-xs font-semibold text-body hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Eye size={13} aria-hidden /> Review
                    </button>
                    <button
                      onClick={() => contactPatient(a.id)}
                      disabled={a.status === "contacted"}
                      className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-canvas hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <PhoneCall size={13} aria-hidden /> Contact patient
                    </button>
                    <button
                      onClick={() => resolveAlert(a.id)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10"
                    >
                      <Check size={13} aria-hidden /> Resolved
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {drawerAlert && drawerPatient && drawerCheckin && (
        <ConversationDrawer
          checkin={drawerCheckin}
          patient={drawerPatient}
          alert={drawerAlert}
          onClose={() => setDrawerAlert(null)}
        />
      )}
    </div>
  );
}
