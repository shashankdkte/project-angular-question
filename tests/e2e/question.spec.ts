import { expect, test, type Page } from "./fixtures";
import { ANSWER_SECTION_KEYS, READING_MODE_META } from "../../src/lib/curriculum";
import { realQuestions } from "./data";

const first = realQuestions[0];
const openSections = (page: Page) => page.locator('[data-testid="answer-sections"] [data-section][data-state="open"]');
const allSections = (page: Page) => page.locator('[data-testid="answer-sections"] [data-section]');
const mode = (page: Page, name: string) => page.getByRole("tab", { name, exact: true });

test.describe("question detail: content", () => {
  for (const question of realQuestions) {
    test(`${question.id}: all 15 sections, code, diagram, comparison and follow-up tabs render`, async ({ page }) => {
      await page.goto(`/questions/${question.id}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(question.topic);
      await mode(page, "Deep Dive").click();

      await expect(allSections(page)).toHaveCount(ANSWER_SECTION_KEYS.length);
      await expect(openSections(page)).toHaveCount(ANSWER_SECTION_KEYS.length);
      for (const key of ANSWER_SECTION_KEYS) await expect(page.locator(`[data-section="${key}"]`)).toBeVisible();

      // Syntax-highlighted code (server-side Shiki), never executed.
      const code = page.locator("#codeExample pre.shiki").first();
      await code.scrollIntoViewIfNeeded();
      await expect(code).toBeVisible();
      await expect(code.locator('span[style*="--shiki-light"]').first()).toBeVisible();

      // Mermaid renders without falling back.
      const diagram = page.locator("#endToEndFlow").getByTestId("mermaid-diagram").first();
      await diagram.scrollIntoViewIfNeeded();
      await expect(diagram.locator("svg").first()).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId("diagram-fallback")).toHaveCount(0);

      // Alternatives are a table with one row per alternative.
      const table = page.locator("#alternatives").getByRole("table");
      await table.scrollIntoViewIfNeeded();
      await expect(table.getByRole("row")).toHaveCount(question.answer.alternatives.length + 1);

      // Follow-ups: one tab per level; switching shows that level's content.
      const followUps = page.locator("#followUps");
      await followUps.scrollIntoViewIfNeeded();
      await expect(followUps.getByRole("tab")).toHaveCount(4);
      for (const level of ["Beginner", "Intermediate", "Advanced", "Expert"]) {
        await followUps.getByRole("tab", { name: new RegExp(`^${level}`) }).click();
        await expect(followUps.getByRole("tabpanel")).toBeVisible();
      }

      await expect(page.getByTestId("empty-state")).toHaveCount(0);
    });
  }

  test("project experience is clearly labelled as hypothetical", async ({ page }) => {
    await page.goto(`/questions/${first.id}#projectExperience`);
    const section = page.locator("#projectExperience");
    await expect(section).toContainText("Hypothetical");
    await expect(section).toContainText(/not experience you already have/i);
    await expect(section).not.toContainText("Verified experience");
    await expect(section).toContainText("Do not claim");
  });

  test("code controls: line numbers and wrapping toggle, copy works", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/questions/${first.id}#codeExample`);
    const frame = page.locator("#codeExample [data-line-numbers]").first();
    const lineNumbers = page.locator("#codeExample").getByRole("button", { name: "Show line numbers" });
    const wrap = page.locator("#codeExample").getByRole("button", { name: "Wrap long lines" });

    await expect(lineNumbers).toHaveAttribute("aria-pressed", "true");
    await expect(frame).toHaveAttribute("data-line-numbers", "true");
    await lineNumbers.click();
    await expect(frame).toHaveAttribute("data-line-numbers", "false");

    await expect(frame).toHaveAttribute("data-wrap", "false");
    await wrap.click();
    await expect(frame).toHaveAttribute("data-wrap", "true");

    await page.locator("#codeExample").getByRole("button", { name: "Copy code" }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    // Exactly the source code: no line numbers or highlighting markup leak into the clipboard.
    // (Chromium on Windows reads the clipboard back with CRLF line endings, so normalise those.)
    const normalise = (text: string) => text.replace(/\r\n/g, "\n").trimEnd();
    expect(normalise(copied)).toBe(normalise(first.answer.codeExample.code));
  });

  test("definition can be copied", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/questions/${first.id}`);
    await page.getByRole("button", { name: "Copy definition" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(first.answer.definition.text);
  });

  test("diagram controls: zoom, reset, full screen, copy source and download", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/questions/${first.id}#endToEndFlow`);
    const diagram = page.locator("#endToEndFlow").getByTestId("mermaid-diagram").first();
    await expect(diagram.locator("svg").first()).toBeVisible({ timeout: 20_000 });

    const zoom = diagram.getByTestId("diagram-zoom");
    await expect(zoom).toHaveText("100%");
    await diagram.getByRole("button", { name: /zoom in/i }).click();
    await expect(zoom).not.toHaveText("100%");
    await diagram.getByRole("button", { name: /reset/i }).click();
    await expect(zoom).toHaveText("100%");

    const download = page.waitForEvent("download");
    await diagram.getByRole("button", { name: "Download SVG" }).click();
    expect((await download).suggestedFilename()).toMatch(/\.svg$/);

    await diagram.getByRole("button", { name: "Open diagram full screen" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("svg").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    // Focus returns to the control that opened it.
    await expect(diagram.getByRole("button", { name: "Open diagram full screen" })).toBeFocused();
  });
});

test.describe("question detail: reading modes", () => {
  test("Standard is the default and Quick/Deep change only what is expanded", async ({ page }) => {
    await page.goto(`/questions/${first.id}`);
    await expect(mode(page, "Standard Learning")).toHaveAttribute("aria-selected", "true");
    await expect(openSections(page)).toHaveCount(READING_MODE_META.standard.expanded.length);

    await mode(page, "Quick Review").click();
    await expect(openSections(page)).toHaveCount(READING_MODE_META.quick.expanded.length);
    // Nothing is deleted: every section is still there to expand.
    await expect(allSections(page)).toHaveCount(ANSWER_SECTION_KEYS.length);

    await mode(page, "Deep Dive").click();
    await expect(openSections(page)).toHaveCount(ANSWER_SECTION_KEYS.length);
  });

  test("any section can be expanded individually in Quick mode", async ({ page }) => {
    await page.goto(`/questions/${first.id}`);
    await mode(page, "Quick Review").click();
    const trigger = page.locator('[data-section="pitfalls"]').getByRole("button").first();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(openSections(page)).toHaveCount(READING_MODE_META.quick.expanded.length + 1);
  });

  test("expand all / collapse all", async ({ page }) => {
    await page.goto(`/questions/${first.id}`);
    await page.getByRole("button", { name: "Expand all sections" }).click();
    await expect(openSections(page)).toHaveCount(ANSWER_SECTION_KEYS.length);
    await page.getByRole("button", { name: "Collapse all sections" }).click();
    await expect(openSections(page)).toHaveCount(0);
  });

  test("the chosen mode survives a refresh", async ({ page }) => {
    await page.goto(`/questions/${first.id}`);
    await mode(page, "Deep Dive").click();
    await page.reload();
    await expect(mode(page, "Deep Dive")).toHaveAttribute("aria-selected", "true");
    await expect(openSections(page)).toHaveCount(ANSWER_SECTION_KEYS.length);
  });

  test("the reading-time estimate changes with the mode", async ({ page }) => {
    await page.goto(`/questions/${first.id}`);
    const minutes = async () => Number(/~(\d+) min/.exec((await page.getByTestId("reading-time").textContent()) ?? "")?.[1]);
    await mode(page, "Quick Review").click();
    const quick = await minutes();
    await mode(page, "Deep Dive").click();
    expect(await minutes()).toBeGreaterThan(quick);
  });
});

test.describe("question detail: navigation", () => {
  test("on-this-page navigation opens and scrolls to a section, and updates the URL hash", async ({ page }) => {
    await page.goto(`/questions/${first.id}`);
    const toc = page.getByRole("navigation", { name: "On this page" });
    await expect(toc.getByRole("link")).toHaveCount(ANSWER_SECTION_KEYS.length);

    await expect(page.locator('[data-section="alternatives"]')).toHaveAttribute("data-state", "closed");
    await toc.getByRole("link", { name: /Alternatives/ }).click();
    await expect(page.locator('[data-section="alternatives"]')).toHaveAttribute("data-state", "open");
    await expect(page).toHaveURL(/#alternatives$/);
    await expect(page.locator("#alternatives")).toBeInViewport();
    await expect(toc.getByRole("link", { name: /Alternatives/ })).toHaveAttribute("aria-current", "location");
  });

  test("a deep link opens its section directly", async ({ page }) => {
    await page.goto(`/questions/${first.id}#testing`);
    await expect(page.locator('[data-section="testing"]')).toHaveAttribute("data-state", "open");
    await expect(page.locator("#testing")).toBeInViewport();
  });

  test("previous / next and the [ ] keys move through questions", async ({ page }) => {
    await page.goto(`/questions/${realQuestions[0].id}`);
    await expect(page.getByTestId("question-position")).toHaveText(`Question 1 of ${realQuestions.length} loaded`);
    await expect(page.getByRole("button", { name: /previous/i }).first()).toBeDisabled();

    await page.getByRole("navigation", { name: "Question navigation" }).getByRole("link", { name: /next/i }).click();
    await expect(page).toHaveURL(new RegExp(`/questions/${realQuestions[1].id}$`));

    await page.keyboard.press("]");
    await expect(page).toHaveURL(new RegExp(`/questions/${realQuestions[2].id}$`));
    await page.keyboard.press("[");
    await expect(page).toHaveURL(new RegExp(`/questions/${realQuestions[1].id}$`));
  });

  test("previous / next follow the filtered results and Back to results restores them", async ({ page }) => {
    await page.goto("/questions");
    const matching = page.getByTestId("question-row");
    await expect(matching.first()).toBeVisible();
    const unfiltered = await matching.count();
    await page.getByTestId("explorer-search").fill("difference");
    // The list updates a moment after typing (deferred query), so wait for it to narrow before counting.
    await expect(matching).not.toHaveCount(unfiltered);
    const total = await matching.count();
    expect(total).toBeGreaterThan(1);

    await matching.first().getByRole("link").click();
    await expect(page.getByTestId("question-position")).toHaveText(`Result 1 of ${total}`);

    await page.getByRole("link", { name: "Back to results" }).click();
    await expect(page).toHaveURL(/q=difference/);
    await expect(page.getByTestId("explorer-search")).toHaveValue("difference");
    await expect(page.getByTestId("question-row")).toHaveCount(total);
  });

  test("breadcrumbs link back to the level and the list", async ({ page }) => {
    await page.goto(`/questions/${first.id}`);
    const crumbs = page.getByRole("navigation", { name: "breadcrumb" });
    await crumbs.getByRole("link", { name: "Beginner" }).click();
    await expect(page).toHaveURL(/\/levels\/beginner$/);
  });
});
