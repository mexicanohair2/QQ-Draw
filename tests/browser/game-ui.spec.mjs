import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const supabaseStub = `
    window.supabase = {
      createClient() {
        return {
          auth: {
            getSession: async () => ({ data: { session: null }, error: null })
          }
        };
      }
    };
  `;
  await page.route(/https:\/\/(cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js|unpkg\.com\/@supabase\/supabase-js)/, route =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: supabaseStub })
  );
});

async function countInk(page) {
  return page.locator("#drawCanvas").evaluate(canvas => {
    const ctx = canvas.getContext("2d");
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let different = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] < 225 || pixels[i + 1] < 220 || pixels[i + 2] < 215) different++;
    }
    return different;
  });
}

test("bot drawing appears and player can submit a guess", async ({ page }) => {
  await page.goto("/");
  await page.locator("#botDraw").click();
  await expect(page.locator("#drawCanvas")).toBeVisible();
  await expect(page.locator("#guessForm")).toBeVisible();
  expect(await countInk(page)).toBeGreaterThan(30);

  await page.locator("#guessInput").fill("домик");
  await page.locator("#guessForm button[type=submit]").click();
  await expect(page.locator(".guess-history")).toContainText("домик");
});

test("player can draw with a mouse on the local solo canvas", async ({ page }) => {
  await page.goto("/");
  await page.locator("#drawForBots").click();
  await page.locator("#soloWord").fill("арбуз");
  await page.locator("#soloSetupForm button[type=submit]").click();

  const canvas = page.locator("#drawCanvas");
  await expect(canvas).toBeVisible();
  const before = await countInk(page);
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.35);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.65, { steps: 6 });
  await page.mouse.up();

  expect(await countInk(page)).toBeGreaterThan(before + 2);
  await expect(page.locator("#brush")).toBeVisible();
  await expect(page.locator("#eraser")).toBeVisible();
});