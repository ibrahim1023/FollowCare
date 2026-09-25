import { NextRequest, NextResponse } from "next/server";
import { getFallbackFollowUpDecision, repeatsClinicQuestion, FollowUpTranscriptMessage } from "@/lib/conversation";

interface FollowUpRequest {
  patient: { name: string; diagnosis: string; treatment: string };
  protocol: { id: string; name: string; redFlags: string[] };
  messages: { role: "CLINIC" | "PATIENT"; content: string }[];
  deterministicTriage: { severity: "LOW"; matchedRules: string[] };
}

function fallbackResponse(
  protocolId: string,
  patientName: string,
  diagnosis: string,
  transcript: FollowUpTranscriptMessage[]
) {
  const decision = getFallbackFollowUpDecision(protocolId, { patientName, diagnosis }, transcript);
  return NextResponse.json({
    reply: decision.reply,
    source: "fallback",
    informationComplete: decision.informationComplete,
    missingInformation: decision.missingInformation,
    handoffSummary: decision.handoffSummary,
  });
}

function isValidMessages(messages: unknown): messages is FollowUpRequest["messages"] {
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.every(
      (m) =>
        m &&
        typeof m === "object" &&
        (m.role === "CLINIC" || m.role === "PATIENT") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
  );
}

export async function POST(req: NextRequest) {
  let body: FollowUpRequest;
  try {
    body = (await req.json()) as FollowUpRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patient = body?.patient;
  const protocol = body?.protocol;
  const protocolId = typeof protocol?.id === "string" ? protocol.id : "post-procedure";
  const patientName = typeof patient?.name === "string" ? patient.name : "";
  const diagnosis = typeof patient?.diagnosis === "string" ? patient.diagnosis : "";

  if (!patient || !protocol || !isValidMessages(body?.messages)) {
    return NextResponse.json({ error: "patient, protocol and messages are required" }, { status: 400 });
  }
  if (
    typeof patientName !== "string" ||
    !patientName.trim() ||
    typeof diagnosis !== "string" ||
    !diagnosis.trim() ||
    typeof patient.treatment !== "string" ||
    !protocolId.trim() ||
    typeof protocol.name !== "string" ||
    !protocol.name.trim() ||
    !Array.isArray(protocol.redFlags) ||
    !protocol.redFlags.every((f) => typeof f === "string")
  ) {
    return NextResponse.json({ error: "patient, protocol and messages are required" }, { status: 400 });
  }
  if (body?.deterministicTriage?.severity !== "LOW") {
    return NextResponse.json({ error: "follow-up is only available for LOW severity conversations" }, { status: 400 });
  }

  const transcript = body.messages
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return fallbackResponse(protocolId, patientName, diagnosis, transcript);
  }

  const transcriptLines = transcript.map((m) => `${m.role}: ${m.content}`).join("\n");
  const prompt = [
    "You are a clinic follow-up coordinator continuing a patient follow-up chat.",
    "The deterministic rules engine has already classified the latest patient reply as LOW severity. You do not determine urgency or routing.",
    "Write one brief, warm clinic reply that acknowledges what the patient said and asks at most one useful follow-up question from the active protocol.",
    "Read the full conversation and never repeat or paraphrase a question the clinic already asked.",
    "Interpret a brief yes/no answer in the context of the clinic's immediately preceding question.",
    "If the latest reply is no, nope, none, or nothing and the previous clinic message asked about symptoms or problems, acknowledge the denial and do not ask about those same items again.",
    "Ask only about one protocol item that has not already been answered. If all relevant items have been addressed, acknowledge the update and ask no further question.",
    "Do not diagnose, prescribe, recommend medication changes, claim the patient is safe, or provide treatment instructions.",
    "Do not mention AI, severity labels, rules, routing, or internal systems.",
    "Use plain language, no markdown, maximum 2 short sentences.",
    'Return only JSON: {"reply":"...","information_complete":true|false,"missing_information":["..."],"handoff_summary":"..."}',
    "Conversational completeness is not medical urgency. Set information_complete true only when the patient has answered the currently relevant protocol topics, there is no useful non-repetitive question left, or the patient has clearly declined further detail.",
    "If information_complete is true, acknowledge the update without asking another question. If false, ask exactly one new question.",
    "The handoff_summary must neutrally summarize facts stated by the patient and must not include diagnosis, urgency, routing, or treatment advice.",
    "",
    `Patient: ${patientName}`,
    `Diagnosis/visit reason: ${diagnosis}`,
    `Treatment/context: ${patient.treatment ?? ""}`,
    `Protocol: ${protocol.name ?? ""}`,
    `Protocol red flags being monitored: ${(protocol.redFlags ?? []).join(", ")}`,
    "Conversation:",
    transcriptLines,
  ].join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: "Return only valid JSON with reply, information_complete, missing_information, and handoff_summary." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) return fallbackResponse(protocolId, patientName, diagnosis, transcript);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return fallbackResponse(protocolId, patientName, diagnosis, transcript);

    let parsed: { reply?: unknown; information_complete?: unknown; missing_information?: unknown; handoff_summary?: unknown };
    try {
      parsed = JSON.parse(content.replace(/```json|```/g, "").trim()) as typeof parsed;
    } catch {
      return fallbackResponse(protocolId, patientName, diagnosis, transcript);
    }
    const reply = parsed.reply;
    const complete = parsed.information_complete;
    const missing = parsed.missing_information;
    const handoff = parsed.handoff_summary;
    if (
      typeof reply !== "string" ||
      !reply.trim() ||
      reply.length > 500 ||
      typeof complete !== "boolean" ||
      !Array.isArray(missing) ||
      missing.length > 5 ||
      !missing.every((m) => typeof m === "string" && m.length <= 160) ||
      typeof handoff !== "string" ||
      !handoff.trim() ||
      handoff.length > 500
    ) {
      return fallbackResponse(protocolId, patientName, diagnosis, transcript);
    }
    const trimmed = reply.trim();
    if (complete && trimmed.includes("?")) {
      return fallbackResponse(protocolId, patientName, diagnosis, transcript);
    }
    if (repeatsClinicQuestion(trimmed, transcript)) {
      return fallbackResponse(protocolId, patientName, diagnosis, transcript);
    }
    return NextResponse.json({
      reply: trimmed,
      source: "groq",
      informationComplete: complete,
      missingInformation: missing,
      handoffSummary: handoff.trim(),
    });
  } catch {
    return fallbackResponse(protocolId, patientName, diagnosis, transcript);
  }
}
