"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Send, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useApp, SimulateResult } from "@/context/AppContext";
import { Patient, ConversationMessage } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { triageConversation, TriageResult } from "@/lib/triage";
import { getConversationConfig, getFallbackFollowUp, repeatsClinicQuestion } from "@/lib/conversation";
import { getProtocol } from "@/lib/protocols";

const HANDOFF: Record<"MEDIUM" | "HIGH", string> = {
  MEDIUM: "Thank you for the update. I’m handing this conversation to the care coordinator for review. They’ll follow up with you directly.",
  HIGH: "Thank you for telling us. I’m alerting the clinical team now so they can review your symptoms and contact you directly.",
};

const MAX_TURNS_MESSAGE = "Thank you. I have enough information for the care team to review this check-in.";

const TONE_STYLES = {
  stable: "text-accent hover:border-accent/40 hover:bg-accent-soft/40",
  review: "text-warning hover:border-warning/40 hover:bg-warning/10",
  urgent: "text-danger hover:border-danger/40 hover:bg-danger/10",
} as const;

const RESULT_HEADING: Record<string, string> = {
  LOW: "Awaiting nurse confirmation",
  MEDIUM: "Routed for nurse action",
  HIGH: "Escalated to doctor",
};

let msgCounter = 0;
function msgId() {
  msgCounter += 1;
  return `m-${Date.now().toString(36)}-${msgCounter}`;
}

function makeMsg(role: "CLINIC" | "PATIENT", sender: ConversationMessage["sender"], deliveryStatus: ConversationMessage["deliveryStatus"], content: string): ConversationMessage {
  return { id: msgId(), role, sender, deliveryStatus, content, createdAt: "12 Jun 2025 · 09:44 GST" };
}

