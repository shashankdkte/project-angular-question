// @vitest-environment jsdom
import * as React from "react";
import { screen, within } from "@testing-library/react";
import { render } from "../../helpers/render";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { renderAnswerSection } from "@/components/answer-sections/registry";
import { AlternativesSection, FinalTakeaway, ProjectExperienceSection } from "@/components/answer-sections/sections-technical";
import { QuestionHeader } from "@/components/questions/question-header";
import { ANSWER_SECTION_KEYS, sectionTitle } from "@/lib/curriculum";
import type { Answer, QuestionRecord } from "@/types/content";
import { createWorkspace, loadRealBatch } from "../../helpers/workspace";

// Shiki highlighting is a server-only concern (covered by the Playwright suite); here the code block is a stand-in.
vi.mock("@/components/code/code-block", () => ({
  CodeBlock: ({ code, language, variant }: { code: string; language: string; variant?: string }) => (
    <pre data-testid="code-block" data-language={language} data-variant={variant}>
      {code}
    </pre>
  ),
}));

const mermaidMock = vi.hoisted(() => ({ initialize: vi.fn(), parse: vi.fn(), render: vi.fn() }));
vi.mock("mermaid", () => ({ default: mermaidMock }));

let records: QuestionRecord[] = [];

beforeAll(async () => {
  const workspace = await createWorkspace();
  try {
    await workspace.write("beginner/real.json", await loadRealBatch());
    records = (await workspace.ingest()).records as QuestionRecord[];
  } finally {
    await workspace.dispose();
  }
});

beforeEach(() => {
  mermaidMock.initialize.mockReset();
  mermaidMock.parse.mockReset().mockResolvedValue(undefined);
  mermaidMock.render.mockReset().mockResolvedValue({ svg: '<svg role="img" aria-label="rendered"><g></g></svg>' });
});

afterEach(() => vi.clearAllMocks());

const section = (key: string, answer: Answer) => render(<>{renderAnswerSection(key, answer)}</>);
const clone = <T,>(value: T): T => structuredClone(value);

describe("question detail: all 15 sections render for the real data", () => {
  it("has five real questions loaded for the suite", () => {
    expect(records).toHaveLength(5);
  });

  it("renders every section of every question with visible content and no errors", () => {
    for (const record of records) {
      expect(record.answerSectionOrder).toHaveLength(15);
      for (const key of record.answerSectionOrder) {
        const { container, unmount } = section(key, record.answer);
        expect(container.textContent?.trim().length, `${record.id} / ${key} rendered nothing`).toBeGreaterThan(0);
        unmount();
      }
    }
  });

  it("has a title for every section key", () => {
    for (const key of ANSWER_SECTION_KEYS) expect(sectionTitle(key).length).toBeGreaterThan(0);
  });

  it("definition: shows the text as a quote with a copy button", () => {
    section("definition", records[0].answer);
    expect(screen.getByText(records[0].answer.definition.text)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy definition/i })).toBeInTheDocument();
  });

  it("problem solved: before/after and benefits", () => {
    section("problemSolved", records[0].answer);
    expect(screen.getByText("Before")).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
    for (const benefit of records[0].answer.problemSolved.benefits) expect(screen.getByText(benefit)).toBeInTheDocument();
  });

  it("code example: shows the code, its language, and states it is never executed", () => {
    section("codeExample", records[0].answer);
    const block = screen.getByTestId("code-block");
    expect(block).toHaveAttribute("data-language", records[0].answer.codeExample.language);
    expect(block.textContent).toBe(records[0].answer.codeExample.code);
    expect(screen.getByText(/never executed/i)).toBeInTheDocument();
  });

  it("alternatives: one table column per property actually present", () => {
    section("alternatives", records[0].answer);
    const table = screen.getByRole("table");
    const keys = new Set<string>();
    for (const alternative of records[0].answer.alternatives as unknown as Array<Record<string, unknown>>) {
      Object.keys(alternative).filter((key) => key !== "name").forEach((key) => keys.add(key));
    }
    expect(within(table).getAllByRole("columnheader")).toHaveLength(keys.size + 1);
    expect(within(table).getAllByRole("row")).toHaveLength(records[0].answer.alternatives.length + 1);
  });

  it("alternatives: does not assume every item has the same properties", () => {
    const data = [
      { name: "Option A", bestFor: "Small teams" },
      { name: "Option B", tradeoff: "Heavier setup", riskLevel: "Low" },
    ] as unknown as Answer["alternatives"];
    render(<AlternativesSection data={data} />);
    const table = screen.getByRole("table");
    // Known keys get friendly labels; unknown keys still become columns with a readable fallback.
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Alternative", "Best for", "Trade-off", "Risk Level"]);
    expect(screen.getByText("Small teams")).toBeInTheDocument();
    expect(screen.getByText("Heavier setup")).toBeInTheDocument();
  });

  it("testing: strategy, cases and a highlighted shell command", () => {
    section("testing", records[0].answer);
    expect(screen.getByText("Testing strategy")).toBeInTheDocument();
    const blocks = screen.getAllByTestId("code-block");
    expect(blocks.some((block) => block.getAttribute("data-language") === "bash")).toBe(true);
  });

  it("follow-ups: four level tabs, switching shows that level's questions", async () => {
    const user = userEvent.setup();
    const answer = records[0].answer;
    section("followUps", answer);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent?.replace(/\d+$/, ""))).toEqual(["Beginner", "Intermediate", "Advanced", "Expert"]);

    await user.click(screen.getByRole("tab", { name: /intermediate/i }));
    const first = answer.followUps.intermediate[0];
    expect(screen.getByRole("tabpanel")).toHaveTextContent(first.slice(0, 25));
  });

  it("end-to-end flow: lists the steps and renders the diagram", async () => {
    section("endToEndFlow", records[0].answer);
    expect(screen.getByRole("list", { name: /step-by-step/i })).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "rendered" })).toBeInTheDocument();
  });
});

