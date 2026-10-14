// Run locally while npm run dev is serving the app:
//   node tests/browser/theme-route-verification.mjs
// This uses installed Playwright + Edge/Chromium; it is NOT a mocked route test.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let chromium;
try { chromium = require(process.env.EXEKU_PLAYWRIGHT_MODULE || "playwright-core").chromium; }
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
const canceledRscRequests = [];
const navigation404s = [];
const httpErrors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") pageErrors.push("console: " + message.text()); });
  page.on("requestfailed", (request) => {
    const failure = `${request.url()}: ${request.failure()?.errorText ?? "unknown"}`;
    // Next cancels superseded RSC prefetches; retain them as diagnostics, not route failures.
    if (new URL(request.url()).searchParams.has("_rsc") && request.failure()?.errorText === "net::ERR_ABORTED") canceledRscRequests.push(failure);
    else requestFailures.push(failure);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`);
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
    if (await page.locator(`nav[aria-label="Main navigation"] a[href="${href}"]:visible`).count() === 0) {
      await page.getByRole("button", { name: "Toggle navigation menu", exact: true }).click();
    }
    await page.locator(`nav[aria-label="Main navigation"] a[href="${href}"]:visible`).first().click();
    await page.waitForURL((url) => url.pathname === href, { timeout: 15000 });
    await page.locator(selector).first().waitFor({ timeout: 15000 });
    assert.equal(await page.getByText("404", { exact: true }).count(), 0, `404 rendered on ${href}`);
    assert.equal(await page.getByText("This page couldn\u0027t load", { exact: false }).count(), 0, "Next.js global navigation fallback was rendered");
  };

  await page.goto(base + "/app");
  for (let round = 0; round < 3; round++) {
    for (const id of ["hello-world", "sum-two-integers", "even-or-odd"]) {
      await openNav("/app/challenges", ".challenges-view");
      await page.locator(`a[href="/app/workspace?problem=${id}"]:visible`).first().click();
      await page.locator(".workspace-toolbar:visible").waitFor();
      await page.waitForFunction(() => globalThis.monaco?.editor.getEditors().some(editor => editor.getDomNode()?.getBoundingClientRect().height > 0));
      assert.deepEqual(pageErrors, [], `Workspace revisit failed: ${id}, round ${round + 1}`);
      console.log(`PASS problem revisit ${round + 1}: ${id}`);
    }
  }

  for (const [style, styleId] of [["Clarity", "minimal-saas"], ["Command", "studio-crm"], ["Pixel Arcade", "pixel-arcade"]]) {
    for (const mode of ["light", "dark"]) {
      for (const contrast of ["standard", "high"]) {
    await page.goto(base + "/app/settings");
    await page.locator(".appearance-studio").waitFor();
    await page.locator(".theme-option").filter({ hasText: style }).first().click();
    await page.getByLabel("Color mode", { exact: true }).selectOption(mode);
    await page.locator(".appearance-advanced summary").click();
    await page.getByLabel("Contrast", { exact: true }).selectOption(contrast);
    const apply = page.getByRole("button", { name: /Apply changes/i });
    if (await apply.isEnabled()) await apply.click();
    await page.waitForFunction(({ styleId, mode, contrast }) => {
      const root = document.documentElement.dataset;
      return root.uiStyle === styleId && root.colorMode === mode && root.contrast === contrast;
    }, { styleId, mode, contrast });
    for (const id of ["hello-world", "sum-two-integers", "even-or-odd"]) {
      await openNav("/app/challenges", ".challenges-view");
      await page.locator(`a[href="/app/workspace?problem=${id}"]:visible`).first().click();
      await page.waitForURL(url => url.searchParams.get("problem") === id);
      await page.locator(".workspace-toolbar:visible").waitFor();
      await page.waitForFunction(() => globalThis.monaco?.editor.getEditors().some(editor => editor.getDomNode()?.getBoundingClientRect().height > 0));
      assert.deepEqual(pageErrors, [], `${style} ${mode} ${contrast}: ${id}`);
    }
    await openNav("/app/workspace", ".workspace-toolbar:visible");
    await openNav("/app/profile", ".profile-view");
    await openNav("/app", ".modern-overview, .dashboard");
    await page.goBack();
    await page.locator(".profile-view:visible").waitFor();
    await page.goForward();
    await page.locator(".modern-overview:visible, .dashboard:visible").waitFor();
    console.log(`PASS ${style} ${mode} ${contrast}: all problems, sections, Back/Forward`);
      }
    }
  }
  for (const route of ["/app", "/app/challenges", "/app/workspace", "/app/workspace?problem=hello-world", "/app/workspace?problem=sum-two-integers", "/app/workspace?problem=even-or-odd", "/app/profile", "/app/settings"]) {
    for (const refresh of [false, true]) {
      const response = refresh ? await page.reload() : await page.goto(base + route);
      assert.equal(response.status(), 200, route);
      await page.locator(route.includes("workspace") ? ".workspace-toolbar:visible" : route.includes("challenges") ? ".challenges-view:visible" : route.includes("profile") ? ".profile-view:visible" : route.includes("settings") ? ".appearance-studio:visible" : ".modern-overview:visible, .dashboard:visible").waitFor();
    }
  }
  for (const width of [320, 375, 390, 768, 1024, 1366, 1440]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 900 });
    await openNav("/app/challenges", ".challenges-view:visible");
    for (const id of ["hello-world", "sum-two-integers", "even-or-odd"]) {
      await page.locator(`a[href="/app/workspace?problem=${id}"]:visible`).first().click();
      await page.locator(".workspace-toolbar:visible").waitFor();
      await openNav("/app/challenges", ".challenges-view:visible");
    }
    await openNav("/app/profile", ".profile-view:visible");
    await openNav("/app", ".modern-overview:visible, .dashboard:visible");
    assert.deepEqual(pageErrors, [], `Navigation failed at ${width}px`);
    console.log(`PASS responsive navigation: ${width}px`);
  }
  await page.getByRole("button", { name: "Collapse sidebar", exact: true }).click();
  await openNav("/app/challenges", ".challenges-view:visible");
  await page.getByRole("button", { name: "Expand sidebar", exact: true }).click();
  await openNav("/app/workspace", ".workspace-toolbar:visible");
  await page.evaluate(() => {
    const now = Date.now();
    localStorage.setItem("exeku:challenge-session", JSON.stringify({ id: "navigation-session", problemId: "hello-world", problemTitle: "Hello World", durationMs: 300000, startedAt: now, deadline: now + 300000, status: "active", submissionCount: 0, lastVerdict: null }));
  });
  await page.reload();
  await page.getByRole("button", { name: /FORFEIT \/ EXIT/ }).waitFor();
  const challengesLink = page.locator('nav[aria-label="Main navigation"] a[href="/app/challenges"]:visible');
  await challengesLink.click();
  await page.getByRole("dialog", { name: /EXIT CHALLENGE AND FORFEIT/ }).waitFor();
  await page.getByRole("button", { name: "KEEP WORKING", exact: true }).click();
  assert.equal(new URL(page.url()).pathname, "/app/workspace");
  await challengesLink.click();
  await page.getByRole("button", { name: /EXIT AND FORFEIT/ }).click();
  await page.locator(".challenges-view:visible").waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("exeku:challenge-session")).status), "forfeited");
  console.log("PASS existing timed session: cancel and confirm navigation guard");

  const newcomerContext = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const newcomer = await newcomerContext.newPage();
  newcomer.on("pageerror", error => pageErrors.push(error.message));
  await newcomer.goto(base + "/app");
  await newcomer.waitForURL(base + "/setup");
  await newcomer.getByLabel(/Display Name/).fill("New Navigator");
  await newcomer.getByRole("button", { name: /NEXT STEP/ }).click();
  await newcomer.getByRole("button", { name: /NEXT STEP/ }).click();
  await newcomer.getByRole("button", { name: /CREATE PROFILE/ }).click();
  await newcomer.locator(".dashboard:visible, .modern-overview:visible").waitFor();
  await newcomer.reload();
  await newcomer.locator(".dashboard:visible, .modern-overview:visible").waitFor();
  await newcomerContext.close();
  console.log("PASS no profile, new profile creation, and returning visitor");
  assert.deepEqual(navigation404s, [], "Client navigation returned 404 responses");
  assert.deepEqual(httpErrors, [], "HTTP failures during navigation");
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
  console.error("Canceled RSC prefetches:", canceledRscRequests);
  console.error("404 responses:", navigation404s);
  console.error("HTTP failures:", httpErrors);
  console.error("Screenshot:", filename);
  throw error;
} finally {
  await writeFile(path.join(process.cwd(), ".git", "navigation-diagnostics.json"), JSON.stringify({ pageErrors, requestFailures, navigation404s, httpErrors, canceledRscRequests }, null, 2));
  await browser.close();
}
