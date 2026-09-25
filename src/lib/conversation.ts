import { Checkin, ConversationMessage } from "./types";

export interface ConversationConfig {
  openingMessage: string;
  suggestions: { label: string; message: string; tone: "stable" | "review" | "urgent" }[];
  lowFallbackReply: string;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function getConversationConfig(
  protocolId: string,
  context: { patientName: string; diagnosis: string }
): ConversationConfig {
  const name = firstName(context.patientName);
  const diagnosis = context.diagnosis || "your recent visit";

  switch (protocolId) {
    case "acute-infection":
      return {
        openingMessage: `Hi ${name}, this is a follow-up about your ${diagnosis}. Are you improving? Any fever, breathing difficulty, or trouble eating and drinking?`,
        suggestions: [
          { label: "Improving", message: "I'm improving and have no fever now.", tone: "stable" },
          { label: "Not improving", message: "I'm not improving and struggling to eat or drink.", tone: "review" },
          { label: "Breathing difficulty", message: "I have difficulty breathing and a fever.", tone: "urgent" },
        ],
        lowFallbackReply: `Thanks for the update, ${name}. Have your symptoms changed since your last message?`,
      };
    case "chronic-condition":
      return {
        openingMessage: `Hi ${name}, checking in on your ${diagnosis}. How are your symptoms, are you taking your medication as prescribed, and how are your latest readings?`,
        suggestions: [
          { label: "Stable", message: "Feeling stable and taking my medication every day.", tone: "stable" },
          { label: "Missed doses", message: "I missed a few doses and my readings have been abnormal.", tone: "review" },
          { label: "Urgent symptom", message: "I had chest pain and severe dizziness today.", tone: "urgent" },
        ],
        lowFallbackReply: `Thanks for the update, ${name}. Have you noticed any new symptoms or changes in your readings?`,
      };
    case "post-procedure":
    default:
      return {
        openingMessage: `Hi ${name}, this is a routine check-in after your ${diagnosis}. How is your pain trending, and is there any wound swelling, bleeding, or fever?`,
        suggestions: [
          { label: "Doing well", message: "Slight pain but otherwise feeling okay.", tone: "stable" },
          { label: "Some discomfort", message: "There is some swelling and ongoing discomfort around the wound.", tone: "review" },
          { label: "Getting worse", message: "The pain is much worse and I have a fever.", tone: "urgent" },
        ],
        lowFallbackReply: `Thanks for the update, ${name}. Has the pain, swelling, or wound appearance changed since your last message?`,
      };
  }
}

export interface FollowUpDecision {
  reply: string;
  informationComplete: boolean;
  missingInformation: string[];
  handoffSummary: string;
}

export function getFallbackFollowUpDecision(
  protocolId: string,
  context: { patientName: string; diagnosis: string },
  messages: FollowUpTranscriptMessage[]
): FollowUpDecision {
  const reply = getFallbackFollowUp(protocolId, context, messages);
  const patientTurns = messages.filter((m) => m.role === "PATIENT").length;
  if (patientTurns >= 2) {
    return {
      reply,
      informationComplete: true,
      missingInformation: [],
      handoffSummary: "Follow-up responses collected for nurse review.",
    };
  }
  return {
    reply,
    informationComplete: false,
    missingInformation: ["one additional protocol update"],
    handoffSummary: "Follow-up in progress.",
  };
}

export function synthesizeTranscript(
  checkin: Pick<Checkin, "message" | "response" | "createdAt"> & { conversation?: ConversationMessage[] },
  makeId: () => string
): ConversationMessage[] {
  if (checkin.conversation && checkin.conversation.length > 0) return checkin.conversation;
  return [
    {
      id: makeId(),
      role: "CLINIC",
      content: checkin.message,
      createdAt: `${checkin.createdAt} · 09:00 GST`,
      sender: "AI_COORDINATOR",
      deliveryStatus: "DELIVERED",
    },
    {
      id: makeId(),
      role: "PATIENT",
      content: checkin.response,
      createdAt: `${checkin.createdAt} · 09:12 GST`,
      sender: "PATIENT",
      deliveryStatus: "READ",
    },
  ];
}

export type FollowUpTranscriptMessage = {
  role: "CLINIC" | "PATIENT";
  content: string;
};

const TERSE_NEGATIVES = new Set(["no", "nope", "none", "nothing", "not really", "no nothing"]);

const TERSE_NEGATIVE_FIRST: Record<string, string> = {
  "post-procedure": "Thanks for confirming, {name}. How does your pain today compare with yesterday?",
  "acute-infection": "Thanks for confirming, {name}. Are you feeling better overall than yesterday?",
  "chronic-condition": "Thanks for confirming, {name}. If you have them available, what were your latest readings?",
};

export function getFallbackFollowUp(
  protocolId: string,
  context: { patientName: string; diagnosis: string },
  messages: FollowUpTranscriptMessage[]
): string {
  const name = firstName(context.patientName);
  const patientTurns = messages.filter((m) => m.role === "PATIENT");
  const turn = patientTurns.length;
  const latest = (patientTurns[turn - 1]?.content ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const terseNegative = TERSE_NEGATIVES.has(latest);

  if (terseNegative) {
    if (turn <= 1) {
      const template = TERSE_NEGATIVE_FIRST[protocolId] ?? TERSE_NEGATIVE_FIRST["post-procedure"];
      return template.replace("{name}", name);
    }
    return `Thanks for confirming, ${name}. I’ve recorded your update and there are no more questions for this check-in.`;
  }

  if (turn <= 1) {
    return getConversationConfig(protocolId, context).lowFallbackReply;
  }
  return `Thanks for the update, ${name}. I’ve recorded your responses and there are no more questions for this check-in.`;
}

const QUESTION_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "is", "are", "was", "were", "you", "your", "any", "about",
  "have", "has", "had", "can", "could", "would", "please", "tell", "me", "how", "what", "when", "since", "with",
]);

function questionTokens(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !QUESTION_STOPWORDS.has(t));
  return new Set(tokens);
}

export function repeatsClinicQuestion(
  candidate: string,
  messages: FollowUpTranscriptMessage[]
): boolean {
  if (!candidate.includes("?")) return false;
  const candidateSet = questionTokens(candidate);
  for (const m of messages) {
    if (m.role !== "CLINIC" || !m.content.includes("?")) continue;
    const priorSet = questionTokens(m.content);
    if (priorSet.size === 0 && candidateSet.size === 0) return true;
    const intersection = [...candidateSet].filter((t) => priorSet.has(t));
    const denominator = Math.min(candidateSet.size, priorSet.size);
    if (denominator === 0) continue;
    if (intersection.length >= 2 && intersection.length / denominator >= 0.7) return true;
  }
  return false;
}
