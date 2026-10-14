import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), values: Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, key, value]) => [key, value.replace(/ !important$/, '').trim()])) }));
function palette(style, mode, contrast = 'standard') {
  const attributes = { 'ui-style': style, 'color-mode': mode, contrast };
  const values = {};
  for (const { selector, values: next } of blocks) {
    if (selector.startsWith('@') || selector.includes('@theme')) continue;
    const matches = selector.split(',').some(part => {
      part = part.trim();
      if (part === ':root') return true;
      if (part.includes(':') || /[ .*]/.test(part)) return false;
      const requested = [...part.matchAll(/\[data-([\w-]+)="([^"]+)"\]/g)];
      return requested.length && requested.every(([, key, value]) => attributes[key] === value);
    });
    if (matches) Object.assign(values, next);
  }
  function resolve(key) { const value = values[key]; const reference = value?.match(/^var\((--[\w-]+)\)$/); return reference ? resolve(reference[1]) : value; }
  return resolve;
}
function rgb(hex) { assert.match(hex, /^#[0-9a-f]{6}$/i); return hex.slice(1).match(/../g).map(value => parseInt(value, 16)); }
function luminance(channels) { return channels.map(value => { const channel = value / 255; return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0); }
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
for (const style of ['pixel-arcade', 'minimal-saas', 'studio-crm']) {
  for (const mode of ['light', 'dark']) {
    for (const setting of ['standard', 'high']) {
      test(style + ' ' + mode + ' ' + setting + ' readable surfaces and controls', () => {
        const get = palette(style, mode, setting);
        for (const factor of setting === 'high' ? [1] : [0.8, 1, 1.2]) {
          for (const surface of ['canvas', 'surface', 'elevated']) {
            const background = rgb(get('--base-' + surface)).map(channel => Math.min(255, channel * factor));
            for (const token of ['text-main', 'text-muted', 'text-dim', 'accent', 'mint', 'pink', 'primary-text', 'warning']) {
              const ratio = contrast(rgb(get('--color-' + token)), background);
              assert.ok(ratio >= (setting === 'high' ? 7 : 4.5), token + ' on ' + surface + ' at ' + factor + ': ' + ratio.toFixed(2));
            }
          }
        }
        for (const [background, foreground] of [['--color-primary', '--primary-foreground'], ['--color-accent', '--accent-foreground'], ['--color-pink', '--color-danger-foreground']]) {
          const ratio = contrast(rgb(get(background)), rgb(get(foreground)));
          assert.ok(ratio >= 4.5, background + ' button: ' + ratio.toFixed(2));
        }
      });
    }
  }
}

test('semantic utilities compile without self-referencing utility errors', async () => {
  const { compile } = createRequire(import.meta.url)('tailwindcss');
  const result = await compile(css.replace(/^@import[^\n]+\n/gm, '') + '\n@tailwind utilities;');
  const output = result.build(['text-primary', 'bg-primary', 'border-border', 'ring-ring']);
  for (const selector of ['.text-primary', '.bg-primary', '.border-border', '.ring-ring']) assert.ok(output.includes(selector), selector);
});
