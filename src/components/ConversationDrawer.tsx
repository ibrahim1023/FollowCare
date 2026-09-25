"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { Checkin, Patient, Alert, ConversationMessage } from "@/lib/types";
import { synthesizeTranscript } from "@/lib/conversation";
import { SeverityBadge } from "./SeverityBadge";

let drawerId = 0;
function drawerMsgId() {
  drawerId += 1;
  return `dm-${drawerId}`;
}

const DELIVERY_DOT: Record<string, string> = {
  QUEUED: "bg-muted",
  SENT: "bg-body",
  DELIVERED: "bg-accent",
  READ: "bg-accent",
  FAILED: "bg-danger",
};

function senderLabel(m: ConversationMessage, patient: Patient): string {
  if (m.sender === "PATIENT" || m.role === "PATIENT") return patient.name.split(" ")[0];
  if (m.sender === "NURSE") return "Nurse";
  if (m.sender === "DOCTOR") return "Doctor";
  if (m.sender === "SYSTEM") return "System";
  return "Clinic";
}

export function ConversationDrawer({ checkin, patient, alert, onClose }: { checkin: Checkin; patient: Patient; alert?: Alert; onClose: () => void }) {
  const messages = useMemo(() => synthesizeTranscript(checkin, drawerMsgId), [checkin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-canvas/80"
      role="dialog"
      aria-modal="true"
      aria-label={`Conversation transcript for ${patient.name}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-full max-w-xl flex-col border-l border-line bg-panel-raised">
        <div className="flex items-start justify-between border-b border-line px-5 py-3.5">
          <div>
            <p className="mono-label text-[10px] text-accent">Conversation transcript</p>
            <h2 className="mt-1 text-base font-bold tracking-tight text-ink">{patient.name}</h2>
            <p className="mono-label mt-0.5 text-[9px] text-muted">
              {checkin.createdAt} · {messages.length} messages
            </p>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-md p-1 text-muted hover:bg-panel-hover hover:text-ink">
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="border-b border-line-soft px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={checkin.severity} />
            {checkin.matchedRules.map((r) => (
              <span key={r} className="mono-label rounded border border-line bg-panel px-2 py-0.5 text-[9px] text-ink">{r}</span>
            ))}
          </div>
          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-muted">{checkin.summary}</p>
          {alert && (alert.reviewedBy || alert.closedBy) && (
            <p className="mono-label mt-2 text-[9px] text-muted">
              {alert.reviewedBy && `Reviewed by ${alert.reviewedBy}${alert.reviewedAt ? ` · ${alert.reviewedAt}` : ""}`}
              {alert.closedBy && ` · Closed by ${alert.closedBy}${alert.closedAt ? ` · ${alert.closedAt}` : ""}`}
            </p>
          )}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-canvas px-5 py-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "PATIENT" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3.5 py-2 text-[13px] leading-relaxed ${
                  m.role === "PATIENT"
                    ? "border border-accent/30 bg-accent-soft/50 text-ink"
                    : "border border-line bg-panel-raised text-body"
                }`}
              >
                <p className="whitespace-pre-line">{m.content}</p>
                <p className={`mono-label mt-1 flex items-center gap-1.5 text-[8px] ${m.role === "PATIENT" ? "text-accent/70" : "text-muted"}`}>
                  <span>{senderLabel(m, patient)}</span>
                  <span>·</span>
                  <span>{m.createdAt}</span>
                  {m.deliveryStatus && (
                    <>
                      <span>·</span>
                      <span className={`inline-block h-1 w-1 rounded-full ${DELIVERY_DOT[m.deliveryStatus] ?? "bg-muted"}`} aria-hidden />
                      <span>{m.deliveryStatus.toLowerCase()}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-line px-5 py-3">
          <p className="mono-label text-[9px] text-muted">Read-only transcript · simulated delivery states</p>
        </div>
      </div>
    </div>
  );
}
