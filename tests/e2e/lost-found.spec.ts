import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

/**
 * TC-08 and TC-09 from PRD 12.2.
 *
 * One browser is enough: the demo session adapter reads the
 * `lost_found_viewer` cookie, so each context acts as a different person.
 * Posts are created through the UI so the whole path (form → API → list →
 * detail → decision) is exercised, and the data lives in the dev server's
 * in-memory store for the length of the run.
 */

const VIEWER_COOKIE = "lost_found_viewer";

async function newContext(browser: Browser, viewer: string): Promise<BrowserContext> {
  const context = await browser.newContext();
  await context.addCookies([
    { name: VIEWER_COOKIE, value: viewer, domain: "localhost", path: "/" },
  ]);
  return context;
}

async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  // The dev server compiles a route on first visit; wait until the client
  // bundle has taken over, otherwise a click can hit a plain form and reload.
  await page.waitForLoadState("networkidle");
}

async function publishPost(page: Page, title: string, description: string): Promise<string> {
  await open(page, "/lost-found/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Category").selectOption({ label: "Electronics" });
  await page.getByLabel("Location").fill("Library, 3rd floor");
  await page.getByLabel("When did it happen?").fill("2026-11-01T09:30");
  await page.getByLabel("Description").fill(description);
  await page.getByRole("button", { name: "Publish post" }).click();

  await expect(page.getByText("Post published.")).toBeVisible();
  await expect(page).toHaveURL(/\/lost-found\/[0-9a-f-]{8,}$/, { timeout: 30_000 });
  return page.url();
}

test.describe("lost & found", () => {
  test("publishes a post, lets a second student claim it, and the owner resolves it (TC-08)", async ({
    browser,
  }) => {
    const owner = await newContext(browser, "wei");
    const claimer = await newContext(browser, "mei");
    const ownerPage = await owner.newPage();
    const claimerPage = await claimer.newPage();

    const title = `E2E umbrella ${Date.now()}`;
    const detailUrl = await publishPost(ownerPage, title, "Black umbrella with a broken handle.");

    await open(claimerPage, "/lost-found");
    await expect(claimerPage.getByText(title)).toBeVisible();

    await open(claimerPage, detailUrl);
    await expect(claimerPage.getByRole("heading", { name: "Is it yours?" })).toBeVisible();
    await claimerPage
      .getByLabel("Your claim")
      .fill("The handle is wrapped in blue tape and the tag says 3B.");
    await claimerPage.getByRole("button", { name: "Send claim" }).click();
    await expect(claimerPage.getByText("Claim sent to the author.")).toBeVisible();

    await open(ownerPage, detailUrl);
    await expect(ownerPage.getByText("Mei L.")).toBeVisible();
    await ownerPage.getByRole("button", { name: "Accept" }).click();
    await ownerPage.getByRole("button", { name: "Accept claim" }).click();
    await expect(ownerPage.getByText("Claim accepted.")).toBeVisible();

    await ownerPage.getByRole("button", { name: "Mark as resolved" }).click();
    await ownerPage.getByRole("button", { name: "Mark resolved" }).click();
    await expect(ownerPage.getByText("Marked as resolved.")).toBeVisible();

    await owner.close();
    await claimer.close();
  });

  test("does not show a private claim to anybody but the owner (TC-09)", async ({ browser }) => {
    const owner = await newContext(browser, "wei");
    const claimer = await newContext(browser, "mei");
    const stranger = await newContext(browser, "teacher");
    const ownerPage = await owner.newPage();
    const claimerPage = await claimer.newPage();
    const strangerPage = await stranger.newPage();

    const title = `E2E wallet ${Date.now()}`;
    const secret = "The photo pocket holds a tram ticket dated 4 March.";
    const detailUrl = await publishPost(ownerPage, title, "Brown leather wallet.");

    await open(claimerPage, detailUrl);
    await claimerPage.getByLabel("Your claim").fill(secret);
    await claimerPage.getByRole("button", { name: "Send claim" }).click();
    await expect(claimerPage.getByText("Claim sent to the author.")).toBeVisible();

    await open(ownerPage, detailUrl);
    await expect(ownerPage.getByText(secret)).toBeVisible();

    await open(strangerPage, detailUrl);
    await expect(strangerPage.getByRole("heading", { name: title })).toBeVisible();
    await expect(strangerPage.getByText(secret)).toHaveCount(0);

    await owner.close();
    await claimer.close();
    await stranger.close();
  });
});
