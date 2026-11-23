import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeArtifacts } from "../../../src/lib/content/artifacts";
import { ANSWER_SECTION_KEYS } from "../../../src/lib/curriculum";
import { searchQuestionIds } from "../../../src/lib/search/search";
import { createWorkspace, loadRealBatch, makeBatch, type TestWorkspace } from "../../helpers/workspace";

let workspace: TestWorkspace;
beforeEach(async () => {
  workspace = await createWorkspace();
});
afterEach(async () => {
  await workspace.dispose();
});

describe("normalisation of the real batch", () => {
  it("produces a summary index and a full record for every question", async () => {
    await workspace.write("beginner/beginner_01_questions_001_005.json", await loadRealBatch());
    const { index, records, report } = await workspace.ingest();

    expect(report.errors).toBe(0);
    expect(index.total).toBe(5);
    expect(index.questions.map((q) => q.id)).toEqual(["ANG-BEG-001", "ANG-BEG-002", "ANG-BEG-003", "ANG-BEG-004", "ANG-BEG-005"]);
    expect(records).toHaveLength(5);

    const first = index.questions[0];
    expect(first).toMatchObject({
      id: "ANG-BEG-001",
      sequence: 1,
      difficulty: "beginner",
      questionType: "conceptual",
      priority: "critical",
    });
    expect(first.topic.length).toBeGreaterThan(0);
    expect(first.domain.length).toBeGreaterThan(0);
    expect(first.readingMinutes).toBeGreaterThan(0);
    expect(first.diagramCount).toBeGreaterThanOrEqual(1);
    expect(first.tags.length).toBeGreaterThan(0);
  });

  it("keeps the index free of answer bodies so it stays small", async () => {
    await workspace.write("beginner/beginner_01_questions_001_005.json", await loadRealBatch());
    const { index } = await workspace.ingest();
    const serialised = JSON.stringify(index);
    expect(serialised).not.toContain("endToEndFlow");
    expect(serialised).not.toContain("codeExample");
    expect(Object.keys(index.questions[0])).not.toContain("answer");
  });

  it("keeps all 15 answer sections in the declared order on every record", async () => {
    await workspace.write("beginner/beginner_01_questions_001_005.json", await loadRealBatch());
    const { records } = await workspace.ingest();
    for (const record of records) {
      expect(record.answerSectionOrder).toEqual([...ANSWER_SECTION_KEYS]);
      for (const key of ANSWER_SECTION_KEYS) expect(record.answer).toHaveProperty(key);
      expect(Object.keys(record.sectionSeconds).sort()).toEqual([...ANSWER_SECTION_KEYS].sort());
    }
  });

  it("estimates more reading time for code-heavy sections than for a one-line definition", async () => {
    await workspace.write("beginner/beginner_01_questions_001_005.json", await loadRealBatch());
    const { records } = await workspace.ingest();
    expect(records[0].sectionSeconds.codeExample).toBeGreaterThan(records[0].sectionSeconds.definition);
  });

  it("never mutates the source JSON", async () => {
    const real = await loadRealBatch();
    const before = JSON.stringify(real);
    await workspace.write("beginner/beginner_01_questions_001_005.json", real);
    await workspace.ingest();
    expect(JSON.stringify(real)).toBe(before);
  });

  it("orders the index by curriculum regardless of file names or discovery order", async () => {
    await workspace.write("beginner/zzz_last_alphabetically.json", await makeBatch({ sequences: [1, 2], batchId: "b-1" }));
    await workspace.write("beginner/aaa_first_alphabetically.json", await makeBatch({ sequences: [3, 4], batchId: "b-2" }));
    await workspace.write("advanced/advanced_01.json", await makeBatch({ difficulty: "advanced", sequences: [1], batchId: "adv-1" }));
    const { index } = await workspace.ingest();
    expect(index.questions.map((q) => q.id)).toEqual(["ANG-BEG-001", "ANG-BEG-002", "ANG-BEG-003", "ANG-BEG-004", "ANG-ADV-001"]);
  });
});

describe("partial datasets", () => {
  it("handles an empty questions directory without errors", async () => {
    const { index, report } = await workspace.ingest();
    expect(index.total).toBe(0);
    expect(index.questions).toEqual([]);
    expect(report.errors).toBe(0);
  });

  it("loads valid files and rejects only the broken one", async () => {
    await workspace.write("beginner/good.json", await makeBatch({ sequences: [1, 2], batchId: "good" }));
    await workspace.write("beginner/broken.json", "{ this is not json");
    const { index, report } = await workspace.ingest();
    expect(index.total).toBe(2);
    expect(report.filesRejected).toBe(1);
    expect(report.errors).toBeGreaterThan(0);
  });
});

