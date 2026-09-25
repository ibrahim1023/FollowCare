import { getProtocol, PROTOCOLS } from "./protocols";
import { Severity } from "./types";

export type TriageResult = {
  matchedRules: string[];
  severity: "LOW" | "MEDIUM" | "HIGH";
  route: "NURSE" | "DOCTOR";
  reason: string;
};

const NEGATORS = new Set(["no", "not", "never", "without", "denies", "denied", "isnt", "wasnt", "dont"]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/can't/g, "cant")
    .replace(/cannot/g, "cannot")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isNegated(normalized: string, matchIndex: number): boolean {
  const before = normalized.slice(0, matchIndex).trim();
  if (!before) return false;
  const words = before.split(" ");
  const window = words.slice(-4);
  for (const w of window) {
    if (NEGATORS.has(w)) return true;
    if (["but", "however", "though", "yet", "and", "or"].includes(w)) {
      const idx = window.indexOf(w);
      if (window.slice(idx + 1).some((t) => NEGATORS.has(t))) return true;
      break;
    }
  }
  return false;
}

function phraseMatches(normalized: string, phrase: string): boolean {
  const p = normalize(phrase);
  let idx = normalized.indexOf(p);
  while (idx !== -1) {
    const end = idx + p.length;
    const endChar = normalized[end];
    const boundaryOk = endChar === undefined || endChar === " ";
    if (boundaryOk && !isNegated(normalized, idx)) return true;
    idx = normalized.indexOf(p, idx + 1);
  }
  return false;
}

const SEVERITY_ORDER: Severity[] = ["LOW", "MEDIUM", "HIGH"];

export function triageMessage(message: string, protocolId: string): TriageResult {
  const protocol = getProtocol(protocolId);
  const normalized = normalize(message);
  const matched = new Set<string>();

  for (const rule of protocol.rules) {
    for (const phrase of rule.phrases) {
      if (phraseMatches(normalized, phrase)) {
        matched.add(rule.id);
        break;
      }
    }
  }

  if (matched.has("WORSENING_PAIN")) {
    matched.delete("MILD_PAIN");
  }
  if (protocol.id !== "post-procedure" && (matched.has("WORSENING_SYMPTOMS") || matched.has("SYMPTOM_DETERIORATION"))) {
    matched.delete("NOT_IMPROVING");
  }

  let severity: Severity = "LOW";
  for (const ruleId of matched) {
    const rule = protocol.rules.find((r) => r.id === ruleId);
    if (rule && SEVERITY_ORDER.indexOf(rule.severity) > SEVERITY_ORDER.indexOf(severity)) {
      severity = rule.severity;
    }
  }

  const route: TriageResult["route"] = severity === "HIGH" ? "DOCTOR" : "NURSE";
  const matchedRules = [...matched];
  const labels = protocol.rules
    .filter((r) => matched.has(r.id))
    .map((r) => r.label);

  const reason =
    matchedRules.length === 0
      ? "No red flags detected; routine follow-up recommended."
      : severity === "HIGH"
        ? `Red flags detected: ${labels.join(", ")}.`
        : `Non-urgent findings: ${labels.join(", ")}.`;

  return { matchedRules, severity, route, reason };
}

export function triageConversation(messages: string[], protocolId: string): TriageResult {
  const protocol = getProtocol(protocolId);
  const matched = new Set<string>();
  let severity: Severity = "LOW";

  for (const message of messages) {
    if (!message.trim()) continue;
    const result = triageMessage(message, protocolId);
    for (const ruleId of result.matchedRules) matched.add(ruleId);
    if (SEVERITY_ORDER.indexOf(result.severity) > SEVERITY_ORDER.indexOf(severity)) {
      severity = result.severity;
    }
  }

  if (matched.has("WORSENING_PAIN")) {
    matched.delete("MILD_PAIN");
  }
  if (matched.has("WORSENING_SYMPTOMS") || matched.has("SYMPTOM_DETERIORATION")) {
    matched.delete("NOT_IMPROVING");
  }

  const matchedRules = protocol.rules.map((r) => r.id).filter((id) => matched.has(id));
  const labels = protocol.rules.filter((r) => matched.has(r.id)).map((r) => r.label);
  const route: TriageResult["route"] = severity === "HIGH" ? "DOCTOR" : "NURSE";

  const reason =
    matchedRules.length === 0
      ? "No red flags detected; routine follow-up recommended."
      : severity === "HIGH"
        ? `Red flags detected: ${labels.join(", ")}.`
        : `Non-urgent findings: ${labels.join(", ")}.`;

  return { matchedRules, severity, route, reason };
}

const SYMPTOM_LABELS: Record<string, string> = {
  WORSENING_PAIN: "increasing pain",
  MILD_PAIN: "mild pain",
  FEVER: "fever",
  BLEEDING: "bleeding",
  SWELLING: "swelling",
  BREATHING_DIFFICULTY: "difficulty breathing",
  WORSENING_SYMPTOMS: "worsening symptoms",
  NOT_IMPROVING: "no improvement",
  CANNOT_EAT_DRINK: "unable to eat or drink",
  URGENT_SYMPTOMS: "urgent symptoms",
  SYMPTOM_DETERIORATION: "symptom deterioration",
  ABNORMAL_MEASUREMENT: "abnormal reported measurement",
  MISSED_MEDICATION: "missed medication",
  MEDICATION_PROBLEM: "medication problem",
};

export function extractSymptomsFallback(message: string): string[] {
  const normalized = normalize(message);
  const found: string[] = [];
  for (const protocol of PROTOCOLS) {
    for (const rule of protocol.rules) {
      if (found.includes(SYMPTOM_LABELS[rule.id])) continue;
      if (rule.phrases.some((p) => phraseMatches(normalized, p))) {
        const label = SYMPTOM_LABELS[rule.id] ?? rule.label;
        if (!found.includes(label)) found.push(label);
      }
    }
  }
  if (found.includes("increasing pain")) {
    const i = found.indexOf("mild pain");
    if (i !== -1) found.splice(i, 1);
  }
  if (found.length === 0) found.push("general follow-up reply");
  return found;
}
