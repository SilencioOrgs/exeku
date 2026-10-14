// Run locally while npm run dev is serving the app:
//   node tests/browser/theme-route-verification.mjs
// This uses installed Playwright + Edge/Chromium; it is NOT a mocked route test.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let chromium;
try { chromium = require("playwright-core").chromium; }
catch {
  try { chromium = require("playwright").chromium; }
  catch { throw new Error("Browser verification requires Playwright and Edge/Chromium. It has NOT been executed."); }
}
const base = process.env.EXEKU_TEST_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ channel: "msedge", headless: true })
  .catch(() => chromium.launch({ headless: true }));
let page;
const pageErrors = [];
const requestFailures = [];
const navigation404s = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") pageErrors.push("console: " + message.text()); });
  page.on("requestfailed", (request) => requestFailures.push(`${request.url()}: ${request.failure()?.errorText ?? "unknown"}`));
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() === 404 && new URL(response.url()).pathname.startsWith("/app")) {
      navigation404s.push(response.url());
    }
  });

  await page.goto(base);
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("exeku_local_v1", 2);
      request.onupgradeneeded = () => {
        for (const store of ["profiles", "drafts"]) {
          if (!request.result.objectStoreNames.contains(store)) {
            request.result.createObjectStore(store, { keyPath: "id" });
          }
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction("profiles", "readwrite");
      tx.objectStore("profiles").put({
        id: "route-review", displayName: "Theme Test", avatarId: "pixel-wizard",
        preferredLanguage: "python", experienceLevel: "beginner",
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });

  const openNav = async (href, selector) => {
    await page.locator(`nav[aria-label="Main navigation"] a[href="${href}"]:visible`).first().click();
    await page.waitForURL((url) => url.pathname === href, { timeout: 15000 });
    await page.locator(selector).first().waitFor({ timeout: 15000 });
    assert.equal(await page.getByText("404", { exact: true }).count(), 0, `404 rendered on ${href}`);
    assert.equal(await page.getByText("This page couldn\u0027t load", { exact: false }).count(), 0, "Next.js global navigation fallback was rendered");
  };

  for (const style of ["Clarity", "Command", "Pixel Arcade"]) {
    await page.goto(base + "/app/settings");
    await page.locator(".appearance-studio").waitFor();
    await page.locator(".theme-option").filter({ hasText: style }).first().click();
    const apply = page.getByRole("button", { name: /Apply changes/i });
    if (await apply.isEnabled()) await apply.click();
    await page.waitForTimeout(300);
    await openNav("/app/challenges", ".challenges-view");
    const problemLink = page.locator('a[href*="/app/workspace?problem="]:visible').first();
    await problemLink.waitFor({ timeout: 15000 });
    await problemLink.click();
    await page.waitForURL((url) => url.pathname === "/app/workspace", { timeout: 15000 });
    await page.locator(".workspace-view").waitFor({ timeout: 15000 });
    await openNav("/app/profile", ".profile-view");
    await openNav("/app", ".modern-overview, .dashboard");
    console.log(`PASS ${style}: Settings → Problems → Code → Profile → Overview`);
  }
  assert.deepEqual(navigation404s, [], "Client navigation returned 404 responses");
  assert.deepEqual(requestFailures, [], "Requests failed during client navigation");
  assert.deepEqual(pageErrors, [], "Browser runtime errors");
  console.log("PASS: all three themes navigated without Not Found errors");
} catch (error) {
  const filename = path.join(process.cwd(), ".git", "theme-navigation-error.png");
  if (page) {
    await mkdir(path.dirname(filename), { recursive: true });
    await page.screenshot({ path: filename }).catch(() => {});
    console.error("Failure URL:", page.url());
  }
  console.error("Browser exceptions:", pageErrors);
  console.error("Failed requests:", requestFailures);
  console.error("404 responses:", navigation404s);
  console.error("Screenshot:", filename);
  throw error;
} finally {
  await browser.close();
}
