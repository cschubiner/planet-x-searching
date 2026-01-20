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

test("Yes hint auto-marks other objects as no", async ({ page }) => {
  await startGame(page);

  const yesButton = page.locator("#comet-sector2-yes");
  await yesButton.click();
  await expect(yesButton).toHaveClass(/active/);

  const noButtons = page.locator(
    "#planet-x-sector2-no, #truly-empty-sector2-no, #gas-cloud-sector2-no, #dwarf-planet-sector2-no, #asteroid-sector2-no"
  );
  const count = await noButtons.count();
  for (let i = 0; i < count; i++) {
    await expect(noButtons.nth(i)).toHaveClass(/active/);
  }
});

test("Visible sky summary updates after moves", async ({ page }) => {
  await startGame(page);

  const summary = page.locator("#visible-sky-summary");
  await expect(summary).toContainText("Visible sky starts at sector 1");

  const moveRow = page.locator("#moves-body tr").first();
  const moveId = await moveRow.getAttribute("id");
  await moveRow.locator("label[for$='-player-blue']").click();
  await moveRow.locator("label[for$='-action-survey']").click();
  await moveRow.locator("label[for$='-action-survey-object-comet']").click();
  await page.locator(`#${moveId}-action-survey-sector-start`).selectOption("2");
  await page.locator(`#${moveId}-action-survey-sector-end`).selectOption("3");

  const nextRow = page.locator("#moves-body tr").nth(1);
  await nextRow.locator("label[for$='-player-red']").click();
  await nextRow.locator("label[for$='-action-research']").click();
  await nextRow.locator("label[for$='-action-research-area-A']").click();

  await expect(summary).toContainText("Visible sky starts at sector 2");
});

test("Tooltip icons keep titles", async ({ page }) => {
  await startGame(page);
  const tooltipIcon = page.locator('.section-help[data-bs-toggle="tooltip"]').first();
  const tooltipText = await tooltipIcon.evaluate((el) => {
    return (
      el.getAttribute("title") ||
      el.getAttribute("data-bs-original-title") ||
      el.getAttribute("aria-label") ||
      ""
    );
  });
  expect(tooltipText).toMatch(/.+/);
});
