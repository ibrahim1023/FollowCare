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
        title="Doctor review"
        subtitle={
          isNurseView
            ? "High-severity and nurse-escalated cases with a concise clinical summary. Viewing as nurse — doctor actions shown for demo."
            : "High-severity and nurse-escalated cases with a concise clinical summary."
        }
        aside={<span className="text-sm text-muted">{alerts.length} open</span>}
      />

      {alerts.length === 0 ? (
        <div className="rounded-lg border border-line bg-panel p-10 text-center">
          <ShieldCheck size={28} className="mx-auto text-emerald-500" aria-hidden />
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
                      <Link href={`/patients/${a.patientId}`} className="text-[15px] font-semibold text-ink hover:text-accent">
                        {patient?.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">Age {patient?.age} · {a.createdAt}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={a.severity} />
                      {a.doctorAttention === "NEEDS_ATTENTION" && (
                        <span className="rounded-md border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">Needs attention</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 rounded-md border border-accent/30 bg-accent-soft/60 p-4">
                    <p className="text-xs font-semibold text-accent-deep">Clinical summary</p>
                    <p className="mt-1.5 whitespace-pre-line text-sm font-medium leading-relaxed text-ink">{a.summary}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
                    <p className="text-body"><span className="font-medium text-ink">Recent visit:</span> {visit?.diagnosis} ({visit?.date})</p>
                    <p className="flex flex-wrap items-center gap-1.5 text-body">
                      <span className="font-medium text-ink">Red flags:</span>
                      {a.matchedRules.map((r) => (
                        <span key={r} className="rounded border border-danger/30 bg-danger/5 px-1.5 py-0.5 text-xs font-medium text-danger">{r}</span>
                      ))}
                    </p>
                  </div>
                  {a.doctorRecommendation && (
                    <p className="mt-2 text-[13px] text-body">
                      <span className="font-medium text-ink">Doctor recommendation:</span> {a.doctorRecommendation}
                    </p>
                  )}

                  <details className="mt-3">
                    <summary className="cursor-pointer list-none text-xs font-medium text-accent hover:underline [&::-webkit-details-marker]:hidden">
                      Patient message & context
                    </summary>
                    <dl className="mt-2 grid gap-2 rounded-md border border-line-soft bg-panel-raised p-3 text-[13px] sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-medium text-muted">Latest message</dt>
                        <dd className="mt-0.5 text-body">“{a.message}”</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted">Relevant history</dt>
                        <dd className="mt-0.5 text-body">{visit?.treatment}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-muted">Escalation reason</dt>
                        <dd className="mt-0.5 text-body">{a.reason}</dd>
                      </div>
                    </dl>
                  </details>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {state.checkins.some((c) => c.id === a.checkinId) && (
                      <button
                        onClick={() => {
                          reviewAlert(a.id);
                          setDrawerAlert(a);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent hover:bg-accent-deep"
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
                    <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden />
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted">Doctor decision:</span>
                      <button
                        onClick={() => setDoctorAttention(a.id, true)}
                        aria-pressed={a.doctorAttention === "NEEDS_ATTENTION"}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                          a.doctorAttention === "NEEDS_ATTENTION"
                            ? "bg-warning/90 text-on-accent"
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
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {resolved.length > 0 && (
        <details className="rounded-lg border border-line bg-panel">
          <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
            Recently resolved · {resolved.length}
          </summary>
          <ul className="divide-y divide-line-soft border-t border-line">
            {resolved.map((a) => {
              const patient = state.patients.find((p) => p.id === a.patientId);
              const checkin = state.checkins.find((c) => c.id === a.checkinId);
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/patients/${a.patientId}`} className="text-sm font-semibold text-ink hover:text-accent">
                      {patient?.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
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
        </details>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Suggest appointment"
          onClick={(e) => {
            if (e.target === e.currentTarget) setApptAlert(null);
          }}
        >
          <div className="w-full max-w-md rounded-lg border border-line bg-panel p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-ink">Suggest appointment</h3>
                <p className="mt-0.5 text-xs text-muted">
                  {state.patients.find((p) => p.id === apptAlert.patientId)?.name} · the nurse schedules the slots
                </p>
              </div>
              <button onClick={() => setApptAlert(null)} aria-label="Close dialog" className="rounded-md p-1 text-muted hover:bg-panel-hover hover:text-ink">
                <X size={16} aria-hidden />
              </button>
            </div>
            <label htmlFor="appt-reason" className="mb-1.5 block text-xs font-semibold text-muted">Recommendation reason</label>
            <textarea
              id="appt-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              autoFocus
              className="w-full resize-none rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-accent"
            />
            <button
              onClick={() => {
                recommendAppointment(apptAlert.id, reason);
                setApptAlert(null);
              }}
              disabled={!reason.trim()}
              className="mt-3 w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-deep disabled:opacity-40"
            >
              Send recommendation to Nurse Queue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
