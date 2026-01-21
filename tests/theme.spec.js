const path = require("path");
const { pathToFileURL } = require("url");
const { test, expect } = require("@playwright/test");

function getFileUrl() {
  const filePath = path.resolve(__dirname, "..", "index.html");
  return pathToFileURL(filePath).href;
}

test("Theme toggle switches and persists", async ({ page }) => {
  await page.goto(getFileUrl());
  await page.waitForFunction(() => window.$ && window.jQuery);

  const initialTheme = await page.evaluate(() =>
    document.documentElement.getAttribute("data-bs-theme")
  );
  const nextTheme = initialTheme === "dark" ? "light" : "dark";

  await page.click("#theme-toggle");
  await expect(page.locator("html")).toHaveAttribute("data-bs-theme", nextTheme);

  const storedTheme = await page.evaluate(() =>
    localStorage.getItem("planet-x-theme")
  );
  expect(storedTheme).toBe(nextTheme);

  const expectedLabel = nextTheme === "dark" ? "Light Mode" : "Dark Mode";
  await expect(page.locator("#theme-toggle-label")).toHaveText(expectedLabel);

  const expectedIconClass = nextTheme === "dark" ? /bi-sun/ : /bi-moon-stars/;
  await expect(page.locator("#theme-toggle-icon")).toHaveClass(expectedIconClass);

  await page.reload();
  await page.waitForFunction(() => window.$ && window.jQuery);
  await expect(page.locator("html")).toHaveAttribute("data-bs-theme", nextTheme);
});
