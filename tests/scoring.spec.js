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
  await page.waitForSelector("#theories-table");
}

test("Auto score awards leader bonus to earliest correct theory", async ({ page }) => {
  await startGame(page);

  await page.click('label[for="theory0-player-blue"]');
  await page.locator("#theory0-sector").selectOption("3");
  await page.click('label[for="theory0-object-asteroid"]');
  await page.locator("#theory0-submit-order").fill("1");
  await page.click('label[for="theory0-correct"]');

  await page.click('label[for="theory1-player-red"]');
  await page.locator("#theory1-sector").selectOption("3");
  await page.click('label[for="theory1-object-asteroid"]');
  await page.locator("#theory1-submit-order").fill("2");
  await page.click('label[for="theory1-correct"]');

  await expect(
    page.locator('#auto-score-blue [data-metric="leader"] .auto-score-points')
  ).toHaveText("1");
  await expect(
    page.locator('#auto-score-red [data-metric="leader"] .auto-score-points')
  ).toHaveText("0");
  await expect(
    page.locator('#auto-score-blue [data-metric="total"]')
  ).toHaveText("3");
  await expect(
    page.locator('#auto-score-red [data-metric="total"]')
  ).toHaveText("2");
});

test("Endgame helper adds final theory rows for allowed players", async ({ page }) => {
  await startGame(page);

  const moveRow0 = page.locator("#moves-body tr").nth(0);
  await moveRow0.locator('label[for$="-player-blue"]').click();
  await moveRow0.locator('label[for$="-action-locate"]').click();

  const moveRow1 = page.locator("#moves-body tr").nth(1);
  await moveRow1.locator('label[for$="-player-red"]').click();
  await moveRow1.locator('label[for$="-action-research"]').click();
  await moveRow1.locator('label[for$="-action-research-area-A"]').click();

  await page.click("#endgame-helper-btn");
  await page.waitForSelector("#endgame-modal.show");

  await page.click('label[for="endgame-finder-blue"]');

  const redRow = page.locator('#endgame-body tr[data-player="red"]');
  await redRow.locator('label[for="endgame-red-theory"]').click();
  await redRow.locator(".endgame-theory-count").fill("2");

  await page.click("#endgame-apply-btn");
  await page.waitForSelector("#endgame-modal", { state: "hidden" });

  const finalRows = page.locator('#theories-body tr[data-phase="final"]');
  await expect(finalRows).toHaveCount(2);
  await expect(
    finalRows.locator('input[name$="-player"][value="red"]:checked')
  ).toHaveCount(2);
});
