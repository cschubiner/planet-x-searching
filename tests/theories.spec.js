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

async function fillTheoryRow(page, theoryId) {
  await page.locator(`label[for='${theoryId}-player-blue']`).click();
  await page.locator(`#${theoryId}-sector`).selectOption("1");
  await page.locator(`label[for='${theoryId}-object-asteroid']`).click();
}

test("Theory row auto-sets to placed and adds a new row", async ({ page }) => {
  await startGame(page);

  await fillTheoryRow(page, "theory0");

  await expect(page.locator("#theory0")).toHaveAttribute("data-progress", "1");
  await expect(page.locator("#theories-body tr")).toHaveCount(2);
});

test("Advance Theories increments progress to peer review", async ({ page }) => {
  await startGame(page);

  await fillTheoryRow(page, "theory0");

  await page.click("#advance-theories-btn");
  await expect(page.locator("#theory0")).toHaveAttribute("data-progress", "2");

  await page.click("#advance-theories-btn");
  await expect(page.locator("#theory0")).toHaveAttribute("data-progress", "3");
  await expect(page.locator("#theory0")).toHaveClass(/table-danger/);
});

test("Incomplete theories do not advance", async ({ page }) => {
  await startGame(page);

  await page.click("#advance-theories-btn");
  await expect(page.locator("#theory0")).toHaveAttribute("data-progress", "0");
});

test("Theory result toggles row styling", async ({ page }) => {
  await startGame(page);

  await page.locator("label[for='theory0-correct']").click();
  await expect(page.locator("#theory0")).toHaveClass(/table-success/);

  await page.locator("label[for='theory0-incorrect']").click();
  await expect(page.locator("#theory0")).toHaveClass(/table-danger/);
});
