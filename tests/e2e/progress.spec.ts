import fs from "node:fs";
import { expect, test, type Page } from "./fixtures";
import { realQuestions } from "./data";

const first = realQuestions[0];
const tools = (page: Page) => page.getByRole("complementary", { name: "Question tools" });

async function openFirst(page: Page) {
  await page.goto(`/questions/${first.id}`);
  await expect(tools(page).getByRole("button", { name: "Bookmark" })).toBeEnabled(); // stored progress has loaded
}

test.describe("progress tracking", () => {
  test("bookmark a question: shows on /bookmarks and survives a refresh", async ({ page }) => {
    await openFirst(page);
    const bookmark = tools(page).getByRole("button", { name: "Bookmark" });
    await bookmark.click();
    await expect(tools(page).getByRole("button", { name: "Bookmarked" })).toHaveAttribute("aria-pressed", "true");

    await page.goto("/bookmarks");
    await expect(page.getByTestId("question-row")).toHaveCount(1);
    await expect(page.getByTestId("question-row")).toContainText(first.id);

    await page.reload();
    await expect(page.getByTestId("question-row")).toHaveCount(1);

    await page.goto(`/questions/${first.id}`);
    await expect(tools(page).getByRole("button", { name: "Bookmarked" })).toBeEnabled();
    await tools(page).getByRole("button", { name: "Bookmarked" }).click();
    await page.goto("/bookmarks");
    await expect(page.getByTestId("empty-state")).toBeVisible();
  });

  test("mark as mastered: updates the dashboard, the list and persists after refresh", async ({ page }) => {
    await openFirst(page);
    await tools(page).getByRole("button", { name: "Mark as mastered" }).click();
    await expect(tools(page).getByRole("combobox", { name: "Learning status" })).toHaveText(/Mastered/);

    await page.reload();
    await expect(tools(page).getByRole("combobox", { name: "Learning status" })).toHaveText(/Mastered/);
    await expect(tools(page).getByRole("button", { name: /mastered · undo/i })).toBeVisible();

    await page.goto("/");
    await expect(page.getByTestId("stat-completed")).toHaveText("1");
    await expect(page.getByText(`${Math.round((1 / realQuestions.length) * 100)}% of loaded`)).toBeVisible();

    await page.goto("/questions");
    await expect(page.getByTestId("question-row").first()).toContainText("Mastered");
  });

  test("changing status through the select, then filtering by it", async ({ page }) => {
    await openFirst(page);
    await tools(page).getByRole("combobox", { name: "Learning status" }).click();
    await page.getByRole("option", { name: "Practicing" }).click();
    await expect(tools(page).getByRole("combobox", { name: "Learning status" })).toHaveText(/Practicing/);

    await page.goto("/questions");
    await page.getByRole("combobox", { name: "Status", exact: true }).click();
    await page.getByRole("option", { name: /^Practicing/ }).click();
    await expect(page.getByTestId("question-row")).toHaveCount(1);
    await expect(page.getByTestId("question-row")).toContainText(first.id);
  });

  test("un-mastering a question lowers completion again", async ({ page }) => {
    await openFirst(page);
    await tools(page).getByRole("button", { name: "Mark as mastered" }).click();
    await tools(page).getByRole("button", { name: /mastered · undo/i }).click();
    await page.goto("/");
    await expect(page.getByTestId("stat-completed")).toHaveText("0");
  });

  test("revision marks and notes persist", async ({ page }) => {
    await openFirst(page);
    await tools(page).getByRole("button", { name: "Revise later" }).click();
    const notes = page.getByRole("textbox", { name: "Personal notes for this question" });
    await notes.fill("Remember the temporal dead zone.");
    await notes.blur();
    await expect(page.getByText("Saved on this device")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("textbox", { name: "Personal notes for this question" })).toHaveValue("Remember the temporal dead zone.");
    await expect(tools(page).getByRole("button", { name: "To revise" })).toHaveAttribute("aria-pressed", "true");

    await page.goto("/progress");
    await expect(page.getByRole("link", { name: new RegExp(first.id) })).toBeVisible();
  });

  test("progress page summarises status, with breakdowns", async ({ page }) => {
    await openFirst(page);
    await tools(page).getByRole("button", { name: "Mark as mastered" }).click();
    await page.goto("/progress");
    await expect(page.getByTestId("status-count-mastered")).toHaveText("1");
    await expect(page.getByTestId("status-count-not-started")).toHaveText(String(realQuestions.length - 1));
    await page.getByRole("tab", { name: "Industry" }).click();
    await expect(page.getByTestId("breakdown-industry")).toBeVisible();
  });

  test("export, reset and import round-trips progress", async ({ page }, testInfo) => {
    await openFirst(page);
    await tools(page).getByRole("button", { name: "Mark as mastered" }).click();
    await tools(page).getByRole("button", { name: "Bookmark" }).click();

    await page.goto("/progress");
    const exportButton = page.getByRole("button", { name: "Export JSON" });
    await expect(exportButton).toBeEnabled();
    const download = page.waitForEvent("download");
    await exportButton.click();
    const file = testInfo.outputPath("progress.json");
    await (await download).saveAs(file);

    const envelope = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(envelope).toMatchObject({ app: "angular-mastery", kind: "progress", version: 1 });
    expect(envelope.data.questions[first.id]).toMatchObject({ status: "mastered", bookmarked: true });

    await page.getByRole("button", { name: "Reset progress" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByTestId("status-count-mastered")).toHaveText("0");

    await page.getByLabel("Choose a progress export file").setInputFiles(file);
    await page.getByRole("dialog").getByRole("button", { name: "Replace" }).click();
    await expect(page.getByTestId("status-count-mastered")).toHaveText("1");
  });

  test("importing an invalid file reports a readable error and changes nothing", async ({ page }, testInfo) => {
    await openFirst(page);
    await tools(page).getByRole("button", { name: "Mark as mastered" }).click();
    await page.goto("/progress");
    await expect(page.getByTestId("status-count-mastered")).toHaveText("1");

    const bad = testInfo.outputPath("bad.json");
    fs.writeFileSync(bad, JSON.stringify({ hello: "world" }));
    await page.getByLabel("Choose a progress export file").setInputFiles(bad);
    await expect(page.getByText(/does not look like an Angular Mastery progress export/i)).toBeVisible();
    await expect(page.getByTestId("status-count-mastered")).toHaveText("1");
  });

  test("progress is stored under a versioned key in LocalStorage, keyed by question id", async ({ page }) => {
    await openFirst(page);
    await tools(page).getByRole("button", { name: "Mark as mastered" }).click();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("angular-mastery:progress") ?? "null"));
    expect(stored.version).toBe(1);
    expect(stored.state.questions[first.id].status).toBe("mastered");
  });

  test("corrupt stored data does not break the app", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("angular-mastery:progress", "{ definitely not json"));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByTestId("stat-completed")).toHaveText("0");
    await page.goto(`/questions/${first.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("the command palette finds a question and navigates to it", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("combobox").fill("closures");
    await dialog.getByRole("option", { name: /What are closures in JavaScript/ }).click();
    await expect(page).toHaveURL(/\/questions\/ANG-BEG-003$/);
  });

  test("dark theme can be selected and persists", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Change theme" }).click();
    await page.getByRole("menuitem", { name: /dark/i }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
