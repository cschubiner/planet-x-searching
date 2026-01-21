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
  await page.waitForSelector("#next-player-banner");
}

test("Next player banner shows tie at start", async ({ page }) => {
  await startGame(page);
  await expect(page.locator("#next-player-text")).toContainText("Tie");
});

test("Next player banner updates after moves", async ({ page }) => {
  await startGame(page);

  const moveRow = page.locator("#moves-body tr").first();
  await moveRow.locator('label[for$="-player-blue"]').click();
  await moveRow.locator('label[for$="-action-survey"]').click();
  await moveRow.locator('label[for$="-action-survey-object-asteroid"]').click();
  await moveRow.locator('select[id$="survey-sector-start"]').selectOption("1");
  await moveRow.locator('select[id$="survey-sector-end"]').selectOption("2");

  await expect(page.locator("#next-player-text")).toContainText("Red");
});
