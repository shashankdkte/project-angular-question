import type { QuestionSummary } from "../../src/types/content";

let counter = 0;

/** A synthetic summary for filter/search/stats tests. Never shown in the real UI. */
export function makeSummary(overrides: Partial<QuestionSummary> = {}): QuestionSummary {
  counter += 1;
  const sequence = overrides.sequence ?? counter;
  return {
    id: overrides.id ?? `ANG-BEG-${String(sequence).padStart(3, "0")}`,
    sequence,
    difficulty: "beginner",
    domain: "JavaScript Fundamentals",
    topic: `Topic ${sequence}`,
    question: `What is topic ${sequence}?`,
    questionType: "conceptual",
    priority: "high",
    roles: ["software-engineer"],
    industries: ["banking"],
    tags: [],
    exampleIndustry: "banking",
    batchId: "test-batch",
    readingMinutes: 5,
    diagramCount: 1,
    ...overrides,
  };
}

export function makeSummaries(): QuestionSummary[] {
  return [
    makeSummary({
      id: "ANG-BEG-001",
      sequence: 1,
      topic: "Variables and scope",
      question: "What is the difference between var, let and const?",
      domain: "JavaScript Fundamentals",
      tags: ["scope", "hoisting", "const"],
      priority: "critical",
      industries: ["banking", "ecommerce"],
    }),
    makeSummary({
      id: "ANG-BEG-002",
      sequence: 2,
      topic: "Equality operators",
      question: "What is the difference between == and ===?",
      domain: "JavaScript Fundamentals",
      tags: ["coercion"],
      questionType: "debugging",
      priority: "high",
      industries: ["healthcare"],
    }),
    makeSummary({
      id: "ANG-INT-001",
      sequence: 1,
      difficulty: "intermediate",
      topic: "Change detection strategies",
      question: "How does OnPush change detection work?",
      domain: "Angular Core",
      tags: ["onpush", "performance"],
      questionType: "architecture",
      priority: "medium",
      roles: ["technical-lead", "software-engineer"],
      industries: ["saas"],
    }),
  ];
}
