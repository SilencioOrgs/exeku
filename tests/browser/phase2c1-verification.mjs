// Phase 2C.1 Responsive and Interactive Verification Suite
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);

let chromium;
try {
  chromium = require('playwright-core').chromium;
} catch {
  try {
    chromium = require(process.env.EXEKU_PLAYWRIGHT_MODULE || 'playwright').chromium;
  } catch {
    console.log('Playwright not found directly, checking common global or cache locations');
  }
}

const base = process.env.EXEKU_TEST_URL || 'http://localhost:3000';
const outputDir = process.env.EXEKU_SCREENSHOTS_DIR || path.join(process.cwd(), '.git', 'appearance-review', 'screenshots', 'phase2c1');
await mkdir(outputDir, { recursive: true });

export async function runBrowserVerification() {
  if (!chromium) {
    console.log('Playwright chromium not available, skipping browser automation run.');
    return;
  }

  const browser = await chromium.launch({ channel: 'msedge', headless: true }).catch(async () => {
    return await chromium.launch({ headless: true });
  });

  const viewports = [
    { name: 'desktop-1440', width: 1440, height: 900 },
    { name: 'laptop-1366x768', width: 1366, height: 768 },
    { name: 'tablet-1024', width: 1024, height: 768 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'mobile-375', width: 375, height: 667 },
    { name: 'mobile-320', width: 320, height: 568 },
  ];

  console.log('Beginning Phase 2C.1 browser verification across', viewports.length, 'viewports...');

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Seed visual review profile
  await page.goto(base);
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('exeku_local_v1', 2);
      req.onupgradeneeded = () => {
        for (const s of ['profiles', 'drafts']) {
          if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('profiles', 'readwrite');
      tx.objectStore('profiles').put({
        id: 'visual-review',
        displayName: 'Demo Runner',
        avatarId: 'pixel-wizard',
        experienceLevel: 'beginner',
        preferredLanguage: 'python',
        createdAt: '2026-10-14T00:00:00.000Z',
        updatedAt: '2026-10-14T00:00:00.000Z',
      });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });

  // 1. Desktop 1440px Workspace Verification (3-pane layout, demo controls, results pane)
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base + '/app/workspace?problem=sum-two-integers&demo=true');
  await page.waitForSelector('.workspace-view');
  await page.screenshot({ path: path.join(outputDir, '01-workspace-desktop-1440-sum-two-integers.png') });

  // Verify no horizontal document scroll on desktop
  const docOverflow1440 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(docOverflow1440, false, 'Desktop 1440px must have zero horizontal document overflow');

  // 2. Windows 1366x768 Laptop Viewport Verification
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({ path: path.join(outputDir, '02-workspace-laptop-1366x768.png') });
  const docOverflow1366 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(docOverflow1366, false, 'Laptop 1366x768 must have zero horizontal document overflow');

  // 3. Demo Controls: Load Solved Example and Preview Accepted Modal
  await page.locator('button', { hasText: 'LOAD SOLVED' }).click();
  await page.locator('button', { hasText: 'PREVIEW ACCEPTED' }).click();
  await page.waitForSelector('[role="dialog"]');
  await page.screenshot({ path: path.join(outputDir, '03-modal-simulated-accepted.png') });
  await page.locator('button', { hasText: 'CONTINUE CODING' }).click();
  await page.waitForSelector('[role="dialog"]', { state: 'detached' });

  // 4. Demo Controls: Load Incorrect Example and Preview Wrong Answer Modal
  await page.locator('button', { hasText: 'LOAD INCORRECT' }).click();
  await page.locator('button', { hasText: 'PREVIEW WRONG ANSWER' }).click();
  await page.waitForSelector('[role="dialog"]');
  await page.screenshot({ path: path.join(outputDir, '04-modal-simulated-wrong-answer.png') });
  await page.locator('button', { hasText: 'KEEP WORKING' }).click();
  await page.waitForSelector('[role="dialog"]', { state: 'detached' });

  // 5. Submit Confirmation Dialog
  await page.getByRole('button', { name: 'Submit solution' }).click();
  await page.waitForSelector('[role="dialog"]');
  await page.screenshot({ path: path.join(outputDir, '05-modal-submit-confirmation.png') });
  await page.locator('button', { hasText: 'CANCEL' }).click();
  await page.waitForSelector('[role="dialog"]', { state: 'detached' });

  // 6. Timed Challenge Mode
  await page.goto(base + '/app/challenges');
  await page.waitForSelector('.challenges-view');
  await page.screenshot({ path: path.join(outputDir, '06-challenges-catalog-timed-options.png') });

  // Start timed challenge
  await page.locator('button', { hasText: 'TIMED ⏱' }).first().click();
  await page.waitForSelector('.workspace-view');
  await page.screenshot({ path: path.join(outputDir, '07-workspace-timed-challenge-active.png') });

  // 7. Mobile Viewport 390px (Switcher tabs: Problem, Code, Results)
  await page.setViewportSize({ width: 390, height: 844 });
  // Problem tab
  await page.locator('.xl\\:hidden button', { hasText: 'PROBLEM' }).click();
  await page.screenshot({ path: path.join(outputDir, '08-mobile-390-problem-tab.png') });

  // Code tab
  await page.locator('.xl\\:hidden button', { hasText: 'CODE' }).click();
  await page.screenshot({ path: path.join(outputDir, '09-mobile-390-code-tab.png') });

  // Results tab
  await page.locator('.xl\\:hidden button', { hasText: 'RESULTS' }).click();
  await page.screenshot({ path: path.join(outputDir, '10-mobile-390-results-tab.png') });

  // 8. Appearance Studio & Palettes
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base + '/app/settings');
  await page.waitForSelector('.appearance-studio');
  await page.screenshot({ path: path.join(outputDir, '11-appearance-studio-compact-and-palettes.png') });

  console.log('Phase 2C.1 browser verification complete! Screenshots saved to:', outputDir);
  await browser.close();
}

if (process.argv[1]?.includes('phase2c1-verification')) {
  runBrowserVerification().catch((err) => {
    console.error('Browser verification error:', err);
    process.exit(1);
  });
}