describe("project experience honesty", () => {
  const base = { status: "hypothetical", example: "Add an audit trail.", evidenceToCollect: ["Link to the PR"], doNotClaim: "Do not say you shipped it." };

  it("labels hypothetical work and never calls it experience", () => {
    render(<ProjectExperienceSection data={base as Answer["projectExperience"]} />);
    expect(screen.getByText("Hypothetical")).toBeInTheDocument();
    expect(screen.getByText(/not experience you already have/i)).toBeInTheDocument();
    expect(screen.queryByText(/verified experience/i)).not.toBeInTheDocument();
    expect(screen.getByText("Link to the PR")).toBeInTheDocument();
    expect(screen.getByText("Do not claim")).toBeInTheDocument();
  });

  it("only shows 'Verified experience' when the data says verified", () => {
    render(<ProjectExperienceSection data={{ ...base, status: "verified" } as Answer["projectExperience"]} />);
    expect(screen.getByText("Verified experience")).toBeInTheDocument();
  });

  it("treats any other status as unverified", () => {
    render(<ProjectExperienceSection data={{ ...base, status: "in-review" } as Answer["projectExperience"]} />);
    expect(screen.getByText(/Unverified \(in-review\)/)).toBeInTheDocument();
    expect(screen.queryByText("Verified experience")).not.toBeInTheDocument();
  });
});

describe("missing optional metadata and unknown content", () => {
  it("renders code without filename, runtime or explanation", () => {
    const answer = clone(records[0].answer);
    delete (answer.codeExample as Record<string, unknown>).filename;
    delete (answer.codeExample as Record<string, unknown>).runtime;
    answer.codeExample.explanation = [];
    section("codeExample", answer);
    expect(screen.getByTestId("code-block")).toBeInTheDocument();
    expect(screen.queryByText(/what to notice/i)).not.toBeInTheDocument();
  });

  it("renders a diagram without a caption, and a flow with no steps or diagrams", async () => {
    const answer = clone(records[0].answer);
    answer.endToEndFlow.diagrams.forEach((d) => delete (d as Record<string, unknown>).caption);
    section("endToEndFlow", answer);
    expect(await screen.findByRole("img", { name: "rendered" })).toBeInTheDocument();

    const empty = clone(records[0].answer);
    empty.endToEndFlow = { steps: [], diagrams: [] };
    section("endToEndFlow", empty);
    expect(screen.getByText(/no flow steps or diagrams/i)).toBeInTheDocument();
  });

  it("renders empty alternatives, empty follow-up levels and an absent do-not-claim", () => {
    const answer = clone(records[0].answer);
    answer.alternatives = [];
    answer.followUps = { beginner: [], intermediate: [], advanced: [], expert: [] } as Answer["followUps"];
    delete (answer.projectExperience as Record<string, unknown>).doNotClaim;
    section("alternatives", answer);
    expect(screen.getByText(/no alternatives were listed/i)).toBeInTheDocument();
    section("followUps", answer);
    expect(screen.getAllByText(/follow-up questions were provided/i).length).toBeGreaterThan(0);
    section("projectExperience", answer);
    expect(screen.queryByText("Do not claim")).not.toBeInTheDocument();
  });

  it("shows unknown extra fields under 'Additional details' instead of dropping them", () => {
    const answer = clone(records[0].answer) as Answer & { definition: Record<string, unknown> };
    answer.definition.extraNote = "A field from a future schema";
    section("definition", answer);
    expect(screen.getByText(/additional details/i)).toBeInTheDocument();
    expect(screen.getByText(/future schema/i)).toBeInTheDocument();
  });

  it("falls back to a generic renderer for a section the registry does not know", () => {
    const answer = { ...clone(records[0].answer), brandNewSection: { headline: "Hello from a new section", points: ["one", "two"] } } as Answer;
    section("brandNewSection", answer);
    expect(screen.getByText("Hello from a new section")).toBeInTheDocument();
    expect(screen.getByText("two")).toBeInTheDocument();
  });

  it("renders the header with fewer roles/industries, and no tags", () => {
    const record = clone(records[0]);
    record.tags = [];
    record.roles = ["technical-lead"];
    record.industries = ["banking", "saas"];
    render(<QuestionHeader question={record} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(record.topic);
    expect(screen.getByText("Technical Lead")).toBeInTheDocument();
    expect(screen.getByText(/Banking, Enterprise SaaS/)).toBeInTheDocument();
    expect(screen.queryByText("Tags")).not.toBeInTheDocument();
    expect(screen.getByText("Quick answer")).toBeInTheDocument();
  });

  it("renders the final takeaway", () => {
    render(<FinalTakeaway text="Prefer const." />);
    expect(screen.getByText("Prefer const.")).toBeInTheDocument();
  });
});
