import { expect, test, type Page } from "./fixtures";
import { countBy, realQuestions } from "./data";

const rows = (page: Page) => page.getByTestId("question-row");
const count = (page: Page) => page.getByTestId("result-count");

async function choose(page: Page, filter: string, option: string | RegExp) {
  await page.getByRole("combobox", { name: filter, exact: true }).click();
  await page.getByRole("option", { name: option }).click();
}

test.describe("browsing and filtering", () => {
  test("lists every loaded question as a row", async ({ page }) => {
    await page.goto("/questions");
    await expect(rows(page)).toHaveCount(realQuestions.length);
    await expect(count(page)).toHaveText(`Showing ${realQuestions.length} of ${realQuestions.length} loaded questions`);
    for (const question of realQuestions) await expect(page.getByTestId("question-list")).toContainText(question.id);
  });

  test("searches by title, topic, tag and id", async ({ page }) => {
    await page.goto("/questions");
    const search = page.getByTestId("explorer-search");

    // Title/topic match ranks first, whatever else is loaded.
    await search.fill("closures");
    await expect(rows(page).first()).toContainText("ANG-BEG-003");

    // An id is an exact lookup.
    await search.fill("ANG-BEG-002");
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toHaveAttribute("data-question-id", "ANG-BEG-002");

    await search.fill("hoisting");
    await expect(rows(page).first()).toContainText("ANG-BEG-001");

    // Search narrows the list.
    await expect(rows(page)).not.toHaveCount(realQuestions.length);
  });

  test("shows an empty state, and can clear it", async ({ page }) => {
    await page.goto("/questions");
    await page.getByTestId("explorer-search").fill("xqzjwvkp");
    await expect(page.getByTestId("empty-state")).toContainText("No questions match");
    await expect(rows(page)).toHaveCount(0);

    await page.getByTestId("empty-state").getByRole("button", { name: /clear filters/i }).click();
    await expect(rows(page)).toHaveCount(realQuestions.length);
  });

  test("filters by priority and type with counts taken from the data", async ({ page }) => {
    await page.goto("/questions");

    const critical = countBy("priority", "critical");
    await choose(page, "Priority", /^Critical/);
    await expect(rows(page)).toHaveCount(critical);

    await page.getByTestId("clear-filters").click();
    const type = realQuestions[0].questionType;
    await choose(page, "Type", new RegExp(`^${type}`, "i"));
    await expect(rows(page)).toHaveCount(countBy("questionType", type));
  });

  test("combines filters and shows removable chips", async ({ page }) => {
    await page.goto("/questions");
    await choose(page, "Priority", /^Critical/);
    await expect(page.getByRole("button", { name: /remove filter critical priority/i })).toBeVisible();
    await page.getByRole("button", { name: /remove filter critical priority/i }).click();
    await expect(rows(page)).toHaveCount(realQuestions.length);
  });

  test("sorts the list", async ({ page }) => {
    await page.goto("/questions");
    await page.getByRole("combobox", { name: "Sort questions" }).click();
    await page.getByRole("option", { name: "Topic (A-Z)" }).click();
    const topics = realQuestions.map((q) => q.topic).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
    await expect(rows(page).first()).toContainText(topics[0]);
    await expect(rows(page).last()).toContainText(topics[topics.length - 1]);
  });

  test("keeps filters in the URL and restores them on refresh", async ({ page }) => {
    await page.goto("/questions");
    await page.getByTestId("explorer-search").fill("closures");
    await expect(page).toHaveURL(/[?&]q=closures/);
    await expect(rows(page).first()).toContainText("ANG-BEG-003");
    const before = await rows(page).count();
    await page.reload();
    await expect(page.getByTestId("explorer-search")).toHaveValue("closures");
    await expect(rows(page)).toHaveCount(before);
    await expect(rows(page).first()).toContainText("ANG-BEG-003");
  });

  test("opens a question from a row and reaches the detail page", async ({ page }) => {
    await page.goto("/questions");
    await rows(page).first().getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/questions/${realQuestions[0].id}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(realQuestions[0].topic);
  });

  test("beginner level page lists its questions; levels without content show an honest empty state", async ({ page }) => {
    await page.goto("/levels/beginner");
    await expect(rows(page)).toHaveCount(countBy("difficulty", "beginner"));

    await page.goto("/levels/expert");
    await expect(page.getByTestId("empty-state")).toContainText(/no expert questions are loaded yet/i);
    await expect(rows(page)).toHaveCount(0);
  });

  test("unknown level and unknown question show a not-found page", async ({ page }) => {
    const level = await page.goto("/levels/not-a-level");
    expect(level?.status()).toBe(404);
    const question = await page.goto("/questions/ANG-BEG-999");
    expect(question?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /doesn.t exist/i })).toBeVisible();
  });

  test("bookmarks page is empty until something is bookmarked", async ({ page }) => {
    await page.goto("/bookmarks");
    await expect(page.getByTestId("empty-state")).toContainText(/haven.t bookmarked/i);
  });

  test("keyboard: '/' focuses search and arrow keys move between rows", async ({ page }) => {
    await page.goto("/questions");
    await expect(rows(page).first()).toBeVisible();
    await page.keyboard.press("/");
    await expect(page.getByTestId("explorer-search")).toBeFocused();

    await rows(page).first().getByRole("link").focus();
    await page.keyboard.press("ArrowDown");
    await expect(rows(page).nth(1).getByRole("link")).toBeFocused();
  });

  test("industries and projects pages are honest when there is no project data", async ({ page }) => {
    await page.goto("/industries");
    await expect(page.getByRole("link", { name: /banking/i })).toBeVisible();
    await page.goto("/projects");
    await expect(page.getByTestId("project-card")).toHaveCount(0);
    await expect(page.getByTestId("empty-state").first()).toContainText(/no .* project has been defined yet/i);
  });
});
