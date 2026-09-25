import { describe, it, expect } from "vitest";
import {
  getConversationConfig,
  getFallbackFollowUp,
  getFallbackFollowUpDecision,
  repeatsClinicQuestion,
  synthesizeTranscript,
  FollowUpTranscriptMessage,
} from "./conversation";

const ctx = { patientName: "Aisha Rahman", diagnosis: "Minor outpatient procedure" };
const PROTOCOL_IDS = ["post-procedure", "acute-infection", "chronic-condition"] as const;
const TONES = ["stable", "review", "urgent"];
const UNSAFE = [/take your medication/i, /medication as prescribed/i, /keep the wound/i, /normal recovery/i, /safe/i];

describe("getConversationConfig", () => {
  it("returns distinct opening messages per protocol", () => {
    const openings = PROTOCOL_IDS.map((id) => getConversationConfig(id, ctx).openingMessage);
    expect(new Set(openings).size).toBe(PROTOCOL_IDS.length);
  });

  it("returns distinct suggestion message sets per protocol", () => {
    const sets = PROTOCOL_IDS.map((id) =>
      getConversationConfig(id, ctx).suggestions.map((s) => s.message).join("|")
    );
    expect(new Set(sets).size).toBe(PROTOCOL_IDS.length);
  });

  it("each protocol has exactly 3 suggestions with stable/review/urgent tones", () => {
    for (const id of PROTOCOL_IDS) {
      const { suggestions } = getConversationConfig(id, ctx);
      expect(suggestions).toHaveLength(3);
      expect(suggestions.map((s) => s.tone)).toEqual(TONES);
    }
  });

  it("fallback replies avoid unsafe instructions and safety claims", () => {
    for (const id of PROTOCOL_IDS) {
      const reply = getConversationConfig(id, ctx).lowFallbackReply;
      for (const pattern of UNSAFE) {
        expect(reply).not.toMatch(pattern);
      }
    }
  });
});

const chronicOpening = getConversationConfig("chronic-condition", ctx).openingMessage;
const chronicCtx = { patientName: "Fatima Al Zaabi", diagnosis: "Hypertension, type 2 diabetes" };

describe("getFallbackFollowUp", () => {
  it("asks for latest readings after a first terse 'No' on chronic", () => {
    const messages: FollowUpTranscriptMessage[] = [
      { role: "CLINIC", content: chronicOpening },
      { role: "PATIENT", content: "No" },
    ];
    const reply = getFallbackFollowUp("chronic-condition", chronicCtx, messages);
    expect(reply).toContain("latest readings");
    expect(reply).toContain("Fatima");
  });

  it("ends questioning after a second terse 'No'", () => {
    const messages: FollowUpTranscriptMessage[] = [
      { role: "CLINIC", content: chronicOpening },
      { role: "PATIENT", content: "No" },
      { role: "CLINIC", content: "If you have them available, what were your latest readings?" },
      { role: "PATIENT", content: "No" },
    ];
    const reply = getFallbackFollowUp("chronic-condition", chronicCtx, messages);
    expect(reply).toContain("no more questions");
    expect(reply).not.toContain("?");
  });

  it("ends questioning after a non-terse second patient turn", () => {
    const messages: FollowUpTranscriptMessage[] = [
      { role: "CLINIC", content: chronicOpening },
      { role: "PATIENT", content: "Feeling okay today" },
      { role: "CLINIC", content: "Any changes in your readings?" },
      { role: "PATIENT", content: "Readings seem normal this week" },
    ];
    const reply = getFallbackFollowUp("chronic-condition", chronicCtx, messages);
    expect(reply).toContain("no more questions");
    expect(reply).not.toContain("complete");
    expect(reply).not.toContain("?");
  });
});

const PRIOR_QUESTION = "Are you experiencing any pain or swelling today?";

describe("repeatsClinicQuestion", () => {
  const history: FollowUpTranscriptMessage[] = [
    { role: "CLINIC", content: "Hi, checking in." },
    { role: "CLINIC", content: PRIOR_QUESTION },
    { role: "PATIENT", content: "No" },
  ];

  it("detects an exact repeated question", () => {
    expect(repeatsClinicQuestion(PRIOR_QUESTION, history)).toBe(true);
  });

  it("detects a close paraphrase with >=0.7 overlap", () => {
    expect(repeatsClinicQuestion("Are you having any pain or swelling today?", history)).toBe(true);
  });

  it("allows a genuinely new question", () => {
    expect(repeatsClinicQuestion("What time is your next appointment?", history)).toBe(false);
  });

  it("ignores statements without a question mark", () => {
    expect(repeatsClinicQuestion("Thanks, noted on the pain and swelling today.", history)).toBe(false);
  });
});

describe("getFallbackFollowUpDecision", () => {
  const openOnly: FollowUpTranscriptMessage[] = [{ role: "CLINIC", content: chronicOpening }];
  const afterOne: FollowUpTranscriptMessage[] = [...openOnly, { role: "PATIENT", content: "Feeling fine" }];
  const afterTwo: FollowUpTranscriptMessage[] = [
    ...afterOne,
    { role: "CLINIC", content: "Any changes in your readings?" },
    { role: "PATIENT", content: "Readings normal" },
  ];

  it("is incomplete after the first patient turn", () => {
    const d = getFallbackFollowUpDecision("chronic-condition", chronicCtx, afterOne);
    expect(d.informationComplete).toBe(false);
    expect(d.missingInformation).toEqual(["one additional protocol update"]);
  });

  it("is complete after the second patient turn with a question-free reply", () => {
    const d = getFallbackFollowUpDecision("chronic-condition", chronicCtx, afterTwo);
    expect(d.informationComplete).toBe(true);
    expect(d.missingInformation).toEqual([]);
    expect(d.handoffSummary).toBe("Follow-up responses collected for nurse review.");
    expect(d.reply).not.toContain("?");
  });
});

describe("synthesizeTranscript", () => {
  it("synthesizes opening + response for legacy checkins", () => {
    let n = 0;
    const transcript = synthesizeTranscript(
      { message: "How are you feeling?", response: "Fine", createdAt: "12 Jun 2025" },
      () => `id-${++n}`
    );
    expect(transcript).toHaveLength(2);
    expect(transcript[0].role).toBe("CLINIC");
    expect(transcript[1].role).toBe("PATIENT");
    expect(transcript[1].content).toBe("Fine");
  });

  it("returns existing conversation unchanged", () => {
    const existing = [{ id: "x", role: "PATIENT" as const, content: "Hi", createdAt: "t" }];
    const transcript = synthesizeTranscript(
      { message: "Q", response: "R", createdAt: "t", conversation: existing },
      () => "id"
    );
    expect(transcript).toBe(existing);
  });
});
