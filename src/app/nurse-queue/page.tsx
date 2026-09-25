"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, MessageSquare, ArrowUpRight, CalendarPlus, MessagesSquare, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { SeverityBadge } from "@/components/SeverityBadge";
import { PageHeader } from "@/components/PageHeader";
import { ConversationDrawer } from "@/components/ConversationDrawer";
import { Alert, Appointment } from "@/lib/types";

const DEFAULT_CLOSE_MESSAGE =
  "Thanks for completing today’s check-in. Your update has been reviewed by the care team. This conversation is now closed. If you have any new or worsening symptoms or other concerns, reply here or contact the clinic.";

const SLOT_OPTIONS = ["Today · 4:30 PM", "Tomorrow · 9:00 AM", "Tomorrow · 11:30 AM"];
const APPOINTMENT_TYPES: Appointment["type"][] = ["Routine review", "Clinical review", "Post-procedure review"];

type TabId = "action" | "routine" | "scheduling" | "closed";
type ModalKind = "message" | "close" | "appointment" | null;

export default function NurseQueuePage() {
  const {
    state,
    escalateToDoctor,
    sendNurseMessage,
    approveAndCloseAlert,
    suggestAppointment,
    confirmAppointment,
  } = useApp();
  const isDoctorView = state.role === "DOCTOR";

  const [tab, setTab] = useState<TabId | null>(null);
  const [modal, setModal] = useState<{ kind: ModalKind; alert: Alert | null }>({ kind: null, alert: null });
  const [drawerAlert, setDrawerAlert] = useState<Alert | null>(null);
  const [messageText, setMessageText] = useState("");
  const [closeText, setCloseText] = useState(DEFAULT_CLOSE_MESSAGE);
  const [apptType, setApptType] = useState<Appointment["type"]>("Routine review");
  const [apptClinician, setApptClinician] = useState("");
  const [apptReason, setApptReason] = useState("");
  const [apptSlots, setApptSlots] = useState<string[]>([...SLOT_OPTIONS]);

  const nurseAlerts = state.alerts.filter((a) => a.assignedRole === "NURSE");
  const actionRequired = nurseAlerts.filter((a) => a.severity === "MEDIUM" && a.status !== "resolved");
  const routine = nurseAlerts.filter((a) => a.severity === "LOW" && a.status !== "resolved");
  const closed = nurseAlerts.filter((a) => a.status === "resolved").slice(-5).reverse();
  const scheduling = state.appointments.filter((a) => a.status === "SUGGESTED" || a.status === "OPTIONS_SENT");

  const activeTab: TabId = tab ?? (actionRequired.length > 0 ? "action" : "routine");

  function patientOf(a: Alert) {
    return state.patients.find((p) => p.id === a.patientId);
  }
  function checkinOf(a: Alert) {
    return state.checkins.find((c) => c.id === a.checkinId);
  }

  function openModal(kind: Exclude<ModalKind, null>, alert: Alert) {
    setModal({ kind, alert });
    if (kind === "message") setMessageText("");
    if (kind === "close") setCloseText(DEFAULT_CLOSE_MESSAGE);
    if (kind === "appointment") {
      const patient = patientOf(alert);
      setApptType("Routine review");
      setApptClinician(patient?.assignedDoctor ?? "Dr. Layla Haddad");
      setApptReason("");
      setApptSlots([...SLOT_OPTIONS]);
    }
  }

  function closeModal() {
    setModal({ kind: null, alert: null });
  }

  function toggleSlot(slot: string) {
    setApptSlots((prev) => (prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]));
  }

  function renderAlertCard(a: Alert) {
    const patient = patientOf(a);
    const visit = state.visits.find((v) => v.patientId === a.patientId);
    const rail = a.severity === "MEDIUM" ? "bg-warning" : "bg-emerald-400";
    const awaitingAppointment = state.appointments.some((ap) => ap.alertId === a.id && ap.status === "OPTIONS_SENT");
    return (
      <li key={a.id} className="flex overflow-hidden rounded-lg border border-line bg-panel">
        <span className={`w-1 shrink-0 ${rail}`} aria-hidden />
        <div className="flex-1 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href={`/patients/${a.patientId}`} className="text-[15px] font-semibold text-ink hover:text-accent">
                {patient?.name}
              </Link>
              <p className="mt-0.5 text-xs text-muted">{visit?.diagnosis} · {a.createdAt}</p>
            </div>
            <div className="flex items-center gap-2">
              <SeverityBadge severity={a.severity} />
              {a.status === "follow_up_sent" && (
                <span className="rounded-md border border-line bg-panel-raised px-2 py-0.5 text-xs font-medium text-body">
                  Message sent
                </span>
              )}
            </div>
          </div>
          <blockquote className="mt-3 rounded-md border border-line-soft bg-panel-raised px-4 py-2.5 text-sm text-body">
            “{a.message}”
          </blockquote>
          <p className="mt-2 text-[13px] text-body">{a.reason}</p>
          <p className="mt-1 text-[13px] text-muted">
            {a.severity === "MEDIUM" ? "Recommended: nurse review and follow-up call." : "Recommended: review the reply, then close with a final message."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDrawerAlert(a)}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent hover:bg-accent-deep"
            >
              <MessagesSquare size={13} aria-hidden /> Review conversation
            </button>
            <details className="group relative">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-line bg-panel-raised px-3 py-1.5 text-xs font-semibold text-body hover:text-ink [&::-webkit-details-marker]:hidden">
                Actions
              </summary>
              <div className="absolute left-0 top-full z-20 mt-1 flex w-56 flex-col rounded-md border border-line bg-panel p-1.5 shadow-sm">
                <button
                  onClick={() => openModal("message", a)}
                  className="flex items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] text-body hover:bg-panel-hover hover:text-ink"
                >
                  <MessageSquare size={13} aria-hidden /> Send message
                </button>
                <button
                  onClick={() => openModal("appointment", a)}
                  className="flex items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] text-body hover:bg-panel-hover hover:text-ink"
                >
                  <CalendarPlus size={13} aria-hidden /> Suggest appointment
                </button>
                <button
                  onClick={() => openModal("close", a)}
                  disabled={awaitingAppointment}
                  className="flex items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] text-body hover:bg-panel-hover hover:text-ink disabled:cursor-not-allowed disabled:text-muted"
                >
                  <Check size={13} aria-hidden /> {awaitingAppointment ? "Awaiting appointment confirmation" : a.severity === "LOW" ? "Approve & close" : "Send final message & resolve"}
                </button>
                <button
                  onClick={() => escalateToDoctor(a.id)}
                  className="flex items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] text-danger hover:bg-danger/5"
                >
                  <ArrowUpRight size={13} aria-hidden /> Escalate to doctor
                </button>
              </div>
            </details>
          </div>
        </div>
      </li>
    );
  }

  const drawerPatient = drawerAlert ? patientOf(drawerAlert) : undefined;
  const drawerCheckin = drawerAlert ? checkinOf(drawerAlert) : undefined;
  const modalAlert = modal.alert;

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "action", label: "Action required", count: actionRequired.length },
    { id: "routine", label: "Routine review", count: routine.length },
    { id: "scheduling", label: "Scheduling", count: scheduling.length },
    { id: "closed", label: "Closed", count: closed.length },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nurse review"
        subtitle={
          isDoctorView
            ? "Replies waiting for nurse review. Viewing as doctor — nurse actions shown for demo."
            : "Replies waiting for nurse review."
        }
        aside={
          <span className="text-sm text-muted">{routine.length + actionRequired.length} open</span>
        }
      />

      <div className="flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={activeTab === t.id}
            className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 pb-2.5 pt-1 text-sm font-medium ${
              activeTab === t.id ? "text-accent" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
            <span className={`rounded-full px-1.5 text-[11px] font-semibold ${activeTab === t.id ? "text-accent" : "text-muted"}`}>
              {t.count}
            </span>
            {activeTab === t.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" aria-hidden />}
          </button>
        ))}
      </div>

      {activeTab === "action" &&
        (actionRequired.length === 0 ? (
          <p className="rounded-lg border border-line bg-panel px-4 py-8 text-center text-sm text-muted">No medium-severity items.</p>
        ) : (
          <ul className="space-y-3">{actionRequired.map(renderAlertCard)}</ul>
        ))}

      {activeTab === "routine" &&
        (routine.length === 0 ? (
          <p className="rounded-lg border border-line bg-panel px-4 py-8 text-center text-sm text-muted">
            No routine items. Low-severity replies land here for nurse confirmation.
          </p>
        ) : (
          <ul className="space-y-3">{routine.map(renderAlertCard)}</ul>
        ))}

      {activeTab === "scheduling" &&
        (scheduling.length === 0 ? (
          <p className="rounded-lg border border-line bg-panel px-4 py-8 text-center text-sm text-muted">Nothing waiting on scheduling.</p>
        ) : (
          <ul className="space-y-3">
            {scheduling.map((appt) => {
              const patient = state.patients.find((p) => p.id === appt.patientId);
              const linkedAlert = appt.alertId ? state.alerts.find((a) => a.id === appt.alertId) : undefined;
              return (
                <li key={appt.id} className="rounded-lg border border-line bg-panel p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {patient?.name} — {appt.type} with {appt.clinician}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {appt.status === "SUGGESTED"
                          ? `Doctor recommends appointment · ${appt.reason}`
                          : "Options sent · awaiting patient confirmation"}
                      </p>
                    </div>
                    {appt.status === "SUGGESTED" && linkedAlert && (
                      <button
                        onClick={() => openModal("appointment", linkedAlert)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent hover:bg-accent-deep"
                      >
                        <CalendarPlus size={13} aria-hidden /> Prepare & send slot options
                      </button>
                    )}
                  </div>
                  {appt.status === "OPTIONS_SENT" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {appt.proposedSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => confirmAppointment(appt.id, slot)}
                          className="rounded-md border border-line bg-panel-raised px-3 py-1.5 text-xs font-medium text-body hover:border-accent/40 hover:text-accent"
                        >
                          Simulate patient confirms {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ))}

      {activeTab === "closed" &&
        (closed.length === 0 ? (
          <p className="rounded-lg border border-line bg-panel px-4 py-8 text-center text-sm text-muted">Nothing closed yet.</p>
        ) : (
          <ul className="space-y-2">
            {closed.map((a) => {
              const patient = patientOf(a);
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-panel px-4 py-3">
                  <div className="min-w-0">
                    <Link href={`/patients/${a.patientId}`} className="text-sm font-semibold text-ink hover:text-accent">
                      {patient?.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {a.closedBy ? `Closed by ${a.closedBy}` : "Resolved"}
                      {a.closedAt ? ` · ${a.closedAt}` : ""}
                      {a.finalMessageId ? " · final message delivered" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setDrawerAlert(a)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel-raised px-3 py-1.5 text-xs font-semibold text-body hover:text-ink"
                  >
                    <MessagesSquare size={13} aria-hidden /> View conversation
                  </button>
                </li>
              );
            })}
          </ul>
        ))}

      {drawerAlert && drawerPatient && drawerCheckin && (
        <ConversationDrawer
          checkin={drawerCheckin}
          patient={drawerPatient}
          alert={drawerAlert}
          onClose={() => setDrawerAlert(null)}
        />
      )}

      {modalAlert && modal.kind === "message" && (
        <ActionModal title="Send message" subtitle={patientOf(modalAlert)?.name ?? ""} onClose={closeModal}>
          <label htmlFor="nurse-msg" className="mb-1.5 block text-xs font-semibold text-muted">Message to patient</label>
          <textarea
            id="nurse-msg"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={4}
            autoFocus
            placeholder="Type the nurse's message..."
            className="w-full resize-none rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent"
          />
          <button
            onClick={() => {
              sendNurseMessage(modalAlert.id, messageText);
              closeModal();
            }}
            disabled={!messageText.trim()}
            className="mt-3 w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-deep disabled:opacity-40"
          >
            Send message
          </button>
        </ActionModal>
      )}

      {modalAlert && modal.kind === "close" && (
        <ActionModal
          title={modalAlert.severity === "LOW" ? "Approve & close" : "Send final message & resolve"}
          subtitle={patientOf(modalAlert)?.name ?? ""}
          onClose={closeModal}
        >
          <label htmlFor="close-msg" className="mb-1.5 block text-xs font-semibold text-muted">Final message to patient</label>
          <textarea
            id="close-msg"
            value={closeText}
            onChange={(e) => setCloseText(e.target.value)}
            rows={5}
            autoFocus
            className="w-full resize-none rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-accent"
          />
          <button
            onClick={() => {
              approveAndCloseAlert(modalAlert.id, closeText);
              closeModal();
            }}
            disabled={!closeText.trim()}
            className="mt-3 w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-deep disabled:opacity-40"
          >
            Send final message & close
          </button>
        </ActionModal>
      )}

      {modalAlert && modal.kind === "appointment" && (
        <ActionModal title="Suggest appointment" subtitle={patientOf(modalAlert)?.name ?? ""} onClose={closeModal}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="appt-type" className="mb-1.5 block text-xs font-semibold text-muted">Type</label>
              <select
                id="appt-type"
                value={apptType}
                onChange={(e) => setApptType(e.target.value as Appointment["type"])}
                className="w-full rounded-md border border-line bg-panel px-2.5 py-2 text-sm text-ink focus:border-accent"
              >
                {APPOINTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="appt-clinician" className="mb-1.5 block text-xs font-semibold text-muted">Clinician</label>
              <select
                id="appt-clinician"
                value={apptClinician}
                onChange={(e) => setApptClinician(e.target.value)}
                className="w-full rounded-md border border-line bg-panel px-2.5 py-2 text-sm text-ink focus:border-accent"
              >
                {[...new Set([patientOf(modalAlert)?.assignedDoctor ?? "Dr. Layla Haddad", "Dr. Omar Sheikh", "Nurse Maya"])].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <label htmlFor="appt-reason" className="mb-1.5 mt-3 block text-xs font-semibold text-muted">Reason</label>
          <input
            id="appt-reason"
            value={apptReason}
            onChange={(e) => setApptReason(e.target.value)}
            placeholder="e.g. Persistent cough follow-up"
            className="w-full rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent"
          />
          <p className="mb-1.5 mt-3 text-xs font-semibold text-muted">Proposed slots</p>
          <div className="flex flex-wrap gap-2">
            {SLOT_OPTIONS.map((slot) => {
              const on = apptSlots.includes(slot);
              return (
                <button
                  key={slot}
                  onClick={() => toggleSlot(slot)}
                  aria-pressed={on}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                    on ? "border-accent/40 bg-accent-soft text-accent" : "border-line text-muted hover:text-body"
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              suggestAppointment(modalAlert.id, {
                type: apptType,
                clinician: apptClinician,
                proposedSlots: apptSlots,
                reason: apptReason.trim() || "Follow-up review",
              });
              closeModal();
            }}
            disabled={apptSlots.length === 0}
            className="mt-4 w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-deep disabled:opacity-40"
          >
            Send options to patient
          </button>
        </ActionModal>
      )}
    </div>
  );
}

function ActionModal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-line bg-panel p-5 shadow-sm">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>
            <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-md p-1 text-muted hover:bg-panel-hover hover:text-ink">
            <X size={16} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
