"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { AppState, Checkin, Alert, Role, PatientStatus, ConversationMessage, Appointment } from "@/lib/types";
import { buildSeedState } from "@/lib/seed";
import { triageMessage, triageConversation, extractSymptomsFallback } from "@/lib/triage";
import { getProtocol } from "@/lib/protocols";
import { buildFallbackSummary } from "@/lib/summary";
import { synthesizeTranscript } from "@/lib/conversation";

const STORAGE_KEY = "followcare-state-v2";
const LEGACY_STORAGE_KEYS = ["clinic-care-state-v2", "clinic-care-state-v1"];
const NURSE_NAME = "Nurse Maya";

export interface SimulateResult {
  checkin: Checkin;
  alert: Alert;
  severity: Checkin["severity"];
  route: Alert["assignedRole"];
  matchedRules: string[];
  reason: string;
  summary: string;
  symptoms: string[];
}

interface AppContextValue {
  state: AppState;
  hydrated: boolean;
  setRole: (role: Role) => void;
  simulateReply: (
    patientId: string,
    message: string,
    conversation?: ConversationMessage[]
  ) => Promise<SimulateResult>;
  resolveAlert: (alertId: string) => void;
  escalateToDoctor: (alertId: string) => void;
  reviewAlert: (alertId: string) => void;
  setDoctorAttention: (alertId: string, needsAttention: boolean) => void;
  recommendAppointment: (alertId: string, reason: string) => void;
  sendNurseMessage: (alertId: string, content: string) => void;
  approveAndCloseAlert: (alertId: string, finalMessage: string) => void;
  suggestAppointment: (alertId: string, input: {
    type: Appointment["type"];
    clinician: string;
    proposedSlots: string[];
    reason: string;
  }) => void;
  confirmAppointment: (appointmentId: string, selectedSlot: string) => void;
  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-sim-${Date.now().toString(36)}-${idCounter}`;
}

function deriveStatus(hasActiveNurse: boolean, hasActiveDoctor: boolean, completed: boolean): PatientStatus {
  if (completed) return "Completed";
  if (hasActiveDoctor) return "Doctor review";
  if (hasActiveNurse) return "Needs nurse review";
  return "Stable";
}

function refreshPatientStatuses(state: AppState): AppState {
  const patients = state.patients.map((p) => {
    const active = state.alerts.filter((a) => a.patientId === p.id && a.status !== "resolved");
    const protocol = state.patientProtocols.find((pp) => pp.patientId === p.id);
    const status = deriveStatus(
      active.some((a) => a.assignedRole === "NURSE"),
      active.some((a) => a.assignedRole === "DOCTOR"),
      protocol?.status === "completed"
    );
    return { ...p, status };
  });
  return { ...state, patients };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(buildSeedState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY) ?? LEGACY_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
        if (raw) {
          const parsed = JSON.parse(raw) as AppState;
          if (parsed && Array.isArray(parsed.patients)) {
            setState({
              ...buildSeedState(),
              ...parsed,
              appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
            });
          }
        }
      } catch {
      }
      setHydrated(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
    }
  }, [state, hydrated]);

  const setRole = useCallback((role: Role) => {
    setState((s) => ({ ...s, role }));
  }, []);

  const simulateReply = useCallback(async (patientId: string, message: string, conversation?: ConversationMessage[]): Promise<SimulateResult> => {
    const snapshot = state;
    const patient = snapshot.patients.find((p) => p.id === patientId);
    if (!patient) throw new Error("Patient not found");
    const pp = snapshot.patientProtocols.find((x) => x.patientId === patientId);
    const protocol = getProtocol(pp?.protocolId ?? "post-procedure");
    const lastVisit = snapshot.visits.find((v) => v.patientId === patientId);
    const previousCheckin = [...snapshot.checkins]
      .reverse()
      .find((c) => c.patientId === patientId);

    const triage = conversation
      ? triageConversation(
          conversation.filter((m) => m.role === "PATIENT").map((m) => m.content),
          protocol.id
        )
      : triageMessage(message, protocol.id);

    let symptoms: string[] = [];
    let summary = "";
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          patient: {
            name: patient.name,
            diagnosis: lastVisit?.diagnosis ?? "",
            treatment: lastVisit?.treatment ?? "",
            lastVisit: lastVisit?.date ?? "",
          },
          previousStatus: previousCheckin?.summary,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { symptoms?: unknown; summary?: unknown; source?: unknown };
        if (Array.isArray(data.symptoms)) symptoms = data.symptoms.filter((s): s is string => typeof s === "string");
        if (data.source === "groq" && typeof data.summary === "string") summary = data.summary;
      }
    } catch {
    }

    if (symptoms.length === 0) symptoms = extractSymptomsFallback(message);
    if (!summary) {
      summary = buildFallbackSummary({
        patient: {
          name: patient.name,
          diagnosis: lastVisit?.diagnosis ?? "",
          treatment: lastVisit?.treatment ?? "",
          lastVisit: lastVisit?.date ?? "",
        },
        previousStatus: previousCheckin?.summary,
        message,
        symptoms,
        severity: triage.severity,
        route: triage.route,
      });
    }

    const checkin: Checkin = {
      id: nextId("c"),
      patientId,
      protocolId: protocol.id,
      message: `Follow-up check-in (${protocol.name})`,
      response: message,
      severity: triage.severity,
      matchedRules: triage.matchedRules,
      summary,
      symptoms,
      createdAt: "12 Jun 2025",
      ...(conversation ? { conversation } : {}),
    };
    const alert: Alert = {
      id: nextId("a"),
      patientId,
      checkinId: checkin.id,
      severity: triage.severity,
      assignedRole: triage.route,
      reason: triage.reason,
      status: "active",
      summary,
      message,
      matchedRules: triage.matchedRules,
      createdAt: "12 Jun 2025",
    };

    setState((s) => refreshPatientStatuses({ ...s, checkins: [...s.checkins, checkin], alerts: [...s.alerts, alert] }));

    return {
      checkin,
      alert,
      severity: triage.severity,
      route: triage.route,
      matchedRules: triage.matchedRules,
      reason: triage.reason,
      summary,
      symptoms,
    };
  }, [state]);

  const updateAlert = useCallback((alertId: string, patch: Partial<Alert>) => {
    setState((s) =>
      refreshPatientStatuses({
        ...s,
        alerts: s.alerts.map((a) => (a.id === alertId ? { ...a, ...patch } : a)),
      })
    );
  }, []);

  const resolveAlert = useCallback((alertId: string) => updateAlert(alertId, { status: "resolved" }), [updateAlert]);
  const reviewAlert = useCallback((alertId: string) => {
    setState((s) => {
      const alert = s.alerts.find((a) => a.id === alertId);
      const reviewer = s.patients.find((p) => p.id === alert?.patientId)?.assignedDoctor ?? "Doctor";
      return refreshPatientStatuses({
        ...s,
        alerts: s.alerts.map((a) =>
          a.id === alertId
            ? { ...a, status: "reviewed", reviewedBy: reviewer, reviewedAt: "12 Jun 2025 · 10:05 GST" }
            : a
        ),
      });
    });
  }, []);

  const appendToCheckin = useCallback((s: AppState, alertId: string, newMessages: ConversationMessage[]): { state: AppState; checkinId?: string } => {
    const alert = s.alerts.find((a) => a.id === alertId);
    if (!alert) return { state: s };
    const checkins = s.checkins.map((c) => {
      if (c.id !== alert.checkinId) return c;
      const base = synthesizeTranscript(c, () => nextId("m"));
      return { ...c, conversation: [...base, ...newMessages] };
    });
    return { state: { ...s, checkins }, checkinId: alert.checkinId };
  }, []);

  const sendNurseMessage = useCallback((alertId: string, content: string) => {
    const text = content.trim();
    if (!text) return;
    setState((s) => {
      const msg: ConversationMessage = {
        id: nextId("m"),
        role: "CLINIC",
        sender: "NURSE",
        deliveryStatus: "DELIVERED",
        content: text,
        createdAt: "12 Jun 2025 · 10:05 GST",
      };
      const { state: withMsg, checkinId } = appendToCheckin(s, alertId, [msg]);
      if (!checkinId) return s;
      return refreshPatientStatuses({
        ...withMsg,
        alerts: withMsg.alerts.map((a) =>
          a.id === alertId
            ? { ...a, status: "follow_up_sent", reviewedBy: NURSE_NAME, reviewedAt: "12 Jun 2025 · 10:05 GST" }
            : a
        ),
      });
    });
  }, [appendToCheckin]);

  const approveAndCloseAlert = useCallback((alertId: string, finalMessage: string) => {
    const text = finalMessage.trim();
    if (!text) return;
    setState((s) => {
      if (s.appointments.some((a) => a.alertId === alertId && a.status === "OPTIONS_SENT")) return s;
      const msg: ConversationMessage = {
        id: nextId("m"),
        role: "CLINIC",
        sender: "NURSE",
        deliveryStatus: "DELIVERED",
        content: text,
        createdAt: "12 Jun 2025 · 10:08 GST",
      };
      const { state: withMsg, checkinId } = appendToCheckin(s, alertId, [msg]);
      if (!checkinId) return s;
      return refreshPatientStatuses({
        ...withMsg,
        alerts: withMsg.alerts.map((a) =>
          a.id === alertId
            ? {
                ...a,
                status: "resolved",
                reviewedBy: NURSE_NAME,
                reviewedAt: "12 Jun 2025 · 10:08 GST",
                closedBy: NURSE_NAME,
                closedAt: "12 Jun 2025 · 10:08 GST",
                finalMessageId: msg.id,
              }
            : a
        ),
      });
    });
  }, [appendToCheckin]);

  const suggestAppointment = useCallback((alertId: string, input: {
    type: Appointment["type"];
    clinician: string;
    proposedSlots: string[];
    reason: string;
  }) => {
    if (input.proposedSlots.length === 0) return;
    setState((s) => {
      const alert = s.alerts.find((a) => a.id === alertId);
      if (!alert) return s;
      const suggested = s.appointments.find((a) => a.alertId === alertId && a.status === "SUGGESTED");
      const appointment: Appointment = {
        id: nextId("appt"),
        patientId: alert.patientId,
        alertId,
        type: input.type,
        clinician: input.clinician,
        proposedSlots: input.proposedSlots,
        status: "OPTIONS_SENT",
        reason: input.reason,
        createdAt: "12 Jun 2025 · 10:10 GST",
      };
      const msg: ConversationMessage = {
        id: nextId("m"),
        role: "CLINIC",
        sender: "NURSE",
        deliveryStatus: "DELIVERED",
        content: `We’d like to offer you a ${input.type.toLowerCase()} with ${input.clinician}. Proposed times: ${input.proposedSlots.join(" · ")}. Please let us know which suits you.`,
        createdAt: "12 Jun 2025 · 10:10 GST",
      };
      const appointments = suggested
        ? s.appointments.map((a) =>
            a.id === suggested.id
              ? { ...a, type: input.type, clinician: input.clinician, proposedSlots: input.proposedSlots, reason: input.reason, status: "OPTIONS_SENT" as const }
              : a
          )
        : [...s.appointments, appointment];
      const { state: withMsg, checkinId } = appendToCheckin({ ...s, appointments }, alertId, [msg]);
      if (!checkinId) return s;
      return refreshPatientStatuses({
        ...withMsg,
        alerts: withMsg.alerts.map((a) =>
          a.id === alertId
            ? { ...a, status: "follow_up_sent", reviewedBy: NURSE_NAME, reviewedAt: "12 Jun 2025 · 10:10 GST" }
            : a
        ),
      });
    });
  }, [appendToCheckin]);

  const confirmAppointment = useCallback((appointmentId: string, selectedSlot: string) => {
    setState((s) => {
      const appt = s.appointments.find((a) => a.id === appointmentId);
      if (!appt || !appt.proposedSlots.includes(selectedSlot)) return s;
      const updated = { ...appt, selectedSlot, status: "BOOKED" as const };
      const msgs: ConversationMessage[] = [
        {
          id: nextId("m"),
          role: "PATIENT",
          sender: "PATIENT",
          deliveryStatus: "READ",
          content: `I confirm ${selectedSlot}.`,
          createdAt: "12 Jun 2025 · 10:20 GST",
        },
        {
          id: nextId("m"),
          role: "CLINIC",
          sender: "SYSTEM",
          deliveryStatus: "DELIVERED",
          content: `Appointment booked: ${appt.type} with ${appt.clinician} on ${selectedSlot}.`,
          createdAt: "12 Jun 2025 · 10:20 GST",
        },
        {
          id: nextId("m"),
          role: "CLINIC",
          sender: "NURSE",
          deliveryStatus: "DELIVERED",
          content: `Confirmed — see you on ${selectedSlot}.`,
          createdAt: "12 Jun 2025 · 10:21 GST",
        },
      ];
      let next: AppState = { ...s, appointments: s.appointments.map((a) => (a.id === appointmentId ? updated : a)) };
      if (appt.alertId) {
        const { state: withMsgs } = appendToCheckin(next, appt.alertId, msgs);
        next = withMsgs;
      }
      return next;
    });
  }, [appendToCheckin]);

  const setDoctorAttention = useCallback((alertId: string, needsAttention: boolean) => {
    setState((s) => {
      const alert = s.alerts.find((a) => a.id === alertId);
      if (!alert) return s;
      const doctor = s.patients.find((p) => p.id === alert.patientId)?.assignedDoctor ?? "Doctor";
      return refreshPatientStatuses({
        ...s,
        alerts: s.alerts.map((a) =>
          a.id === alertId
            ? needsAttention
              ? {
                  ...a,
                  status: "reviewed",
                  doctorAttention: "NEEDS_ATTENTION",
                  reviewedBy: doctor,
                  reviewedAt: "12 Jun 2025 · 10:05 GST",
                }
              : {
                  ...a,
                  status: "resolved",
                  doctorAttention: "NO_ATTENTION_NEEDED",
                  reviewedBy: doctor,
                  reviewedAt: "12 Jun 2025 · 10:05 GST",
                  closedBy: doctor,
                  closedAt: "12 Jun 2025 · 10:05 GST",
                }
            : a
        ),
      });
    });
  }, []);

  const recommendAppointment = useCallback((alertId: string, reason: string) => {
    const text = reason.trim();
    if (!text) return;
    setState((s) => {
      const alert = s.alerts.find((a) => a.id === alertId);
      if (!alert) return s;
      const patient = s.patients.find((p) => p.id === alert.patientId);
      const doctor = patient?.assignedDoctor ?? "Doctor";
      const existing = s.appointments.find(
        (a) => a.alertId === alertId && ["SUGGESTED", "OPTIONS_SENT", "BOOKED"].includes(a.status)
      );
      const appointments = existing
        ? s.appointments
        : [
            ...s.appointments,
            {
              id: nextId("appt"),
              patientId: alert.patientId,
              alertId,
              type: "Clinical review",
              clinician: doctor,
              proposedSlots: [],
              status: "SUGGESTED",
              reason: text,
              createdAt: "12 Jun 2025 · 10:08 GST",
            } satisfies Appointment,
          ];
      const msg: ConversationMessage = {
        id: nextId("m"),
        role: "CLINIC",
        sender: "SYSTEM",
        content: `Internal doctor recommendation: schedule a clinical review. Reason: ${text}`,
        createdAt: "12 Jun 2025 · 10:08 GST",
      };
      const { state: withMsg, checkinId } = appendToCheckin({ ...s, appointments }, alertId, [msg]);
      if (!checkinId) return s;
      return refreshPatientStatuses({
        ...withMsg,
        alerts: withMsg.alerts.map((a) =>
          a.id === alertId
            ? {
                ...a,
                doctorAttention: "NEEDS_ATTENTION",
                doctorRecommendation: text,
                status: "reviewed",
                reviewedBy: doctor,
                reviewedAt: "12 Jun 2025 · 10:08 GST",
              }
            : a
        ),
      });
    });
  }, [appendToCheckin]);
  const escalateToDoctor = useCallback(
    (alertId: string) =>
      setState((s) =>
        refreshPatientStatuses({
          ...s,
          alerts: s.alerts.map((a) =>
            a.id === alertId
              ? {
                  ...a,
                  assignedRole: "DOCTOR",
                  severity: "HIGH",
                  reason: `Escalated by nurse. ${a.reason}`,
                  status: "active",
                }
              : a
          ),
        })
      ),
    []
  );

  const resetDemo = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    } catch {
    }
    setState(buildSeedState());
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      hydrated,
      setRole,
      simulateReply,
      resolveAlert,
      escalateToDoctor,
      reviewAlert,
      setDoctorAttention,
      recommendAppointment,
      sendNurseMessage,
      approveAndCloseAlert,
      suggestAppointment,
      confirmAppointment,
      resetDemo,
    }),
    [state, hydrated, setRole, simulateReply, resolveAlert, escalateToDoctor, reviewAlert, setDoctorAttention, recommendAppointment, sendNurseMessage, approveAndCloseAlert, suggestAppointment, confirmAppointment, resetDemo]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
