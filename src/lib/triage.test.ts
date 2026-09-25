import { describe, it, expect } from "vitest";
import { triageMessage, triageConversation, extractSymptomsFallback } from "./triage";

describe("triageMessage", () => {
  it("routes mild replies as LOW to the nurse queue", () => {
    const result = triageMessage("Slight pain but otherwise feeling okay.", "post-procedure");
    expect(result.severity).toBe("LOW");
    expect(result.route).toBe("NURSE");
    expect(result.matchedRules).not.toContain("WORSENING_PAIN");
  });

  it("detects fever and worsening pain and routes HIGH to the doctor", () => {
    const result = triageMessage("The pain is much worse and I have a fever.", "post-procedure");
    expect(result.severity).toBe("HIGH");
    expect(result.route).toBe("DOCTOR");
    expect(result.matchedRules).toContain("FEVER");
    expect(result.matchedRules).toContain("WORSENING_PAIN");
  });

  it("respects negations like 'no fever' and 'not worse'", () => {
    const result = triageMessage("No fever and the pain is not worse.", "post-procedure");
    expect(result.matchedRules).not.toContain("FEVER");
    expect(result.matchedRules).not.toContain("WORSENING_PAIN");
    expect(result.route).toBe("NURSE");
  });

  it("flags breathing difficulty as HIGH for acute-infection", () => {
    const result = triageMessage("I have difficulty breathing.", "acute-infection");
    expect(result.severity).toBe("HIGH");
    expect(result.route).toBe("DOCTOR");
    expect(result.matchedRules).toContain("BREATHING_DIFFICULTY");
  });

  it("does not flag 'no difficulty breathing'", () => {
    const result = triageMessage("No difficulty breathing today.", "acute-infection");
    expect(result.matchedRules).not.toContain("BREATHING_DIFFICULTY");
  });
});

describe("triageConversation", () => {
  it("aggregates severity across turns without negation leaking", () => {
    const result = triageConversation(["No fever.", "Now I have a fever."], "post-procedure");
    expect(result.severity).toBe("HIGH");
    expect(result.route).toBe("DOCTOR");
    expect(result.matchedRules.filter((r) => r === "FEVER")).toHaveLength(1);
  });

  it("deduplicates rules and drops MILD_PAIN when WORSENING_PAIN is present", () => {
    const result = triageConversation(["Slight pain.", "The pain is much worse."], "post-procedure");
    expect(result.severity).toBe("HIGH");
    expect(result.matchedRules).toContain("WORSENING_PAIN");
    expect(result.matchedRules).not.toContain("MILD_PAIN");
  });

  it("stays LOW when every turn is negated", () => {
    const result = triageConversation(["No fever.", "The pain is not worse."], "post-procedure");
    expect(result.severity).toBe("LOW");
    expect(result.route).toBe("NURSE");
    expect(result.matchedRules).not.toContain("FEVER");
    expect(result.matchedRules).not.toContain("WORSENING_PAIN");
  });
});

describe("extractSymptomsFallback", () => {
  it("extracts canonical symptom labels", () => {
    const symptoms = extractSymptomsFallback("The pain is much worse and I have a fever.");
    expect(symptoms).toContain("fever");
    expect(symptoms).toContain("increasing pain");
  });
});
