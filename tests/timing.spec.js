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
  await firstRow.locator("label[for$='-player-blue']").click();
  await firstRow.locator("label[for$='-action-target']").click();
  await firstRow.locator('[action="target"] select').selectOption("1");

  const secondRow = page.locator("#moves-body tr").nth(1);
  await secondRow.locator("label[for$='-player-red']").click();
  await secondRow.locator("label[for$='-action-target']").click();
  await secondRow.locator('[action="target"] select').selectOption("2");

  await expect(page.locator("#visible-sky-summary")).toContainText("sector 5");
  const modal = page.locator("#theory-phase-alert-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Theory Phase at Sector 3");
});

test("Editing earlier moves does not retrigger later theory phases", async ({ page }) => {
  await startGame(page);

  const firstRow = page.locator("#moves-body tr").first();
  await firstRow.locator("label[for$='-player-blue']").click();
  await firstRow.locator("label[for$='-action-target']").click();
  await firstRow.locator('[action="target"] select').selectOption("1");

  const secondRow = page.locator("#moves-body tr").nth(1);
  await secondRow.locator("label[for$='-player-red']").click();
  await secondRow.locator("label[for$='-action-target']").click();
  await secondRow.locator('[action="target"] select').selectOption("2");

  const modal = page.locator("#theory-phase-alert-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Theory Phase at Sector 3");
  await modal.locator("button.btn-close").click();
  await expect(modal).toBeHidden();

  const thirdRow = page.locator("#moves-body tr").nth(2);
  await thirdRow.locator("label[for$='-player-blue']").click();
  await thirdRow.locator("label[for$='-action-research']").click();
  await thirdRow.locator("label[for$='-action-research-area-A']").click();

  const fourthRow = page.locator("#moves-body tr").nth(3);
  await fourthRow.locator("label[for$='-player-red']").click();
  await fourthRow.locator("label[for$='-action-research']").click();
  const secondModal = page.locator("#theory-phase-alert-modal");
  await expect(secondModal).toBeVisible();
  await expect(secondModal).toContainText("Theory Phase at Sector 6");
  await secondModal.locator("button.btn-close").click();
  await expect(secondModal).toBeHidden();

  await fourthRow.locator("label[for$='-action-research-area-B']").click();

  // Edit the first row after a later theory phase already triggered.
  await firstRow.locator('[action="target"] select').selectOption("4");

  await expect(page.locator("#theory-phase-alert-modal")).toBeHidden();
});

test("Conference triggers at time threshold", async ({ page }) => {
  await startGame(page);

  const firstRow = page.locator("#moves-body tr").first();
  await firstRow.locator("label[for$='-player-blue']").click();
  await firstRow.locator("label[for$='-action-target']").click();
  await firstRow.locator('[action="target"] select').selectOption("1");

  const secondRow = page.locator("#moves-body tr").nth(1);
  await secondRow.locator("label[for$='-player-blue']").click();
  await secondRow.locator("label[for$='-action-target']").click();
  await secondRow.locator('[action="target"] select').selectOption("2");

  const thirdRow = page.locator("#moves-body tr").nth(2);
  const thirdId = await thirdRow.getAttribute("id");
  await thirdRow.locator("label[for$='-player-blue']").click();
  await thirdRow.locator("label[for$='-action-survey']").click();
  await thirdRow.locator("label[for$='-action-survey-object-asteroid']").click();
  await page.locator(`#${thirdId}-action-survey-sector-start`).selectOption("1");
  await page.locator(`#${thirdId}-action-survey-sector-end`).selectOption("3");

  const modal = page.locator("#conference-alert-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Conference Triggered");
  await expect(modal).toContainText("X1");
});
