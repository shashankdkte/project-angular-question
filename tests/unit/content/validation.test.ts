import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createWorkspace, loadRealBatch, makeBatch, type Json, type TestWorkspace } from "../../helpers/workspace";

let ws: TestWorkspace;
beforeEach(async () => {
  ws = await createWorkspace();
});
afterEach(async () => {
  await ws.dispose();
});

const codes = (result: Awaited<ReturnType<TestWorkspace["ingest"]>>, severity: "error" | "warning" = "error") =>
  result.report.issues.filter((i) => i.severity === severity).map((i) => i.code);

describe("JSON validation: the supplied batch", () => {
  it("accepts the real beginner batch with no errors or warnings", async () => {
    await ws.write("beginner/beginner_01_questions_001_005.json", await loadRealBatch());
    const result = await ws.ingest();
    expect(result.report.errors).toBe(0);
    expect(result.report.warnings).toBe(0);
    expect(result.index.total).toBe(5);
    expect(result.index.questions.map((q) => q.id)).toEqual([
      "ANG-BEG-001",
      "ANG-BEG-002",
      "ANG-BEG-003",
      "ANG-BEG-004",
      "ANG-BEG-005",
    ]);
  });

  it("preserves batch metadata and the declared section order", async () => {
    await ws.write("beginner/b.json", await loadRealBatch());
    const result = await ws.ingest();
    expect(result.index.batches[0]).toMatchObject({ id: "beginner-01", difficulty: "beginner", questionCount: 5 });
    expect(result.records[0].answerSectionOrder).toHaveLength(15);
    expect(result.records[0].answerSectionOrder[0]).toBe("definition");
    expect(result.records[0].batch.curriculumVersion).toBe("2.0");
    expect(result.index.dataset).toBe("angular-fullstack-industry-mastery");
  });
});

describe("JSON validation: structural failures", () => {
  it("rejects syntactically invalid JSON with a readable error", async () => {
    await ws.write("beginner/broken.json", "{ not json");
    const result = await ws.ingest();
    expect(codes(result)).toContain("json-parse");
    expect(result.index.total).toBe(0);
  });

  it("rejects a flat top-level array (files must be batch objects)", async () => {
    await ws.write("beginner/flat.json", [{ id: "ANG-BEG-001" }]);
    const result = await ws.ingest();
    expect(codes(result)).toEqual(["not-a-batch"]);
    expect(result.report.issues[0].message).toMatch(/batch object/);
  });

  it("rejects unsupported schema versions with a clear message", async () => {
    const batch = await loadRealBatch();
    batch.schemaVersion = "2.0.0";
    await ws.write("beginner/v2.json", batch);
    const result = await ws.ingest();
    expect(result.report.issues.some((i) => /unsupported schemaVersion "2.0.0"/.test(i.message))).toBe(true);
    expect(result.index.total).toBe(0);
  });

  it("rejects an invalid difficulty value", async () => {
    const batch = await loadRealBatch();
    batch.batch.difficulty = "legendary";
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    expect(codes(result)).toEqual(["invalid-difficulty"]);
  });

  it("rejects an invalid question type", async () => {
    const batch = await loadRealBatch();
    batch.questions[0].questionType = "trivia";
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    const issue = result.report.issues.find((i) => i.path?.endsWith("questionType"));
    expect(issue?.message).toMatch(/must be one of "conceptual"/);
    expect(issue?.questionId).toBe("ANG-BEG-001");
  });

  it("rejects a question missing its id", async () => {
    const batch = await loadRealBatch();
    delete batch.questions[2].id;
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    expect(result.report.issues.some((i) => /missing required property "id"/.test(i.message))).toBe(true);
  });

  it("rejects a question whose id does not match the difficulty pattern", async () => {
    const batch = await loadRealBatch();
    batch.questions[0].id = "ANG-INT-001";
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    expect(result.report.issues.some((i) => /does not match the required pattern/.test(i.message))).toBe(true);
  });

  it("rejects missing required answer sections", async () => {
    const batch = await loadRealBatch();
    delete batch.questions[1].answer.testing;
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    expect(result.report.issues.some((i) => /missing required property "testing"/.test(i.message))).toBe(true);
    expect(result.index.total).toBe(0);
  });

  it("rejects incorrect field types", async () => {
    const batch = await loadRealBatch();
    batch.questions[0].sequence = "one";
    batch.questions[0].tags = "scope";
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    expect(result.report.issues.filter((i) => /must be/.test(i.message)).length).toBeGreaterThanOrEqual(2);
  });

  it("enforces 4-5 characteristics from the schema", async () => {
    const batch = await loadRealBatch();
    batch.questions[0].answer.characteristics = ["only", "three", "items"];
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    expect(result.report.issues.some((i) => /at least 4 item/.test(i.message))).toBe(true);
  });

  it("rejects unknown properties inside answer (additionalProperties: false)", async () => {
    const batch = await loadRealBatch();
    batch.questions[0].answer.bonusSection = { text: "x" };
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    expect(result.report.issues.some((i) => /unknown property "bonusSection"/.test(i.message))).toBe(true);
  });

  it("rejects malformed nested content that the JSON Schema leaves open (Zod layer)", async () => {
    const batch = await loadRealBatch();
    batch.questions[0].answer.codeExample.code = "";
    delete batch.questions[0].answer.problemSolved.after;
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    expect(codes(result)).toContain("answer-shape");
    expect(result.report.issues.some((i) => i.path?.includes("problemSolved.after"))).toBe(true);
  });

  it("reports precise question ids and paths", async () => {
    const batch = await loadRealBatch();
    batch.questions[3].questionType = "nope";
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    const issue = result.report.issues[0];
    expect(issue.questionId).toBe("ANG-BEG-004");
    expect(issue.path).toBe("questions[3].questionType");
    expect(issue.file).toBe("beginner/x.json");
  });
});

