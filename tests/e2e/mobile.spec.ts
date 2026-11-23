import { expect, test, type Page } from "./fixtures";
import { realQuestions } from "./data";

const first = realQuestions[0];

const hasHorizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

test.describe("mobile viewport", () => {
  test("pages do not scroll horizontally", async ({ page }) => {
    for (const url of ["/", "/questions", "/progress", `/questions/${first.id}`]) {
      await page.goto(url);
      await expect(page.getByRole("heading").first()).toBeVisible();
      expect(await hasHorizontalOverflow(page), `${url} overflows horizontally`).toBe(false);
    }
  });

  test("navigation drawer opens, navigates and closes", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link", { name: "All Questions" }).click();
    await expect(page).toHaveURL(/\/questions$/);
    await expect(drawer).toBeHidden();
  });

  test("filters collapse behind a button, search stays visible", async ({ page }) => {
    await page.goto("/questions");
    await expect(page.getByTestId("explorer-search")).toBeVisible();
    const priority = page.getByRole("combobox", { name: "Priority", exact: true });
    await expect(priority).toBeHidden();
    await page.getByRole("button", { name: /^Filters/ }).click();
    await expect(priority).toBeVisible();

    await page.getByTestId("explorer-search").fill("closures");
    await expect(page.getByTestId("question-row").first()).toContainText("ANG-BEG-003");
  });

  test("reading a question: compact contents menu jumps to a section", async ({ page }) => {
    await page.goto(`/questions/${first.id}`);
    await expect(page.getByRole("complementary", { name: "Question tools" })).toBeHidden();

    await page.getByRole("button", { name: "Jump to section" }).click();
    await page.getByRole("menuitem", { name: /Testing/ }).click();
    await expect(page.locator('[data-section="testing"]')).toHaveAttribute("data-state", "open");
    await expect(page.locator("#testing")).toBeInViewport();
  });

  test("reading modes work on mobile", async ({ page }) => {
    await page.goto(`/questions/${first.id}`);
    await page.getByRole("tab", { name: "Deep Dive" }).click();
    await expect(page.locator('[data-testid="answer-sections"] [data-section][data-state="open"]')).toHaveCount(15);
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test("code and diagrams scroll inside their own containers", async ({ page }) => {
    await page.goto(`/questions/${first.id}#codeExample`);
    const code = page.locator("#codeExample pre.shiki").first();
    await expect(code).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);

    await page.goto(`/questions/${first.id}#endToEndFlow`);
    await expect(page.locator("#endToEndFlow").getByTestId("mermaid-diagram").locator("svg").first()).toBeVisible({ timeout: 20_000 });
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test("bookmark and mark mastered from the mobile panel, then refresh", async ({ page }) => {
    await page.goto(`/questions/${first.id}`);
    const panel = page.getByRole("region", { name: "Track this question" });
    await panel.scrollIntoViewIfNeeded();
    await expect(panel.getByRole("button", { name: "Bookmark" })).toBeEnabled();

    await panel.getByRole("button", { name: "Bookmark" }).click();
    await panel.getByRole("button", { name: "Mark as mastered" }).click();
    await expect(panel.getByRole("button", { name: /mastered · undo/i })).toBeVisible();

    await page.reload();
    const again = page.getByRole("region", { name: "Track this question" });
    await again.scrollIntoViewIfNeeded();
    await expect(again.getByRole("button", { name: "Bookmarked" })).toHaveAttribute("aria-pressed", "true");
    await expect(again.getByRole("button", { name: /mastered · undo/i })).toBeVisible();
  });
});
