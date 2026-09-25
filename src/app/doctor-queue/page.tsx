"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, CalendarPlus, ShieldCheck, MessagesSquare, ThumbsUp, ThumbsDown, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { SeverityBadge } from "@/components/SeverityBadge";
import { PageHeader } from "@/components/PageHeader";
import { ConversationDrawer } from "@/components/ConversationDrawer";
import { Alert } from "@/lib/types";

const DEFAULT_REASON = "Clinical follow-up recommended after doctor review.";

export default function DoctorQueuePage() {
  const { state, reviewAlert, setDoctorAttention, recommendAppointment } = useApp();
  const isNurseView = state.role === "NURSE";
  const alerts = state.alerts.filter((a) => a.assignedRole === "DOCTOR" && a.status !== "resolved");
  const resolved = state.alerts.filter((a) => a.assignedRole === "DOCTOR" && a.status === "resolved").slice(-5).reverse();
  const [drawerAlert, setDrawerAlert] = useState<Alert | null>(null);
  const [apptAlert, setApptAlert] = useState<Alert | null>(null);
  const [reason, setReason] = useState(DEFAULT_REASON);

  const drawerPatient = drawerAlert ? state.patients.find((p) => p.id === drawerAlert.patientId) : undefined;
  const drawerCheckin = drawerAlert ? state.checkins.find((c) => c.id === drawerAlert.checkinId) : undefined;

  useEffect(() => {
    if (!apptAlert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setApptAlert(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [apptAlert]);

  function suggestedFor(alertId: string) {
    return state.appointments.some(
      (a) => a.alertId === alertId && ["SUGGESTED", "OPTIONS_SENT", "BOOKED"].includes(a.status)
    );
  }

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
            const suggested = suggestedFor(a.id);
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
                      {a.doctorAttention === "NEEDS_ATTENTION" && (
                        <span className="mono-label rounded-md border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] text-warning">Needs attention</span>
                      )}
                      {a.status === "reviewed" && a.doctorAttention !== "NEEDS_ATTENTION" && (
                        <span className="mono-label rounded-md border border-line bg-panel-raised px-2 py-0.5 text-[10px] text-body">Reviewed</span>
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
                    {a.doctorRecommendation && (
                      <div className="sm:col-span-2">
                        <dt className="mono-label text-[9px] text-muted">Doctor recommendation</dt>
                        <dd className="mt-0.5 text-body">{a.doctorRecommendation}</dd>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <dt className="mono-label text-[9px] text-muted">Latest message</dt>
                      <dd className="mt-1 rounded-md border border-line-soft bg-canvas px-3 py-2 text-body">“{a.message}”</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {state.checkins.some((c) => c.id === a.checkinId) && (
                      <button
                        onClick={() => {
                          reviewAlert(a.id);
                          setDrawerAlert(a);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel-raised px-3 py-1.5 text-xs font-semibold text-body hover:text-ink"
                      >
                        <Eye size={13} aria-hidden /> Review case
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setApptAlert(a);
                        setReason(DEFAULT_REASON);
                      }}
                      disabled={suggested}
                      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel-raised px-3 py-1.5 text-xs font-semibold text-body hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CalendarPlus size={13} aria-hidden /> {suggested ? "Appointment suggested" : "Suggest appointment"}
                    </button>
                    <button
                      onClick={() => setDoctorAttention(a.id, true)}
                      aria-pressed={a.doctorAttention === "NEEDS_ATTENTION"}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                        a.doctorAttention === "NEEDS_ATTENTION"
                          ? "bg-warning/90 text-canvas"
                          : "border border-warning/40 text-warning hover:bg-warning/10"
                      }`}
                    >
                      <ThumbsUp size={13} aria-hidden /> Needs attention
                    </button>
                    <button
                      onClick={() => setDoctorAttention(a.id, false)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:text-body"
                    >
                      <ThumbsDown size={13} aria-hidden /> Doesn’t need attention
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {resolved.length > 0 && (
        <section>
          <p className="mono-label mb-2 text-[10px] text-muted">Recently resolved · last {resolved.length}</p>
          <ul className="space-y-2">
            {resolved.map((a) => {
              const patient = state.patients.find((p) => p.id === a.patientId);
              const checkin = state.checkins.find((c) => c.id === a.checkinId);
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-panel px-4 py-3">
                  <div className="min-w-0">
                    <Link href={`/patients/${a.patientId}`} className="text-[13px] font-semibold text-ink hover:text-accent">
                      {patient?.name}
                    </Link>
                    <p className="mono-label mt-0.5 text-[9px] text-muted">
                      {a.doctorAttention === "NO_ATTENTION_NEEDED" ? "No attention needed" : "Resolved"}
                      {a.closedBy ? ` · ${a.closedBy}` : ""}
                      {a.closedAt ? ` · ${a.closedAt}` : ""}
                    </p>
                  </div>
                  {checkin && (
                    <button
                      onClick={() => setDrawerAlert(a)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel-raised px-3 py-1.5 text-xs font-semibold text-body hover:text-ink"
                    >
                      <MessagesSquare size={13} aria-hidden /> View conversation
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {drawerAlert && drawerPatient && drawerCheckin && (
        <ConversationDrawer
          checkin={drawerCheckin}
          patient={drawerPatient}
          alert={drawerAlert}
          onClose={() => setDrawerAlert(null)}
        />
      )}

      {apptAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Suggest appointment"
          onClick={(e) => {
            if (e.target === e.currentTarget) setApptAlert(null);
          }}
        >
          <div className="w-full max-w-md rounded-lg border border-line bg-panel-raised p-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-ink">Suggest appointment</h3>
                <p className="mono-label mt-0.5 text-[9px] text-muted">
                  {state.patients.find((p) => p.id === apptAlert.patientId)?.name} · nurse schedules the slots
                </p>
              </div>
              <button onClick={() => setApptAlert(null)} aria-label="Close dialog" className="rounded-md p-1 text-muted hover:bg-panel-hover hover:text-ink">
                <X size={16} aria-hidden />
              </button>
            </div>
            <label htmlFor="appt-reason" className="mono-label mb-1.5 block text-[9px] text-muted">Recommendation reason</label>
            <textarea
              id="appt-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              autoFocus
              className="w-full resize-none rounded-md border border-line bg-canvas px-3 py-2 text-[13px] text-ink focus:border-accent"
            />
            <button
              onClick={() => {
                recommendAppointment(apptAlert.id, reason);
                setApptAlert(null);
              }}
              disabled={!reason.trim()}
              className="mt-3 w-full rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-canvas hover:bg-accent-deep disabled:opacity-40"
            >
              Send recommendation to Nurse Queue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
