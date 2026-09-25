import { Protocol } from "./types";

export const PROTOCOLS: Protocol[] = [
  {
    id: "post-procedure",
    name: "Post-Procedure Protocol",
    type: "post-procedure",
    steps: [
      { day: "Day 1", instruction: "Check pain, bleeding, and fever" },
      { day: "Day 3", instruction: "Check recovery progress and swelling" },
      { day: "Day 7", instruction: "Final recovery check" },
    ],
    redFlags: ["severe pain", "bleeding", "fever", "swelling", "worsening symptoms"],
    rules: [
      {
        id: "WORSENING_PAIN",
        label: "Increasing or severe pain",
        phrases: [
          "much worse",
          "getting worse",
          "worse",
          "worsening",
          "severe pain",
          "unbearable",
          "increasing pain",
          "pain is increasing",
          "more pain",
        ],
        severity: "HIGH",
      },
      {
        id: "FEVER",
        label: "Fever",
        phrases: ["fever", "high temperature", "temperature of", "chills", "feeling hot"],
        severity: "HIGH",
      },
      {
        id: "BLEEDING",
        label: "Bleeding",
        phrases: ["bleeding", "blood", "bleed"],
        severity: "HIGH",
      },
      {
        id: "SWELLING",
        label: "Swelling",
        phrases: ["swelling", "swollen", "puffy"],
        severity: "MEDIUM",
      },
      {
        id: "MILD_PAIN",
        label: "Mild or stable pain",
        phrases: ["slight pain", "mild pain", "a little pain", "some pain", "pain"],
        severity: "LOW",
      },
    ],
  },
  {
    id: "acute-infection",
    name: "Acute Infection Protocol",
    type: "acute-infection",
    steps: [
      { day: "Day 2", instruction: "Check fever and symptom trend" },
      { day: "Day 5", instruction: "Confirm response to treatment" },
      { day: "Day 10", instruction: "Confirm resolution" },
    ],
    redFlags: [
      "fever",
      "worsening symptoms",
      "breathing difficulty",
      "inability to eat or drink",
      "no improvement",
    ],
    rules: [
      {
        id: "BREATHING_DIFFICULTY",
        label: "Breathing difficulty",
        phrases: [
          "difficulty breathing",
          "hard to breathe",
          "shortness of breath",
          "can't breathe",
          "cannot breathe",
          "breathless",
        ],
        severity: "HIGH",
      },
      {
        id: "FEVER",
        label: "Fever",
        phrases: ["fever", "high temperature", "temperature of", "chills"],
        severity: "HIGH",
      },
      {
        id: "WORSENING_SYMPTOMS",
        label: "Worsening symptoms",
        phrases: ["worse", "worsening", "getting worse", "deteriorating"],
        severity: "HIGH",
      },
      {
        id: "NOT_IMPROVING",
        label: "No improvement",
        phrases: ["not improving", "no improvement", "not getting better", "no better", "still the same"],
        severity: "MEDIUM",
      },
      {
        id: "CANNOT_EAT_DRINK",
        label: "Unable to eat or drink",
        phrases: [
          "can't eat",
          "cannot eat",
          "can't drink",
          "cannot drink",
          "unable to eat",
          "unable to drink",
          "not eating",
          "not drinking",
        ],
        severity: "MEDIUM",
      },
    ],
  },
  {
    id: "chronic-condition",
    name: "Chronic Condition Protocol",
    type: "chronic-condition",
    steps: [
      { day: "Week 1", instruction: "Confirm medication adherence and readings" },
      { day: "Week 2", instruction: "Check symptom stability" },
      { day: "Week 4", instruction: "Review measurements and plan next visit" },
    ],
    redFlags: [
      "symptom deterioration",
      "medication problems",
      "abnormal reported measurements",
      "missed medication",
      "urgent symptoms",
    ],
    rules: [
      {
        id: "URGENT_SYMPTOMS",
        label: "Urgent symptoms",
        phrases: ["chest pain", "fainting", "fainted", "severe dizziness", "vision loss", "confusion"],
        severity: "HIGH",
      },
      {
        id: "SYMPTOM_DETERIORATION",
        label: "Symptom deterioration",
        phrases: ["worse", "worsening", "getting worse", "deteriorating", "flare up", "flare-up"],
        severity: "HIGH",
      },
      {
        id: "ABNORMAL_MEASUREMENT",
        label: "Abnormal reported measurement",
        phrases: [
          "high blood pressure",
          "low blood pressure",
          "high sugar",
          "low sugar",
          "abnormal reading",
          "reading of",
          "very high reading",
        ],
        severity: "MEDIUM",
      },
      {
        id: "MISSED_MEDICATION",
        label: "Missed medication",
        phrases: ["missed medication", "missed my medication", "missed a dose", "missed dose", "forgot to take", "forgot my medication"],
        severity: "MEDIUM",
      },
      {
        id: "MEDICATION_PROBLEM",
        label: "Medication problem",
        phrases: ["side effect", "side effects", "ran out of medication", "ran out of my medication", "medication is not working"],
        severity: "MEDIUM",
      },
    ],
  },
];

export function getProtocol(id: string): Protocol {
  return PROTOCOLS.find((p) => p.id === id) ?? PROTOCOLS[0];
}