describe("extensibility: new content needs no application changes", () => {
  it("adds a sixth question from a new batch and makes it searchable", async () => {
    await workspace.write("beginner/beginner_01_questions_001_005.json", await loadRealBatch());
    const before = await workspace.ingest();
    expect(before.index.total).toBe(5);

    await workspace.write("beginner/beginner_02_questions_006_010.json", await makeBatch({ sequences: [6], rangeStart: 6, rangeEnd: 10, batchId: "beginner-02" }));
    const after = await workspace.ingest();

    expect(after.report.errors).toBe(0);
    expect(after.index.total).toBe(6);
    expect(after.index.questions.at(-1)?.id).toBe("ANG-BEG-006");

    // Searchable by id, by number and by title, using the same search code the UI uses.
    expect(searchQuestionIds(after.index.questions, "ANG-BEG-006")).toEqual(["ANG-BEG-006"]);
    expect(searchQuestionIds(after.index.questions, "#6")).toEqual(["ANG-BEG-006"]);
    expect(searchQuestionIds(after.index.questions, "Synthetic test topic")).toEqual(["ANG-BEG-006"]);

    // A full record exists for the question page to render.
    expect(after.records.find((r) => r.id === "ANG-BEG-006")?.answerSectionOrder).toHaveLength(15);
  });

  it("surfaces a brand-new level without touching code", async () => {
    await workspace.write("intermediate/intermediate_01.json", await makeBatch({ difficulty: "intermediate", sequences: [1, 2, 3], batchId: "int-1" }));
    const { index } = await workspace.ingest();
    expect(index.questions.every((q) => q.difficulty === "intermediate")).toBe(true);
    expect(index.questions.map((q) => q.id)).toEqual(["ANG-INT-001", "ANG-INT-002", "ANG-INT-003"]);
  });
});

describe("content repository (what the server pages read)", () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
    vi.resetModules();
    vi.doUnmock("server-only");
  });

  async function openRepository() {
    const result = await workspace.ingest();
    await writeArtifacts(result, workspace.paths);
    process.chdir(workspace.paths.root);
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    return (await import("../../../src/lib/content/repository")).contentRepository;
  }

  it("serves neighbours for navigation, including a newly added sixth question", async () => {
    await workspace.write("beginner/beginner_01_questions_001_005.json", await loadRealBatch());
    await workspace.write("beginner/beginner_02_questions_006_010.json", await makeBatch({ sequences: [6], rangeStart: 6, rangeEnd: 10, batchId: "beginner-02" }));
    const repository = await openRepository();

    const middle = await repository.getNeighbors("ANG-BEG-005");
    expect(middle).toMatchObject({ position: 5, total: 6 });
    expect(middle?.previous?.id).toBe("ANG-BEG-004");
    expect(middle?.next?.id).toBe("ANG-BEG-006");

    const last = await repository.getNeighbors("ANG-BEG-006");
    expect(last?.next).toBeNull();
    const first = await repository.getNeighbors("ANG-BEG-001");
    expect(first?.previous).toBeNull();
  });

  it("returns a record for a known id and null for unknown or malicious ids", async () => {
    await workspace.write("beginner/beginner_01_questions_001_005.json", await loadRealBatch());
    const repository = await openRepository();

    expect((await repository.getQuestion("ANG-BEG-002"))?.id).toBe("ANG-BEG-002");
    expect(await repository.getQuestion("ANG-BEG-999")).toBeNull();
    expect(await repository.getQuestion("../../package")).toBeNull();
    expect(await repository.getQuestion(path.join("..", "x"))).toBeNull();
    expect(await repository.getNeighbors("ANG-BEG-999")).toBeNull();
  });

  it("reports content as not built, instead of crashing, when nothing was generated", async () => {
    process.chdir(workspace.paths.root);
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    const { contentRepository, ContentNotBuiltError } = await import("../../../src/lib/content/repository");
    await expect(contentRepository.getIndex()).rejects.toBeInstanceOf(ContentNotBuiltError);
    expect(await contentRepository.getQuestion("ANG-BEG-001")).toBeNull();
    expect(await contentRepository.getProjects()).toEqual([]);
  });
});
