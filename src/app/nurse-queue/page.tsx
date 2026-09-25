"use client";

import { useState } from "react";
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

  const [modal, setModal] = useState<{ kind: ModalKind; alert: Alert | null }>({ kind: null, alert: null });
  const [drawerAlert, setDrawerAlert] = useState<Alert | null>(null);
  const [messageText, setMessageText] = useState("");
  const [closeText, setCloseText] = useState(DEFAULT_CLOSE_MESSAGE);
  const [apptType, setApptType] = useState<Appointment["type"]>("Routine review");
  const [apptClinician, setApptClinician] = useState("");
  const [apptReason, setApptReason] = useState("");
  const [apptSlots, setApptSlots] = useState<string[]>([...SLOT_OPTIONS]);

  const nurseAlerts = state.alerts.filter((a) => a.assignedRole === "NURSE");
  const routine = nurseAlerts.filter((a) => a.severity === "LOW" && a.status !== "resolved");
  const actionRequired = nurseAlerts.filter((a) => a.severity === "MEDIUM" && a.status !== "resolved");
  const closed = nurseAlerts.filter((a) => a.status === "resolved").slice(-5).reverse();
  const scheduling = state.appointments.filter((a) => a.status === "OPTIONS_SENT");

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
    const awaitingAppointment = state.appointments.some((appointment) => appointment.alertId === a.id && appointment.status === "OPTIONS_SENT");
    const rail = a.severity === "MEDIUM" ? "bg-warning" : "bg-accent";
    return (
      <li key={a.id} className="flex overflow-hidden rounded-lg border border-line bg-panel">
        <span className={`w-1 shrink-0 ${rail}`} aria-hidden />
        <div className="flex-1 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href={`/patients/${a.patientId}`} className="text-[15px] font-bold text-ink hover:text-accent">
                {patient?.name}
              </Link>
              <p className="mono-label mt-1 text-[9px] text-muted">{visit?.diagnosis} · {a.createdAt}</p>
            </div>
            <div className="flex items-center gap-2">
              <SeverityBadge severity={a.severity} />
              {a.status === "follow_up_sent" && (
                <span className="mono-label rounded-md border border-line bg-panel-raised px-2 py-0.5 text-[10px] text-body">
                  Message sent
                </span>
              )}
            </div>
          </div>
          <blockquote className="mt-3 rounded-md border border-line-soft bg-canvas px-4 py-2.5 text-[13px] text-body">
            “{a.message}”
          </blockquote>
          <dl className="mt-3 grid gap-3 text-[13px] sm:grid-cols-2">
            <div>
              <dt className="mono-label text-[9px] text-muted">Detected reason</dt>
              <dd className="mt-0.5 text-body">{a.reason}</dd>
            </div>
            <div>
              <dt className="mono-label text-[9px] text-muted">Recommended action</dt>
              <dd className="mt-0.5 text-body">
                {a.severity === "MEDIUM" ? "Nurse review and follow-up call" : "Routine follow-up; review then close"}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setDrawerAlert(a)}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel-raised px-3 py-1.5 text-xs font-semibold text-body hover:text-ink"
            >
              <MessagesSquare size={13} aria-hidden /> View conversation
            </button>
            <button
              onClick={() => openModal("message", a)}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel-raised px-3 py-1.5 text-xs font-semibold text-body hover:text-ink"
            >
              <MessageSquare size={13} aria-hidden /> Send message
            </button>
            <button
              onClick={() => openModal("appointment", a)}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel-raised px-3 py-1.5 text-xs font-semibold text-body hover:text-ink"
            >
              <CalendarPlus size={13} aria-hidden /> Suggest appointment
            </button>
            <button
              onClick={() => openModal("close", a)}
              disabled={awaitingAppointment}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-canvas hover:bg-accent-deep disabled:cursor-not-allowed disabled:bg-panel-raised disabled:text-muted"
            >
              <Check size={13} aria-hidden /> {awaitingAppointment ? "Awaiting appointment confirmation" : a.severity === "LOW" ? "Approve & close" : "Send final message & resolve"}
            </button>
            <button
              onClick={() => escalateToDoctor(a.id)}
              className="inline-flex items-center gap-1.5 rounded-md border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10"
            >
              <ArrowUpRight size={13} aria-hidden /> Escalate to doctor
            </button>
          </div>
        </div>
      </li>
    );
  }

  const drawerPatient = drawerAlert ? patientOf(drawerAlert) : undefined;
  const drawerCheckin = drawerAlert ? checkinOf(drawerAlert) : undefined;
  const modalAlert = modal.alert;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Intake · Tier 1"
        title="Nurse Queue"
        subtitle={
          isDoctorView
            ? "Responses needing review, without immediate doctor attention. Viewing as doctor — nurse actions shown for demo."
            : "Responses needing review, without immediate doctor attention."
        }
        aside={
          <span className="mono-label rounded-md border border-line bg-panel px-3 py-1.5 text-[10px] text-body">
            {routine.length + actionRequired.length} open · {closed.length} closed
          </span>
        }
      />

      <section>
        <p className="mono-label mb-2 flex items-center gap-2 text-[10px] text-danger">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden /> Action required · {actionRequired.length}
        </p>
        {actionRequired.length === 0 ? (
          <p className="rounded-lg border border-line bg-panel px-4 py-6 text-center text-sm text-muted">No medium-severity items.</p>
        ) : (
          <ul className="space-y-3">{actionRequired.map(renderAlertCard)}</ul>
        )}
      </section>

      <section>
        <p className="mono-label mb-2 flex items-center gap-2 text-[10px] text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden /> Routine review · {routine.length}
        </p>
        {routine.length === 0 ? (
          <p className="rounded-lg border border-line bg-panel px-4 py-6 text-center text-sm text-muted">
            No routine items. LOW-severity replies land here for nurse confirmation.
          </p>
        ) : (
          <ul className="space-y-3">{routine.map(renderAlertCard)}</ul>
        )}
      </section>

      {scheduling.length > 0 && (
        <section>
          <p className="mono-label mb-2 flex items-center gap-2 text-[10px] text-body">
            <CalendarPlus size={12} className="text-accent" aria-hidden /> Scheduling required · {scheduling.length}
          </p>
          <ul className="space-y-2">
            {scheduling.map((appt) => {
              const patient = state.patients.find((p) => p.id === appt.patientId);
              return (
                <li key={appt.id} className="rounded-lg border border-line bg-panel p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-semibold text-ink">
                        {patient?.name} — {appt.type} with {appt.clinician}
                      </p>
                      <p className="mono-label mt-0.5 text-[9px] text-muted">Options sent · awaiting patient confirmation</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {appt.proposedSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => confirmAppointment(appt.id, slot)}
                        className="mono-label rounded-md border border-line bg-panel-raised px-3 py-1.5 text-[10px] text-body hover:border-accent/40 hover:text-accent"
                      >
                        Simulate patient confirms {slot}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {closed.length > 0 && (
        <section>
          <p className="mono-label mb-2 text-[10px] text-muted">Recently closed · last {closed.length}</p>
          <ul className="space-y-2">
            {closed.map((a) => {
              const patient = patientOf(a);
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-panel px-4 py-3">
                  <div className="min-w-0">
                    <Link href={`/patients/${a.patientId}`} className="text-[13px] font-semibold text-ink hover:text-accent">
                      {patient?.name}
                    </Link>
                    <p className="mono-label mt-0.5 text-[9px] text-muted">
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

      {modalAlert && modal.kind === "message" && (
        <ActionModal title="Send message" subtitle={patientOf(modalAlert)?.name ?? ""} onClose={closeModal}>
          <label htmlFor="nurse-msg" className="mono-label mb-1.5 block text-[9px] text-muted">Message to patient</label>
          <textarea
            id="nurse-msg"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={4}
            autoFocus
            placeholder="Type the nurse's message..."
            className="w-full resize-none rounded-md border border-line bg-canvas px-3 py-2 text-[13px] text-ink placeholder:text-muted focus:border-accent"
          />
          <button
            onClick={() => {
              sendNurseMessage(modalAlert.id, messageText);
              closeModal();
            }}
            disabled={!messageText.trim()}
            className="mt-3 w-full rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-canvas hover:bg-accent-deep disabled:opacity-40"
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
          <label htmlFor="close-msg" className="mono-label mb-1.5 block text-[9px] text-muted">Final message to patient</label>
          <textarea
            id="close-msg"
            value={closeText}
            onChange={(e) => setCloseText(e.target.value)}
            rows={5}
            autoFocus
            className="w-full resize-none rounded-md border border-line bg-canvas px-3 py-2 text-[13px] text-ink focus:border-accent"
          />
          <button
            onClick={() => {
              approveAndCloseAlert(modalAlert.id, closeText);
              closeModal();
            }}
            disabled={!closeText.trim()}
            className="mt-3 w-full rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-canvas hover:bg-accent-deep disabled:opacity-40"
          >
            Send final message & close
          </button>
        </ActionModal>
      )}

      {modalAlert && modal.kind === "appointment" && (
        <ActionModal title="Suggest appointment" subtitle={patientOf(modalAlert)?.name ?? ""} onClose={closeModal}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="appt-type" className="mono-label mb-1.5 block text-[9px] text-muted">Type</label>
              <select
                id="appt-type"
                value={apptType}
                onChange={(e) => setApptType(e.target.value as Appointment["type"])}
                className="w-full rounded-md border border-line bg-canvas px-2.5 py-2 text-[13px] text-ink focus:border-accent"
              >
                {APPOINTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="appt-clinician" className="mono-label mb-1.5 block text-[9px] text-muted">Clinician</label>
              <select
                id="appt-clinician"
                value={apptClinician}
                onChange={(e) => setApptClinician(e.target.value)}
                className="w-full rounded-md border border-line bg-canvas px-2.5 py-2 text-[13px] text-ink focus:border-accent"
              >
                {[...new Set([patientOf(modalAlert)?.assignedDoctor ?? "Dr. Layla Haddad", "Dr. Omar Sheikh", "Nurse Maya"])].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <label htmlFor="appt-reason" className="mono-label mb-1.5 mt-3 block text-[9px] text-muted">Reason</label>
          <input
            id="appt-reason"
            value={apptReason}
            onChange={(e) => setApptReason(e.target.value)}
            placeholder="e.g. Persistent cough follow-up"
            className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-[13px] text-ink placeholder:text-muted focus:border-accent"
          />
          <p className="mono-label mb-1.5 mt-3 text-[9px] text-muted">Proposed slots</p>
          <div className="flex flex-wrap gap-2">
            {SLOT_OPTIONS.map((slot) => {
              const on = apptSlots.includes(slot);
              return (
                <button
                  key={slot}
                  onClick={() => toggleSlot(slot)}
                  aria-pressed={on}
                  className={`mono-label rounded-md border px-3 py-1.5 text-[10px] ${
                    on ? "border-accent/40 bg-accent-soft/40 text-accent" : "border-line text-muted hover:text-body"
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
            className="mt-4 w-full rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-canvas hover:bg-accent-deep disabled:opacity-40"
          >
            Send options to patient
          </button>
        </ActionModal>
      )}
    </div>
  );
}

function ActionModal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-line bg-panel-raised p-5">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-ink">{title}</h3>
            <p className="mono-label mt-0.5 text-[9px] text-muted">{subtitle}</p>
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
