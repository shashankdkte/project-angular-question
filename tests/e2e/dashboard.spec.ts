import { expect, test } from "./fixtures";
import { CURRICULUM_TARGET, DIFFICULTY_META } from "../../src/lib/curriculum";
import { countBy, realQuestions } from "./data";

test.describe("dashboard", () => {
  test("shows counts derived from the loaded data, against the fixed 600 target", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

    await expect(page.getByTestId("stat-curriculum-target")).toHaveText(String(CURRICULUM_TARGET));
    await expect(page.getByTestId("stat-loaded")).toHaveText(String(realQuestions.length));
    // Progress figures appear once stored progress has loaded.
    await expect(page.getByTestId("stat-completed")).toHaveText("0");
    await expect(page.getByTestId("stat-bookmarked")).toHaveText("0");

    await expect(page.getByRole("link", { name: `Beginner ${countBy("difficulty", "beginner")} of ${DIFFICULTY_META.beginner.target} loaded` })).toBeVisible();
    await expect(page.getByRole("link", { name: `Expert 0 of ${DIFFICULTY_META.expert.target} loaded` })).toBeVisible();
  });

  test("sidebar shows the same dynamic counts and never placeholder questions", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.getByRole("complementary", { name: "Primary" }).or(page.locator("[data-slot=sidebar]")).first();
    await expect(sidebar).toContainText(`${realQuestions.length} / ${CURRICULUM_TARGET}`);
    await expect(page.getByText(/lorem ipsum|placeholder|coming soon/i)).toHaveCount(0);
  });

  test("opening a question does not count it as completed", async ({ page }) => {
    await page.goto(`/questions/${realQuestions[0].id}`);
    await expect(page.getByTestId("question-id")).toHaveText(realQuestions[0].id);
    await page.goto("/");

    await expect(page.getByTestId("stat-completed")).toHaveText("0");
    // ...but it is remembered as recently viewed.
    await expect(page.getByTestId("recent-list")).toContainText(realQuestions[0].id);
  });

  test("Continue learning offers the first question when nothing has been viewed", async ({ page }) => {
    await page.goto("/");
    const card = page.getByTestId("continue-card");
    await expect(card).toContainText(realQuestions[0].id);
    await card.getByRole("link", { name: /start learning/i }).click();
    await expect(page).toHaveURL(new RegExp(`/questions/${realQuestions[0].id}$`));
  });

  test("progress breakdown has Difficulty, Industry, Domain and Topic views", async ({ page }) => {
    await page.goto("/");
    for (const name of ["Difficulty", "Industry", "Domain", "Topic"]) {
      await page.getByRole("tab", { name }).click();
      await expect(page.getByRole("tabpanel")).toBeVisible();
    }
    await page.getByRole("tab", { name: "Difficulty" }).click();
    await expect(page.getByTestId("breakdown-difficulty").getByRole("listitem")).toHaveCount(4);
  });

  test("has a skip link, a single h1 and a labelled main landmark", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: /skip to main content/i })).toBeFocused();
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
  });
});
