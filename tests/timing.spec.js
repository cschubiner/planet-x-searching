const path = require("path");
const { pathToFileURL } = require("url");
const { test, expect } = require("@playwright/test");

function getFileUrl() {
  const filePath = path.resolve(__dirname, "..", "index.html");
  return pathToFileURL(filePath).href;
}

async function startGame(page) {
  await page.goto(getFileUrl());
  await page.waitForFunction(() => window.$ && window.jQuery);

  await page.evaluate(() => {
    const modeInput = document.querySelector('input[name="game-mode"][value="standard"]');
    const difficultyInput = document.querySelector('input[name="difficulty"][value="beginner"]');
    if (modeInput) modeInput.checked = true;
    if (difficultyInput) difficultyInput.checked = true;

    const player1 = document.querySelector("#player-1-color");
    const player2 = document.querySelector("#player-2-color");
    const blue = document.querySelector("#blue-player");
    const red = document.querySelector("#red-player");
    if (player1 && blue) player1.appendChild(blue);
    if (player2 && red) player2.appendChild(red);

    const startBtn = document.querySelector("#start-game-btn");
    if (startBtn) {
      startBtn.disabled = false;
    }
  });

  await page.click("#start-game-btn");
  await page.waitForSelector("#hints-table");
}

test("Theory phase triggers when visible sky reaches sector 3", async ({ page }) => {
  await startGame(page);

  const firstRow = page.locator("#moves-body tr").first();
  const firstId = await firstRow.getAttribute("id");
  await firstRow.locator("label[for$='-player-blue']").click();
  await page.locator(`#${firstId}-action`).selectOption("target");
  await firstRow.locator('[action="target"] select').selectOption("1");

  const secondRow = page.locator("#moves-body tr").nth(1);
  const secondId = await secondRow.getAttribute("id");
  await secondRow.locator("label[for$='-player-red']").click();
  await page.locator(`#${secondId}-action`).selectOption("target");
  await secondRow.locator('[action="target"] select').selectOption("2");

  await expect(page.locator("#visible-sky-summary")).toContainText("sector 5");
  const modal = page.locator("#theory-phase-alert-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Theory Phase at Sector 3");
});

test("Conference triggers at time threshold", async ({ page }) => {
  await startGame(page);

  const firstRow = page.locator("#moves-body tr").first();
  const firstId = await firstRow.getAttribute("id");
  await firstRow.locator("label[for$='-player-blue']").click();
  await page.locator(`#${firstId}-action`).selectOption("target");
  await firstRow.locator('[action="target"] select').selectOption("1");

  const secondRow = page.locator("#moves-body tr").nth(1);
  const secondId = await secondRow.getAttribute("id");
  await secondRow.locator("label[for$='-player-blue']").click();
  await page.locator(`#${secondId}-action`).selectOption("target");
  await secondRow.locator('[action="target"] select').selectOption("2");

  const thirdRow = page.locator("#moves-body tr").nth(2);
  const thirdId = await thirdRow.getAttribute("id");
  await thirdRow.locator("label[for$='-player-blue']").click();
  await page.locator(`#${thirdId}-action`).selectOption("survey");
  await thirdRow.locator("label[for$='-action-survey-object-asteroid']").click();
  await page.locator(`#${thirdId}-action-survey-sector-start`).selectOption("1");
  await page.locator(`#${thirdId}-action-survey-sector-end`).selectOption("3");

  const modal = page.locator("#conference-alert-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Conference Triggered");
  await expect(modal).toContainText("X1");
});
