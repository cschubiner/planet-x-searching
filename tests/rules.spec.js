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

test("Comet hint buttons only appear in prime sectors", async ({ page }) => {
  await startGame(page);

  await expect(page.locator("#comet-sector1-yes")).toHaveCount(0);
  await expect(page.locator("#comet-sector2-yes")).toHaveCount(1);
});

test("Survey end options limited to visible sky", async ({ page }) => {
  await startGame(page);

  const moveRow = page.locator("#moves-body tr").first();
  const moveId = await moveRow.getAttribute("id");
  await moveRow.locator("label[for$='-player-blue']").click();
  await moveRow.locator("label[for$='-action-survey']").click();
  await moveRow.locator("label[for$='-action-survey-object-asteroid']").click();
  await page.locator(`#${moveId}-action-survey-sector-start`).selectOption("1");

  const endOptions = page.locator(`#${moveId}-action-survey-sector-end option:not([default])`);
  await expect(endOptions).toHaveCount(6);
});

test("Comet survey disables non-prime start sectors", async ({ page }) => {
  await startGame(page);

  const moveRow = page.locator("#moves-body tr").first();
  const moveId = await moveRow.getAttribute("id");
  await moveRow.locator("label[for$='-player-blue']").click();
  await moveRow.locator("label[for$='-action-survey']").click();
  await moveRow.locator("label[for$='-action-survey-object-comet']").click();

  const option1 = page.locator(`#${moveId}-action-survey-sector-start option[value='1']`);
  const option2 = page.locator(`#${moveId}-action-survey-sector-start option[value='2']`);
  await expect(option1).toBeDisabled();
  await expect(option2).not.toBeDisabled();
});

test("When all asteroids are confirmed, remaining sectors are marked no", async ({ page }) => {
  await startGame(page);

  const asteroidYesSelectors = [
    "#asteroid-sector1-yes",
    "#asteroid-sector2-yes",
    "#asteroid-sector3-yes",
    "#asteroid-sector4-yes",
  ];

  for (const selector of asteroidYesSelectors) {
    const btn = page.locator(selector);
    await btn.click();
    await expect(btn).toHaveClass(/active/);
  }

  await expect(page.locator("#asteroid-sector5-no")).toHaveClass(/active/);
});

test("When all gas clouds are confirmed, remaining sectors are marked no", async ({ page }) => {
  await startGame(page);

  const gasYesSelectors = ["#gas-cloud-sector1-yes", "#gas-cloud-sector2-yes"];
  for (const selector of gasYesSelectors) {
    const btn = page.locator(selector);
    await btn.click();
    await expect(btn).toHaveClass(/active/);
  }

  await expect(page.locator("#gas-cloud-sector3-no")).toHaveClass(/active/);
});

test("When all comets are confirmed, remaining prime sectors are marked no", async ({ page }) => {
  await startGame(page);

  const cometYesSelectors = ["#comet-sector2-yes", "#comet-sector3-yes"];
  for (const selector of cometYesSelectors) {
    const btn = page.locator(selector);
    await btn.click();
    await expect(btn).toHaveClass(/active/);
  }

  await expect(page.locator("#comet-sector5-no")).toHaveClass(/active/);
});

test("Cannot research twice in a row", async ({ page }) => {
  await startGame(page);

  const firstRow = page.locator("#moves-body tr").first();
  await firstRow.locator("label[for$='-player-blue']").click();
  await firstRow.locator("label[for$='-action-research']").click();
  await firstRow.locator("label[for$='-action-research-area-A']").click();

  const secondRow = page.locator("#moves-body tr").nth(1);
  const secondId = await secondRow.getAttribute("id");
  await secondRow.locator("label[for$='-player-blue']").click();
  await expect(page.locator(`#${secondId}-action-research`)).toBeDisabled();
});

test("Target action limited to two per player", async ({ page }) => {
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
  await expect(page.locator(`#${thirdId}-action-target`)).toBeDisabled();
});
