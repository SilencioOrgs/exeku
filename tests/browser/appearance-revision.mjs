// Run against a development server with EXEKU_PLAYWRIGHT_MODULE pointing to playwright-core.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.EXEKU_PLAYWRIGHT_MODULE || 'playwright-core');
const base = process.env.EXEKU_TEST_URL || 'http://localhost:3000';
const output = process.env.EXEKU_BROWSER_ARTIFACTS || '.git/appearance-review/screenshots';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
const recordConsole = message => { if (message.type() === 'error' || /hydrat|instant navigation/i.test(message.text())) errors.push(message.text()); };
const executionRequests = [];
context.on('page', tab => { tab.on('pageerror', error => errors.push(error.message)); tab.on('console', recordConsole); });
page.on('pageerror', error => errors.push(error.message));
page.on('console', recordConsole);
context.on('request', request => { if (request.method() === 'POST' && /\/api\/(execute|judge)/.test(request.url())) executionRequests.push(request.url()); });
const results = [];
const responsiveFailures = [];
const styles = [['Pixel Arcade', 'pixel-arcade'], ['Clarity', 'minimal-saas'], ['Command', 'studio-crm']];
const screenshot = async (name, target = page) => target.screenshot({ path: path.join(output, name + '.png'), fullPage: target.viewportSize().width > 768 && !name.includes('dashboard') });
const canonical = target => target.evaluate(async () => {
  const db = await new Promise((resolve, reject) => { const request = indexedDB.open('exeku_local_v1', 2); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
  const profile = await new Promise((resolve, reject) => { const request = db.transaction('profiles').objectStore('profiles').get('visual-review'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
  db.close(); return profile?.appearancePreferences;
});
const selectStyle = async (name, target = page) => target.locator('label.theme-option').filter({ hasText: name }).click();
const apply = async (target = page) => { await target.getByRole('button', { name: 'Apply changes', exact: true }).click(); await target.waitForFunction(() => !document.querySelector('.appearance-studio .appearance-action-status')?.textContent.includes('Applying')); };
const checkOverflow = async (label, target = page) => {
  await target.evaluate(() => document.fonts.ready);
  const dimensions = await target.evaluate(() => { const main = document.querySelector('.app-shell main'); return { viewport: innerWidth, document: document.documentElement.scrollWidth, mainClient: main?.clientWidth, mainScroll: main?.scrollWidth, studio: document.querySelector('.appearance-studio')?.getBoundingClientRect().right }; });
  if (dimensions.document > dimensions.viewport + 1 || dimensions.studio > dimensions.viewport + 1 || dimensions.mainScroll > dimensions.mainClient + 1) responsiveFailures.push({ label, ...dimensions });
};

try {
  await page.goto(base);
  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const request = indexedDB.open('exeku_local_v1', 2); request.onupgradeneeded = () => { for (const store of ['profiles', 'drafts']) if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store, { keyPath: 'id' }); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    await new Promise((resolve, reject) => { const transaction = db.transaction('profiles', 'readwrite'); transaction.objectStore('profiles').put({ id: 'visual-review', displayName: 'Preview Developer', avatarId: 'glitch-bot', experienceLevel: 'beginner', preferredLanguage: 'python', createdAt: '2026-10-14T00:00:00.000Z', updatedAt: '2026-10-14T00:00:00.000Z' }); transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); }); db.close();
  });
  await page.goto(base + '/app');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: /Settings/ }).click();
  await page.getByRole('heading', { name: 'Appearance Studio', exact: true }).waitFor();
  await page.getByLabel('Color mode', { exact: true }).selectOption('light');
  await selectStyle('Clarity');
  const spaciousPadding = await page.locator('.appearance-preview-panel .preview-content').evaluate(element => getComputedStyle(element).padding);
  await page.getByLabel('Interface density', { exact: true }).selectOption('compact');
  const compactPadding = await page.locator('.appearance-preview-panel .preview-content').evaluate(element => getComputedStyle(element).padding);
  assert.notEqual(compactPadding, spaciousPadding, 'Draft density must visibly change preview spacing');
  assert.equal(await page.locator('html').getAttribute('data-ui-style'), 'pixel-arcade');
  assert.equal(await canonical(page), undefined);
  assert.equal(await page.locator('.appearance-preview-panel .appearance-preview').getAttribute('data-ui-style'), 'minimal-saas');
  await screenshot('settings-before-apply');
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  assert.equal(await canonical(page), undefined);
  await selectStyle('Command');
  await page.getByLabel('Color mode', { exact: true }).selectOption('light');

  await page.getByLabel('UI font size', { exact: true }).fill('115');
  await apply();
  assert.equal((await canonical(page)).uiStyle, 'studio-crm');
  assert.equal((await canonical(page)).uiFontScale, 115);
  await screenshot('settings-after-apply');
  await page.reload();
  await page.getByRole('heading', { name: 'Appearance Studio', exact: true }).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-ui-style'), 'studio-crm');
  await page.getByRole('button', { name: 'Reset to defaults', exact: true }).click();
  assert.equal((await canonical(page)).uiStyle, 'studio-crm');
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  assert.equal(await page.locator('.appearance-preview-panel .appearance-preview').getAttribute('data-ui-style'), 'studio-crm');
  results.push('Profile preview, Apply, Discard, reload, and uncommitted Reset passed');

  const savedBeforeFailure = await canonical(page);
  await selectStyle('Clarity');
  await page.evaluate(() => { globalThis.originalTransaction = IDBDatabase.prototype.transaction; IDBDatabase.prototype.transaction = function(stores, mode, ...rest) { if (mode === 'readwrite' && String(stores).includes('profiles')) throw Error('Test storage denied'); return globalThis.originalTransaction.call(this, stores, mode, ...rest); }; });
  await apply();
  await page.getByText('Changes were not applied.', { exact: false }).waitFor();
  assert.deepEqual(await canonical(page), savedBeforeFailure);
  assert.equal(await page.locator('html').getAttribute('data-ui-style'), 'studio-crm');
  assert.equal(await page.locator('.appearance-preview-panel .appearance-preview').getAttribute('data-ui-style'), 'minimal-saas');
  await page.evaluate(() => { IDBDatabase.prototype.transaction = globalThis.originalTransaction; delete globalThis.originalTransaction; });
  await apply();
  results.push('Failed Apply preserves canonical appearance and retryable draft');

  for (const [name, id] of styles) {
    for (const mode of ['light', 'dark']) {
      await page.goto(base + '/app/settings');
      await page.getByRole('heading', { name: 'Appearance Studio', exact: true }).waitFor();
      await selectStyle(name);
      await page.getByLabel('Color mode', { exact: true }).selectOption(mode);

      await page.getByLabel('UI font size', { exact: true }).fill('100');
      if (await page.getByRole('button', { name: 'Apply changes', exact: true }).isEnabled()) await apply();
      await page.waitForFunction(({ id, mode }) => document.documentElement.dataset.uiStyle === id && document.documentElement.dataset.colorMode === mode, { id, mode });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await screenshot(id + '-' + mode + '-settings');
      for (const width of [320, 375, 390, 768, 1024, 1366, 1440]) {
        await page.setViewportSize({ width, height: width === 1366 ? 768 : 1000 });
        await checkOverflow(name + ' ' + mode + ' ' + width);
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: /Overview/ }).click();
      await page.waitForURL(base + '/app');
      await page.locator('.dashboard h1:visible, .modern-overview h1:visible').waitFor();
      if (id !== 'pixel-arcade') await page.locator('.modern-problem-row').first().waitFor();
      await screenshot(id + '-' + mode + '-dashboard');
      for (const route of ['/app', '/app/challenges', '/app/progress', '/app/workspace']) {
        if (route !== '/app') await page.goto(base + route);
        await page.locator(route === '/app' ? '.dashboard h1:visible, .modern-overview h1:visible' : route.includes('workspace') ? '.workspace-toolbar:visible' : route.includes('challenges') ? '.challenges-view:visible' : '.app-content h1:visible').waitFor();
        if (route === '/app' && id !== 'pixel-arcade') await page.locator('.modern-problem-row').first().waitFor();
        for (const width of [320, 375, 390, 768, 1024, 1366, 1440]) {
          await page.setViewportSize({ width, height: width === 1366 ? 768 : 1000 });
          await checkOverflow(name + ' ' + mode + ' ' + route + ' ' + width);
        }
      }
    }
  }
  assert.deepEqual(responsiveFailures, [], 'Responsive overflow failures at 100% scaling');
  results.push('210 responsive checks: all 3 styles, both modes, 7 widths, and all 5 app routes; dashboard screenshots captured');
  console.log(results.at(-1));
  for (const [name, id] of styles) {
    for (const mode of ['light', 'dark']) {
      await page.goto(base + '/app/settings');
      await selectStyle(name);
      await page.getByLabel('Color mode', { exact: true }).selectOption(mode);

      await page.getByLabel('UI font size', { exact: true }).fill('150');
      if (await page.getByRole('button', { name: 'Apply changes', exact: true }).isEnabled()) await apply();
      for (const route of ['/app/settings', '/app', '/app/challenges', '/app/progress', '/app/workspace']) {
        if (route !== '/app/settings') await page.goto(base + route);
        await page.locator(route === '/app' ? '.dashboard h1:visible, .modern-overview h1:visible' : route.includes('workspace') ? '.workspace-toolbar:visible' : route.includes('challenges') ? '.challenges-view:visible' : route.includes('settings') ? '.appearance-studio:visible' : '.app-content h1:visible').waitFor();
        if (route === '/app' && id !== 'pixel-arcade') await page.locator('.modern-problem-row').first().waitFor();
        for (const width of [320, 375, 390, 768, 1024, 1366, 1440]) {
          await page.setViewportSize({ width, height: width === 1366 ? 768 : 1000 });
          await checkOverflow(name + ' ' + mode + ' 150% ' + route + ' ' + width);
        }
      }
    }
  }
  assert.deepEqual(responsiveFailures, [], 'Responsive overflow failures at 150% scaling');
  results.push('210 additional responsive checks at 150% UI font scaling: all styles, modes, widths, and app routes');
  console.log(results.at(-1));
  await page.goto(base + '/app/settings');

  await page.getByLabel('UI font size', { exact: true }).fill('150');
  if (await page.getByRole('button', { name: 'Apply changes', exact: true }).isEnabled()) await apply();
  for (const width of [320, 375, 768, 1366]) { await page.setViewportSize({ width, height: 1000 }); await checkOverflow('150% ' + width); }
  await page.setViewportSize({ width: 375, height: 1000 });
  await screenshot('mobile-settings-150');
  await page.locator('.appearance-preview-panel').screenshot({ path: path.join(output, 'mobile-live-preview-150.png') });
  await page.locator('.appearance-actions').screenshot({ path: path.join(output, 'mobile-apply-actions-150.png') });
  await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
  await page.getByRole('dialog').waitFor();
  await screenshot('mobile-navigation');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Toggle navigation menu');
  results.push('150% Settings reflow at 4 widths; mobile navigation opens and Escape closes');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + '/app/settings');

  await page.getByLabel('UI font size', { exact: true }).fill('100');
  await apply();
  await page.evaluate(async () => {
    const db = await new Promise(resolve => { const request = indexedDB.open('exeku_local_v1', 2); request.onsuccess = () => resolve(request.result); });
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').put({ id: 'visual-review_sum-two-integers_python', profileId: 'visual-review', language: 'python', filename: 'main.py', code: 'print("existing draft")\n', files: [{ name: 'main.py', content: 'print("existing draft")\n' }, { name: 'helpers.py', content: 'def helper(): return 1\n' }], updatedAt: new Date().toISOString() });
      transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  const workspace = await context.newPage();
  await workspace.goto(base + '/app/workspace?problem=sum-two-integers');
  await workspace.waitForFunction(() => globalThis.monaco?.editor.getEditors().some(editor => editor.getModel()?.uri.path === '/visual-review/sum-two-integers/python/main.py' && editor.getValue() === 'print("existing draft")\n'), { timeout: 30000 });
  await workspace.getByRole('tab', { name: 'helpers.py', exact: true }).waitFor();
  const editorBefore = await workspace.evaluate(() => {
    const editor = globalThis.monaco.editor.getEditors()[0]; const model = editor.getModel(); const original = model.getValue();
    editor.executeEdits('appearance-test', [{ range: model.getFullModelRange(), text: 'print("appearance keeps this code")\n' }]); editor.pushUndoStop(); editor.setPosition({ lineNumber: 1, column: 8 }); editor.focus();
    editor.setSelection({ startLineNumber: 1, startColumn: 3, endLineNumber: 1, endColumn: 8 });
    return { id: model.id, code: model.getValue(), original, position: editor.getPosition(), selection: editor.getSelection(), focused: editor.hasTextFocus(), language: model.getLanguageId() };
  });
  await selectStyle('Pixel Arcade');
  if (await page.getByRole('button', { name: 'Apply changes', exact: true }).isEnabled()) await apply();
  await workspace.waitForFunction(() => document.documentElement.dataset.uiStyle === 'pixel-arcade');
  const editorAfter = await workspace.evaluate(() => { const editor = globalThis.monaco.editor.getEditors()[0]; const model = editor.getModel(); return { id: model.id, code: model.getValue(), position: editor.getPosition(), selection: editor.getSelection(), focused: editor.hasTextFocus(), language: model.getLanguageId(), canUndo: model.canUndo() }; });
  assert.equal(editorAfter.id, editorBefore.id); assert.equal(editorAfter.code, editorBefore.code); assert.deepEqual(editorAfter.position, editorBefore.position); assert.equal(editorAfter.language, editorBefore.language); assert.equal(editorAfter.canUndo, true);
  assert.deepEqual(editorAfter.selection, editorBefore.selection); assert.equal(editorBefore.focused, true); assert.equal(editorAfter.focused, true);
  assert.equal(new URL(workspace.url()).searchParams.get('problem'), 'sum-two-integers');
  await workspace.evaluate(() => globalThis.monaco.editor.getEditors()[0].trigger('appearance-test', 'undo', null));
  assert.equal(await workspace.evaluate(() => globalThis.monaco.editor.getEditors()[0].getValue()), editorBefore.original);
  await workspace.evaluate(() => globalThis.monaco.editor.getEditors()[0].trigger('appearance-test', 'redo', null));
  assert.equal(await workspace.evaluate(() => globalThis.monaco.editor.getEditors()[0].getValue()), editorBefore.code);
  await workspace.waitForFunction(async code => {
    const db = await new Promise(resolve => { const request = indexedDB.open('exeku_local_v1', 2); request.onsuccess = () => resolve(request.result); });
    const draft = await new Promise(resolve => { const request = db.transaction('drafts').objectStore('drafts').get('visual-review_sum-two-integers_python'); request.onsuccess = () => resolve(request.result); }); db.close(); return draft?.code === code && draft.files?.length === 2 && draft.files[1].content === 'def helper(): return 1\n';
  }, editorBefore.code);
  await workspace.locator('nav[aria-label="Main navigation"] a[href="/app/challenges"]:visible').click();
  await workspace.locator('a[href="/app/workspace?problem=sum-two-integers"]:visible').first().click();
  await workspace.waitForFunction(code => globalThis.monaco?.editor.getEditors().some(editor => editor.getDomNode()?.getBoundingClientRect().height > 0 && editor.getValue() === code), editorBefore.code);
  await workspace.waitForFunction(position => globalThis.monaco?.editor.getEditors().some(editor => editor.getDomNode()?.getBoundingClientRect().height > 0 && JSON.stringify(editor.getPosition()) === JSON.stringify(position)), editorBefore.position);
  const returned = await workspace.evaluate(() => { const editor = globalThis.monaco.editor.getEditors().find(editor => editor.getDomNode()?.getBoundingClientRect().height > 0); return { id: editor.getModel().id, selection: editor.getSelection() }; });
  assert.equal(returned.id, editorBefore.id);
  assert.deepEqual(returned.selection, editorBefore.selection);
  await workspace.getByRole('tab', { name: 'helpers.py', exact: true }).waitFor();
  await screenshot('monaco-preserved', workspace);
  results.push('Real Monaco model, source, language, cursor, undo, redo, and selected problem preserved across cross-tab Apply');
  await workspace.close();

  const guestContext = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const guest = await guestContext.newPage();
  await guest.goto(base);
  await guest.getByRole('button', { name: 'Appearance', exact: true }).click();
  await selectStyle('Clarity', guest);
  await guest.getByLabel('Color mode', { exact: true }).selectOption('light');
  assert.equal(await guest.evaluate(() => localStorage.getItem('exeku_appearance_settings')), null);
  await screenshot('landing-selector-mobile', guest);
  await guest.keyboard.press('Escape');
  assert.equal(await guest.evaluate(() => localStorage.getItem('exeku_appearance_settings')), null);
  await guest.getByRole('button', { name: 'Appearance', exact: true }).click();
  await selectStyle('Command', guest);
  await apply(guest);
  await guest.reload();
  await guest.waitForFunction(() => document.documentElement.dataset.uiStyle === 'studio-crm');
  await checkOverflow('Guest landing mobile', guest);
  await guest.goto(base + '/setup');
  await guest.waitForFunction(() => document.documentElement.dataset.uiStyle === 'studio-crm');
  await checkOverflow('Guest setup mobile', guest);
  await guest.goto(base + '/app/settings');
  await guest.waitForURL(base + '/setup');
  await guestContext.close();
  results.push('Guest landing preview/cancel writes nothing; Apply persists through reload and setup');
  await page.goto(base + '/app/settings');
  await page.getByLabel('Color mode', { exact: true }).selectOption('system');
  await apply();
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.documentElement.dataset.colorMode === 'light' && document.documentElement.dataset.reducedMotion === 'true');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForFunction(() => document.documentElement.dataset.colorMode === 'dark');
  assert.equal((await canonical(page)).colorMode, 'system');
  results.push('System color and reduced-motion changes resolve without replacing saved System preference');
  await page.goto(base);
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await selectStyle('Clarity');
  await page.evaluate(async () => {
    const db = await new Promise(resolve => { const request = indexedDB.open('exeku_local_v1', 2); request.onsuccess = () => resolve(request.result); });
    await new Promise(resolve => { const transaction = db.transaction('profiles', 'readwrite'); transaction.objectStore('profiles').put({ id: 'second-profile', displayName: 'Second Developer', avatarId: 'glitch-bot', preferredLanguage: 'python', experienceLevel: 'beginner', createdAt: '2026-10-14T01:00:00.000Z', updatedAt: '2026-10-14T01:00:00.000Z', appearancePreferences: { uiStyle: 'pixel-arcade', colorMode: 'dark' } }); transaction.oncomplete = resolve; }); db.close(); window.dispatchEvent(new CustomEvent('exeku:profile-changed'));
  });
  await page.waitForFunction(() => document.querySelector('.appearance-preview-panel .appearance-preview')?.dataset.uiStyle === 'pixel-arcade');
  assert.equal(await page.getByRole('button', { name: 'Apply changes', exact: true }).isDisabled(), true);
  await page.keyboard.press('Escape');
  results.push('Profile identity transition discards an open modal draft without applying it to the new profile');
  assert.equal(executionRequests.length, 0, 'Appearance operations must not execute or submit code');
  assert.deepEqual(errors, []);
  assert.deepEqual(responsiveFailures, [], 'Responsive overflow failures');
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ results, errors, executionRequests, screenshots: output }, null, 2));
  console.log(JSON.stringify({ passed: results, errors, executionRequests, screenshots: output }, null, 2));
} finally { await browser.close(); }