describe("JSON validation: semantic failures", () => {
  it("fails when answerSectionOrder is not the canonical order", async () => {
    const batch = await loadRealBatch();
    [batch.answerSectionOrder[0], batch.answerSectionOrder[1]] = [batch.answerSectionOrder[1], batch.answerSectionOrder[0]];
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    expect(codes(result)).toContain("section-order");
  });

  it("fails when answerSectionOrder names a different section", async () => {
    const batch = await loadRealBatch();
    batch.answerSectionOrder[14] = "summary";
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    const issue = result.report.issues.find((i) => i.code === "section-order");
    expect(issue?.message).toMatch(/missing: followUps/);
    expect(issue?.message).toMatch(/unexpected: summary/);
  });

  it("fails when batch.questionCount disagrees with the questions array", async () => {
    const batch = await loadRealBatch();
    batch.batch.questionCount = 4;
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    expect(codes(result)).toContain("batch-count");
  });

  it("fails on unknown roles and industries", async () => {
    const batch = await loadRealBatch();
    batch.questions[0].roles.push("intern");
    batch.questions[1].industries = ["banking", "retail"];
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    expect(codes(result)).toContain("unknown-role");
    expect(codes(result)).toContain("unknown-industry");
  });

  it("fails when id suffix and sequence disagree", async () => {
    const batch = await loadRealBatch();
    batch.questions[0].sequence = 9;
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    expect(codes(result)).toContain("id-sequence-mismatch");
  });

  it("fails on duplicate ids and sequences inside one file", async () => {
    const batch = await loadRealBatch();
    batch.questions[1].id = batch.questions[0].id;
    batch.questions[1].sequence = batch.questions[0].sequence;
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    expect(codes(result)).toContain("duplicate-id");
    expect(codes(result)).toContain("duplicate-sequence");
  });

  it("fails when a sequence exceeds the difficulty's curriculum target", async () => {
    const batch = await makeBatch({ sequences: [136], rangeStart: 136, rangeEnd: 136 });
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    expect(codes(result)).toContain("sequence-out-of-curriculum");
  });

  it("fails when the folder disagrees with the batch difficulty", async () => {
    await ws.write("expert/wrong-folder.json", await loadRealBatch());
    const result = await ws.ingest();
    expect(codes(result)).toContain("folder-difficulty-mismatch");
  });
});

describe("JSON validation: other difficulty levels", () => {
  it("accepts an intermediate batch using the derived ANG-INT schema", async () => {
    await ws.write("intermediate/i1.json", await makeBatch({ difficulty: "intermediate", sequences: [1, 2] }));
    const result = await ws.ingest();
    expect(result.report.errors).toBe(0);
    expect(result.index.questions.map((q) => q.id)).toEqual(["ANG-INT-001", "ANG-INT-002"]);
  });

  it("rejects an intermediate batch that reuses the beginner id prefix", async () => {
    await ws.write("intermediate/i1.json", await makeBatch({ difficulty: "intermediate", prefix: "ANG-BEG", sequences: [1] }));
    const result = await ws.ingest();
    expect(result.index.total).toBe(0);
    expect(result.report.issues.some((i) => /ANG-INT/.test(i.message))).toBe(true);
  });

  it("does not modify the canonical beginner schema when deriving variants", async () => {
    await ws.write("intermediate/i1.json", await makeBatch({ difficulty: "intermediate", sequences: [1] }));
    await ws.write("beginner/b1.json", await loadRealBatch());
    const result = await ws.ingest();
    expect(result.report.errors).toBe(0);
    expect(result.index.total).toBe(6);
  });
});