export function SimulateReplyModal({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { state, simulateReply } = useApp();
  const pp = state.patientProtocols.find((x) => x.patientId === patient.id);
  const protocol = getProtocol(pp?.protocolId ?? "post-procedure");
  const visit = state.visits.find((v) => v.patientId === patient.id);
  const ctx = { patientName: patient.name, diagnosis: visit?.diagnosis ?? "" };
  const config = useMemo(
    () => getConversationConfig(protocol.id, { patientName: patient.name, diagnosis: visit?.diagnosis ?? "" }),
    [protocol.id, patient.name, visit?.diagnosis]
  );

  const opening: ConversationMessage = useMemo(
    () => makeMsg("CLINIC", "AI_COORDINATOR", "DELIVERED", config.openingMessage),
    [config]
  );

  const [messages, setMessages] = useState<ConversationMessage[]>([opening]);
  const [draft, setDraft] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const finalizingRef = useRef(false);

  useEffect(() => {
    composerRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, waiting]);

  function reset() {
    finalizingRef.current = false;
    setMessages([makeMsg("CLINIC", "AI_COORDINATOR", "DELIVERED", config.openingMessage)]);
    setDraft("");
    setWaiting(false);
    setSaving(false);
    setLocked(false);
    setResult(null);
    setError(null);
    setTriage(null);
  }

  async function finalize(transcript: ConversationMessage[]) {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    setLocked(true);
    setSaving(true);
    setError(null);
    const turns = transcript.filter((m) => m.role === "PATIENT").map((m) => m.content);
    try {
      const res = await simulateReply(patient.id, turns.join("\n"), transcript);
      setResult(res);
    } catch {
      setError("Something went wrong while saving the conversation. Please close and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    const text = draft.trim();
    if (!text || waiting || locked || result || finalizingRef.current) return;
    const patientMsg = makeMsg("PATIENT", "PATIENT", "READ", text);
    const nextMessages = [...messages, patientMsg];
    setMessages(nextMessages);
    setDraft("");
    setError(null);

    const turns = nextMessages.filter((m) => m.role === "PATIENT").map((m) => m.content);
    const t = triageConversation(turns, protocol.id);
    setTriage(t);

    if (t.severity !== "LOW") {
      const withHandoff = [...nextMessages, makeMsg("CLINIC", "SYSTEM", "DELIVERED", HANDOFF[t.severity])];
      setMessages(withHandoff);
      await finalize(withHandoff);
      return;
    }

    if (turns.length >= 3) {
      const closing = [...nextMessages, makeMsg("CLINIC", "SYSTEM", "DELIVERED", MAX_TURNS_MESSAGE)];
      setMessages(closing);
      await finalize(closing);
      return;
    }

    setWaiting(true);
    try {
      const res = await fetch("/api/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient: { name: patient.name, diagnosis: visit?.diagnosis ?? "", treatment: visit?.treatment ?? "" },
          protocol: { id: protocol.id, name: protocol.name, redFlags: protocol.redFlags },
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          deterministicTriage: { severity: t.severity, matchedRules: t.matchedRules },
        }),
      });
      let reply = getFallbackFollowUp(protocol.id, ctx, nextMessages);
      let informationComplete = false;
      if (res.ok) {
        const data = (await res.json()) as { reply?: unknown; informationComplete?: unknown };
        if (typeof data.reply === "string" && data.reply.trim()) reply = data.reply.trim();
        if (data.informationComplete === true) informationComplete = true;
      }
      const repeated = repeatsClinicQuestion(reply, nextMessages);
      const withReply = [...nextMessages, makeMsg("CLINIC", "AI_COORDINATOR", "DELIVERED", reply)];
      setMessages(withReply);
      if (informationComplete || repeated) {
        await finalize(withReply);
      }
    } catch {
      const fallback = getFallbackFollowUp(protocol.id, ctx, nextMessages);
      const withReply = [...nextMessages, makeMsg("CLINIC", "AI_COORDINATOR", "DELIVERED", fallback)];
      setMessages(withReply);
      if (turns.length >= 2) await finalize(withReply);
    } finally {
      setWaiting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Simulated follow-up conversation with ${patient.name}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-line bg-panel-raised">
        <div className="flex items-start justify-between border-b border-line px-5 py-3.5">
          <div>
            <p className="mono-label text-[10px] text-accent">Simulated patient follow-up</p>
            <h2 className="mt-1 text-base font-bold tracking-tight text-ink">{patient.name}</h2>
            <p className="mono-label mt-0.5 text-[9px] text-muted">{protocol.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="mono-label flex items-center gap-1.5 rounded-md border border-line bg-panel px-2 py-1 text-[9px] text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden /> Groq assisted
            </span>
            <button onClick={onClose} aria-label="Close dialog" className="rounded-md p-1 text-muted hover:bg-panel-hover hover:text-ink">
              <X size={18} aria-hidden />
            </button>
          </div>
        </div>

        {result ? (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-center gap-2">
              {result.severity === "HIGH" ? (
                <AlertTriangle size={18} className="text-danger" aria-hidden />
              ) : (
                <CheckCircle2 size={18} className="text-accent" aria-hidden />
              )}
              <h3 className="text-sm font-bold text-ink">{RESULT_HEADING[result.severity] ?? "Conversation saved"}</h3>
            </div>
            {result.severity === "LOW" && (
              <p className="mt-2 text-[13px] text-muted">
                A nurse will review the conversation and send the final message before closing it.
              </p>
            )}
            <div className={`mt-3 flex items-center justify-between rounded-md border px-3 py-2.5 ${
              result.severity === "HIGH" ? "border-danger/30 bg-danger/10" : "border-line bg-canvas"
            }`}>
              <SeverityBadge severity={result.severity} />
              <span className="mono-label text-[10px] text-ink">
                → {result.route === "DOCTOR" ? "Doctor queue" : "Nurse queue"}
              </span>
            </div>
            <dl className="mt-3 space-y-2.5 text-[13px]">
              <div className="rounded-md border border-line-soft bg-canvas px-3 py-2">
                <dt className="mono-label text-[9px] text-muted">Matched rules</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {result.matchedRules.length === 0 ? (
                    <span className="text-muted">None — routine follow-up</span>
                  ) : (
                    result.matchedRules.map((r) => (
                      <span key={r} className="mono-label rounded border border-line bg-panel px-2 py-0.5 text-[9px] text-ink">{r}</span>
                    ))
                  )}
                </dd>
              </div>
              <div className="rounded-md border border-line-soft bg-canvas px-3 py-2">
                <dt className="mono-label text-[9px] text-muted">Reason</dt>
                <dd className="mt-1 text-body">{result.reason}</dd>
              </div>
              <div className="rounded-md border border-line-soft bg-canvas px-3 py-2">
                <dt className="mono-label text-[9px] text-muted">Clinical summary</dt>
                <dd className="mt-1 whitespace-pre-line text-body">{result.summary}</dd>
              </div>
            </dl>
            <div className="mt-4 flex gap-2">
              <button
                onClick={reset}
                className="flex-1 rounded-md border border-line bg-panel px-4 py-2 text-[13px] font-semibold text-body hover:text-ink"
              >
                Start new conversation
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent hover:bg-accent-deep"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-canvas px-5 py-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "PATIENT" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-lg px-3.5 py-2 text-[13px] leading-relaxed ${
                      m.role === "PATIENT"
                        ? "border border-accent/30 bg-accent-soft/50 text-ink"
                        : "border border-line bg-panel text-body"
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.content}</p>
                    <p className={`mono-label mt-1 flex items-center gap-1.5 text-[8px] ${m.role === "PATIENT" ? "text-accent/70" : "text-muted"}`}>
                      <span>{m.sender === "PATIENT" ? patient.name.split(" ")[0] : m.sender === "NURSE" ? "Nurse" : m.sender === "SYSTEM" ? "System" : "Clinic"}</span>
                      <span>·</span>
                      <span>{m.createdAt}</span>
                      {m.deliveryStatus && <><span>·</span><span>{m.deliveryStatus.toLowerCase()}</span></>}
                    </p>
                  </div>
                </div>
              ))}
              {waiting && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-lg border border-line bg-panel-raised px-3.5 py-2.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" aria-hidden />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted [animation-delay:150ms]" aria-hidden />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted [animation-delay:300ms]" aria-hidden />
                    <span className="mono-label ml-1 text-[8px] text-muted">Clinic typing</span>
                  </div>
                </div>
              )}
              {saving && (
                <div className="flex justify-start">
                  <div className="mono-label flex items-center gap-1.5 rounded-lg border border-line bg-panel-raised px-3.5 py-2 text-[9px] text-accent">
                    <Loader2 size={11} className="animate-spin" aria-hidden /> Saving conversation…
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-line-soft px-5 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mono-label text-[8px] text-muted">Internal triage · not sent to patient</span>
                {triage ? (
                  <>
                    <SeverityBadge severity={triage.severity} />
                    <span className="mono-label text-[9px] text-body">→ {triage.route === "DOCTOR" ? "Doctor queue" : "Nurse queue"}</span>
                    {triage.matchedRules.length > 0 && (
                      <span className="mono-label text-[9px] text-muted">{triage.matchedRules.join(" · ")}</span>
                    )}
                  </>
                ) : (
                  <span className="mono-label text-[9px] text-muted">Awaiting first reply</span>
                )}
              </div>
            </div>

            {!locked && (
              <div className="flex flex-wrap gap-1.5 px-5 pt-2">
                {config.suggestions.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setDraft(s.message)}
                    className={`mono-label rounded-md border border-line px-2.5 py-1.5 text-[10px] ${TONE_STYLES[s.tone]}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 px-5 pb-3 pt-2.5">
              <label htmlFor="composer" className="sr-only">Patient reply</label>
              <textarea
                id="composer"
                ref={composerRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={2}
                disabled={locked || waiting}
                placeholder={locked ? "Conversation handed off — saving automatically." : "Type the patient's reply..."}
                className="flex-1 resize-none rounded-md border border-line bg-canvas px-3 py-2 text-[13px] text-ink placeholder:text-muted focus:border-accent disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!draft.trim() || waiting || locked}
                aria-label="Send patient reply"
                className="rounded-md bg-accent p-2.5 text-on-accent hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={15} aria-hidden />
              </button>
            </div>

            {error && <p className="px-5 pb-1 text-xs text-danger">{error}</p>}

            <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">
              <p className="mono-label text-[9px] text-muted">
                The conversation saves automatically when enough information is collected.
              </p>
              <button
                onClick={onClose}
                className="rounded-md border border-line bg-panel px-4 py-2 text-[13px] font-semibold text-body hover:text-ink"
              >
                Cancel simulation
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
