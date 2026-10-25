import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const entries = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, header, body]) => ({
  selector: header.trim(),
  values: Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim().replace(/\s*!important$/, "")])),
}));

function tokens(mode, contrastMode = "standard") {
  const result = {};
  for (const block of entries) {
    const selector = block.selector;
    const plain = selector === ":root";
    const theme = selector === `:root[data-color-mode="${mode}"]`;
    const high = contrastMode === "high" && selector === `[data-contrast="high"][data-color-mode="${mode}"]`;
    if (plain || theme || high) Object.assign(result, block.values);
  }
  function resolve(name) {
    const raw = result[name];
    const variable = /^var\((--[\w-]+)\)$/.exec(raw ?? "");
    return variable ? resolve(variable[1]) : raw;
  }
  return resolve;
}

function rgb(hex) {
  assert.match(hex, /^#[0-9a-f]{6}$/i);
  return hex.slice(1).match(/../g).map((x) => parseInt(x, 16));
}
function luminance(hex) {
  const channels = rgb(hex).map((n) => n/255).map((v) => v<=0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4);
  return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
}
function contrast(a,b) { const x=luminance(a), y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }

for (const mode of ["light","dark"]) {
  for (const setting of ["standard","high"]) {
    test(`green SaaS ${mode} ${setting}: text and semantic colors meet contrast targets`, () => {
      const get=tokens(mode,setting);
      for (const surface of ["canvas","surface","elevated"]) {
        for (const token of ["text-main","text-muted","text-dim","accent","mint","pink","primary-text","warning"]) {
          const a=get("--color-"+token);
          const b=get("--base-"+surface);
          const ratio=contrast(a,b);
          assert.ok(ratio >= 4.5,`${mode} ${setting}: ${token} on ${surface} contrast ${ratio.toFixed(2)}`);
        }
      }
      for (const [surface,foreground] of [
        ["--color-primary","--primary-foreground"],
        ["--color-accent","--accent-foreground"],
        ["--color-pink","--color-danger-foreground"],
      ]) {
        const ratio=contrast(get(surface),get(foreground));
        assert.ok(ratio>=4.5,`${mode} ${setting}: ${surface} button contrast ${ratio.toFixed(2)}`);
      }
    });
  }
}

test("semantic Tailwind utilities compile", async () => {
  const { compile } = createRequire(import.meta.url)("tailwindcss");
  const result=await compile(css.replace(/^@import[^\n]+\n/gm,"")+"\n@tailwind utilities;");
  const output=result.build(["text-primary","bg-primary","border-border","ring-ring"]);
  for(const selector of [".text-primary",".bg-primary",".border-border",".ring-ring"]) assert.ok(output.includes(selector),selector);
});