describe("Duplicate detection across files", () => {
  it("rejects the later file when a question id is duplicated", async () => {
    await ws.write("beginner/a_first.json", await loadRealBatch());
    const dupe: Json = await makeBatch({ sequences: [5], batchId: "beginner-dupe" });
    dupe.questions[0].id = "ANG-BEG-005";
    await ws.write("beginner/b_second.json", dupe);

    const result = await ws.ingest();
    const issue = result.report.issues.find((i) => i.code === "duplicate-id");
    expect(issue).toBeDefined();
    expect(issue?.file).toBe("beginner/b_second.json");
    expect(issue?.message).toMatch(/already defined in beginner\/a_first\.json/);
    expect(result.index.total).toBe(5);
    expect(result.report.filesRejected).toBe(1);
  });

  it("rejects a second file that re-uses an existing sequence number", async () => {
    // The id suffix must equal the sequence, so a re-used sequence surfaces as a duplicate id.
    await ws.write("beginner/a.json", await loadRealBatch());
    await ws.write("beginner/b.json", await makeBatch({ sequences: [3], batchId: "beginner-clash" }));
    const result = await ws.ingest();
    const issue = result.report.issues.find((i) => i.code === "duplicate-id");
    expect(issue?.questionId).toBe("ANG-BEG-003");
    expect(result.index.questions.filter((q) => q.sequence === 3)).toHaveLength(1);
  });

  it("rejects duplicate batch ids", async () => {
    await ws.write("beginner/a.json", await loadRealBatch());
    await ws.write("beginner/b.json", await makeBatch({ sequences: [6], batchId: "beginner-01" }));
    const result = await ws.ingest();
    expect(codes(result)).toContain("duplicate-batch-id");
    expect(result.index.total).toBe(5);
  });

  it("rejects a batch from a different dataset", async () => {
    await ws.write("beginner/a.json", await loadRealBatch());
    const other = await makeBatch({ sequences: [6] });
    other.dataset = "something-else";
    await ws.write("beginner/b.json", other);
    const result = await ws.ingest();
    expect(codes(result)).toContain("dataset-mismatch");
  });
});

describe("Content-quality warnings (separate from structural errors)", () => {
  it("warns about missing diagrams, code without explanation and missing outcomes without rejecting the batch", async () => {
    const batch = await loadRealBatch();
    batch.questions[0].answer.endToEndFlow.diagrams = [];
    batch.questions[1].answer.codeExample.explanation = [];
    batch.questions[2].learningOutcomes = [];
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    expect(result.report.errors).toBe(0);
    expect(result.index.total).toBe(5);
    const warnings = codes(result, "warning");
    expect(warnings).toContain("missing-diagram");
    expect(warnings).toContain("code-without-explanation");
    expect(warnings).toContain("missing-learning-outcomes");
  });

  it("warns when the declared range is inconsistent with the sequences", async () => {
    const batch = await loadRealBatch();
    batch.batch.questionRange = { start: 10, end: 14 };
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    expect(codes(result, "warning")).toContain("sequence-outside-range");
    expect(result.index.total).toBe(5);
  });

  it("warns about unresolved internal references", async () => {
    const batch = await loadRealBatch();
    batch.questions[0].answer.followUps.beginner = ["Revisit ANG-BEG-099 first"];
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    const warning = result.report.issues.find((i) => i.code === "unresolved-reference");
    expect(warning?.message).toMatch(/ANG-BEG-099/);
    expect(result.report.errors).toBe(0);
  });

  it("does not warn about references that exist in the dataset", async () => {
    const batch = await loadRealBatch();
    batch.questions[0].answer.followUps.beginner = ["See also ANG-BEG-002"];
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    expect(codes(result, "warning")).not.toContain("unresolved-reference");
  });

  it("warns about unsafe or unrecognised Mermaid source", async () => {
    const batch = await loadRealBatch();
    batch.questions[0].answer.endToEndFlow.diagrams[0].mermaid = 'flowchart TD\nA-->B\nclick A "javascript:alert(1)"';
    batch.questions[1].answer.endToEndFlow.diagrams[0].mermaid = "hello world";
    await ws.write("beginner/x.json", batch);
    const result = await ws.ingest();
    const warnings = codes(result, "warning");
    expect(warnings).toContain("mermaid-unsafe");
    expect(warnings).toContain("mermaid-unrecognised");
  });
});

describe("Partial datasets", () => {
  it("keeps valid batches when another file is invalid", async () => {
    await ws.write("beginner/a_good.json", await loadRealBatch());
    await ws.write("beginner/b_bad.json", "{ nope");
    const result = await ws.ingest();
    expect(result.index.total).toBe(5);
    expect(result.report.filesAccepted).toBe(1);
    expect(result.report.filesRejected).toBe(1);
    expect(result.report.errors).toBe(1);
  });

  it("handles an empty dataset", async () => {
    const result = await ws.ingest();
    expect(result.index.total).toBe(0);
    expect(result.index.dataset).toBeNull();
    expect(result.report.filesDiscovered).toBe(0);
  });
});
