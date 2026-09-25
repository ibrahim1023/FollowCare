export type Role = "DOCTOR" | "NURSE" | "ADMIN";
export type Severity = "LOW" | "MEDIUM" | "HIGH";
export type QueueRoute = "NURSE" | "DOCTOR";

export type PatientStatus =
  | "Stable"
  | "Needs nurse review"
  | "Doctor review"
  | "Completed";

export interface Patient {
  id: string;
  name: string;
  age: number;
  phone: string;
  assignedDoctor: string;
  status: PatientStatus;
}

export interface Visit {
  id: string;
  patientId: string;
  date: string;
  diagnosis: string;
  treatment: string;
  notes: string;
}

export interface ProtocolRule {
  id: string;
  label: string;
  phrases: string[];
  severity: Severity;
}

export interface ProtocolStep {
  day: string;
  instruction: string;
}

export interface Protocol {
  id: string;
  name: string;
  type: string;
  steps: ProtocolStep[];
  rules: ProtocolRule[];
  redFlags: string[];
}

export type PatientProtocolStatus = "active" | "completed";

export interface PatientProtocol {
  id: string;
  patientId: string;
  protocolId: string;
  startDate: string;
  status: PatientProtocolStatus;
  nextCheckin: string;
}

export type ConversationSender = "PATIENT" | "AI_COORDINATOR" | "NURSE" | "DOCTOR" | "SYSTEM";
export type DeliveryStatus = "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED";

export interface ConversationMessage {
  id: string;
  role: "CLINIC" | "PATIENT";
  content: string;
  createdAt: string;
  sender?: ConversationSender;
  deliveryStatus?: DeliveryStatus;
}

export interface Checkin {
  id: string;
  patientId: string;
  protocolId: string;
  message: string;
  response: string;
  severity: Severity;
  conversation?: ConversationMessage[];
  matchedRules: string[];
  summary: string;
  symptoms: string[];
  createdAt: string;
}

export type AlertStatus =
  | "active"
  | "follow_up_sent"
  | "reviewed"
  | "contacted"
  | "resolved";

export interface Alert {
  id: string;
  patientId: string;
  checkinId: string;
  severity: Severity;
  assignedRole: QueueRoute;
  reason: string;
  status: AlertStatus;
  summary: string;
  message: string;
  matchedRules: string[];
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  closedBy?: string;
  closedAt?: string;
  finalMessageId?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: Role;
}

export type AppointmentStatus =
  | "SUGGESTED"
  | "OPTIONS_SENT"
  | "PATIENT_CONFIRMED"
  | "BOOKED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface Appointment {
  id: string;
  patientId: string;
  alertId?: string;
  type: "Routine review" | "Clinical review" | "Post-procedure review";
  clinician: string;
  proposedSlots: string[];
  selectedSlot?: string;
  status: AppointmentStatus;
  reason: string;
  createdAt: string;
}

export interface AppState {
  role: Role;
  patients: Patient[];
  visits: Visit[];
  patientProtocols: PatientProtocol[];
  checkins: Checkin[];
  alerts: Alert[];
  appointments: Appointment[];
}
