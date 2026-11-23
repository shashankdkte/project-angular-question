// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import mermaid from "mermaid";
import { findUnsafeConstruct } from "../../../src/lib/diagrams/mermaid-safety";
import { loadRealBatch } from "../../helpers/workspace";

/**
 * Parses every diagram in the real batch with the real Mermaid parser (no rendering needed),
 * so a syntax error in content is caught by the test suite and not just at runtime.
 */
describe("real Mermaid diagrams", () => {
  it("every diagram in the real batch is safe and parses", async () => {
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", logLevel: "fatal", suppressErrorRendering: true });
    const batch = await loadRealBatch();
    let count = 0;
    for (const question of batch.questions) {
      for (const diagram of question.answer.endToEndFlow.diagrams) {
        count += 1;
        expect(findUnsafeConstruct(diagram.mermaid), `${question.id} / ${diagram.id}`).toBeNull();
        await expect(mermaid.parse(diagram.mermaid), `${question.id} / ${diagram.id}`).resolves.toBeTruthy();
      }
    }
    expect(count).toBeGreaterThanOrEqual(5);
  });

  it("rejects syntactically invalid Mermaid", async () => {
    await expect(mermaid.parse("flowchart TD\n  A -->")).rejects.toBeDefined();
  });
});
