import { NextRequest, NextResponse } from "next/server";
import { extractSymptomsFallback } from "@/lib/triage";
import { buildFallbackSummary } from "@/lib/summary";

interface AnalyzeRequest {
  message: string;
  patient: { name: string; diagnosis: string; treatment: string; lastVisit: string };
  previousStatus?: string;
}

function fallbackResponse(message: string, patient: AnalyzeRequest["patient"], previousStatus?: string) {
  const symptoms = extractSymptomsFallback(message);
  const summary = buildFallbackSummary({
    patient,
    previousStatus,
    message,
    symptoms,
    severity: "LOW",
    route: "NURSE",
  });
  return NextResponse.json({ symptoms, summary, source: "fallback" });
}

function parseModelJson(content: string): { symptoms: string[]; summary: string } | null {
  try {
    const cleaned = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { symptoms?: unknown; summary?: unknown };
    if (!Array.isArray(parsed.symptoms) || typeof parsed.summary !== "string") return null;
    const symptoms = parsed.symptoms.filter((s): s is string => typeof s === "string");
    return { symptoms, summary: parsed.summary };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: AnalyzeRequest;
  try {
    body = (await req.json()) as AnalyzeRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = typeof body?.message === "string" ? body.message : "";
  const patient = body?.patient ?? { name: "", diagnosis: "", treatment: "", lastVisit: "" };
  if (!message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return fallbackResponse(message, patient, body.previousStatus);
  }

  const prompt = [
    "You are a clinical data-extraction assistant for a clinic follow-up tool.",
    "Extract the patient's reported symptoms and write a concise clinical summary (3-5 short lines) for the doctor.",
    "Do NOT decide medical urgency, severity, or triage routing — only extract and summarize.",
    'Respond ONLY with JSON: {"symptoms": string[], "summary": string}',
    "",
    `Patient: ${patient.name}`,
    `Diagnosis: ${patient.diagnosis}`,
    `Treatment: ${patient.treatment}`,
    `Last visit: ${patient.lastVisit}`,
    body.previousStatus ? `Previous status: ${body.previousStatus}` : "",
    `Patient reply: "${message}"`,
  ]
    .filter(Boolean)
    .join("\n");

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
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You output only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) return fallbackResponse(message, patient, body.previousStatus);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return fallbackResponse(message, patient, body.previousStatus);

    const parsed = parseModelJson(content);
    if (!parsed) return fallbackResponse(message, patient, body.previousStatus);

    return NextResponse.json({ symptoms: parsed.symptoms, summary: parsed.summary, source: "groq" });
  } catch {
    return fallbackResponse(message, patient, body.previousStatus);
  }
}
