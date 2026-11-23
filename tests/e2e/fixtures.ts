import { test as base } from "@playwright/test";

export { expect } from "@playwright/test";
export type { Page } from "@playwright/test";

/**
 * Same as Playwright's `test`, except `page.goto()` and `page.reload()` also wait until the app has
 * hydrated and loaded its saved state (`<html data-app-ready="true">`). Server-rendered markup is
 * visible earlier, but a click before hydration would be lost, which would make tests flaky for the
 * wrong reason.
 */
export const test = base.extend({
  page: async ({ page }, provide) => {
    const ready = () => page.locator('html[data-app-ready="true"]').waitFor({ state: "attached", timeout: 15_000 });
    const goto = page.goto.bind(page);
    const reload = page.reload.bind(page);
    page.goto = async (url, options) => {
      const response = await goto(url, options);
      await ready();
      return response;
    };
    page.reload = async (options) => {
      const response = await reload(options);
      await ready();
      return response;
    };
    await provide(page);
  },
});
