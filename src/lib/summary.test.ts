import { describe, it, expect } from "vitest";
import { buildFallbackSummary } from "./summary";

const patient = {
  name: "Aisha Rahman",
  diagnosis: "Minor outpatient procedure",
  treatment: "Local excision, oral analgesia",
  lastVisit: "10 Jun 2025",
};

describe("buildFallbackSummary", () => {
  it("describes doctor escalation for HIGH severity", () => {
    const summary = buildFallbackSummary({
      patient,
      message: "The pain is much worse and I have a fever.",
      symptoms: ["increasing pain", "fever"],
      severity: "HIGH",
      route: "DOCTOR",
    });
    expect(summary).toContain("escalat");
    expect(summary).toContain("doctor");
    expect(summary).not.toContain("routed to nurse");
  });

  it("describes nurse routing for LOW severity", () => {
    const summary = buildFallbackSummary({
      patient,
      message: "Slight pain but otherwise feeling okay.",
      symptoms: ["mild pain"],
      severity: "LOW",
      route: "NURSE",
    });
    expect(summary).toContain("low severity");
    expect(summary).toContain("nurse");
    expect(summary).not.toContain("escalat");
  });
});
