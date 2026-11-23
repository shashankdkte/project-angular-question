// @vitest-environment jsdom
import * as React from "react";
import { screen } from "@testing-library/react";
import { render } from "../../helpers/render";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MermaidDiagram } from "@/components/diagrams/mermaid-diagram";
import { findUnsafeConstruct } from "@/lib/diagrams/mermaid-safety";
import { isSvgSafeToDownload } from "@/lib/diagrams/mermaid-loader";

const mermaidMock = vi.hoisted(() => ({ initialize: vi.fn(), parse: vi.fn(), render: vi.fn() }));
vi.mock("mermaid", () => ({ default: mermaidMock }));

const VALID = "flowchart TD\n  A[Start] --> B[End]";

beforeEach(() => {
  mermaidMock.initialize.mockReset();
  mermaidMock.parse.mockReset().mockResolvedValue(undefined);
  mermaidMock.render.mockReset().mockResolvedValue({ svg: '<svg role="img" aria-label="rendered"><g></g></svg>' });
});

describe("<MermaidDiagram />", () => {
  it("renders a valid diagram with strict security settings", async () => {
    render(<MermaidDiagram source={VALID} title="Flow" description="Start to end." id="d1" />);
    expect(await screen.findByRole("img", { name: "rendered" })).toBeInTheDocument();
    expect(mermaidMock.initialize).toHaveBeenCalledWith(expect.objectContaining({ securityLevel: "strict", startOnLoad: false, htmlLabels: false }));
    expect(screen.queryByTestId("diagram-fallback")).not.toBeInTheDocument();
  });

  it("falls back to raw source and a text description when the syntax is invalid", async () => {
    mermaidMock.parse.mockRejectedValue(new Error("Parse error on line 2:\n...-->\nExpecting 'SEMI', got 'NEWLINE'"));
    render(
      <div>
        <p>Content beside the diagram stays visible</p>
        <MermaidDiagram source={"flowchart TD\n  A -->"} title="Broken flow" description="A leads nowhere." />
      </div>,
    );
    const fallback = await screen.findByTestId("diagram-fallback");
    expect(fallback).toHaveTextContent("could not be displayed");
    expect(fallback).toHaveTextContent("Parse error on line 2");
    expect(fallback).toHaveTextContent("A leads nowhere.");
    expect(fallback.querySelector("details pre")?.textContent).toContain("flowchart TD");
    expect(screen.getByText("Content beside the diagram stays visible")).toBeInTheDocument();
  });

  it("falls back when rendering itself throws, without crashing the page", async () => {
    mermaidMock.render.mockRejectedValue(new Error("Maximum text size in diagram exceeded"));
    render(<MermaidDiagram source={VALID} title="Too big" />);
    expect(await screen.findByTestId("diagram-fallback")).toHaveTextContent("Maximum text size");
  });

  it.each([
    ["click handlers", "flowchart TD\n  A --> B\n  click A callback"],
    ["javascript: URLs", 'flowchart TD\n  A --> B\n  click A href "javascript:alert(1)"'],
    ["embedded HTML", "flowchart TD\n  A[<img src=x onerror=alert(1)>] --> B"],
    ["config directives", "%%{init: {'securityLevel': 'loose'}}%%\nflowchart TD\n  A --> B"],
  ])("refuses to render a diagram containing %s", async (_label, source) => {
    expect(findUnsafeConstruct(source)).not.toBeNull();
    render(<MermaidDiagram source={source} title="Unsafe" />);
    const fallback = await screen.findByTestId("diagram-fallback");
    expect(fallback).toHaveTextContent(/not rendered for safety/i);
    expect(mermaidMock.parse).not.toHaveBeenCalled();
    expect(mermaidMock.render).not.toHaveBeenCalled();
  });

  it("offers controls on a rendered diagram: zoom, copy source, download, full screen", async () => {
    render(<MermaidDiagram source={VALID} title="Flow" />);
    await screen.findByRole("img", { name: "rendered" });
    for (const name of [/zoom in/i, /zoom out/i, /reset/i, /copy.*source/i, /download/i, /full.?screen|expand/i]) {
      expect(screen.getAllByRole("button", { name }).length, String(name)).toBeGreaterThan(0);
    }
  });
});

describe("mermaid safety helpers", () => {
  it("accepts ordinary diagrams", () => {
    expect(findUnsafeConstruct(VALID)).toBeNull();
    expect(findUnsafeConstruct("sequenceDiagram\n  Alice->>Bob: Hello")).toBeNull();
  });

  it("only offers SVG download when the generated SVG has no script-like content", () => {
    expect(isSvgSafeToDownload('<svg><g><text>ok</text></g></svg>')).toBe(true);
    expect(isSvgSafeToDownload("<svg><script>alert(1)</script></svg>")).toBe(false);
    expect(isSvgSafeToDownload('<svg onload="x()"></svg>')).toBe(false);
    expect(isSvgSafeToDownload('<svg><foreignObject></foreignObject></svg>')).toBe(false);
    expect(isSvgSafeToDownload('<svg><a href="javascript:alert(1)"></a></svg>')).toBe(false);
  });
});
