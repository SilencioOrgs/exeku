import test from "node:test";
import assert from "node:assert/strict";
import { resolveEditorAppearance } from "../lib/editor-appearance.ts";
import { DEFAULT_APPEARANCE_PREFERENCES as defaults } from "../types/appearance.ts";

test("editor follows all six styles and modes",()=>{
 for(const [style,name] of [["pixel-arcade","pixel"],["minimal-saas","minimal"],["studio-crm","studio"]]) for(const mode of ["light","dark"]) assert.equal(resolveEditorAppearance({...defaults,uiStyle:style},mode,false).theme,"exeku-"+name+"-"+mode);
});
test("editor overrides remain independent with global high contrast taking precedence",()=>{
 assert.equal(resolveEditorAppearance({...defaults,editorTheme:"light"},"dark",false).theme,"exeku-pixel-light");
 assert.equal(resolveEditorAppearance({...defaults,editorTheme:"dark"},"light",false).theme,"exeku-pixel-dark");
 assert.equal(resolveEditorAppearance({...defaults,editorTheme:"high-contrast"},"light",false).theme,"exeku-hc-light");
 assert.equal(resolveEditorAppearance({...defaults,editorTheme:"light",contrastMode:"high"},"dark",false).theme,"exeku-hc-dark");
});
test("editor appearance contains only visual options and does not mutate input",()=>{
 const prefs=Object.freeze({...defaults,editorFontFamily:"monospace",editorFontSize:20,editorLineHeight:18,editorLigatures:true});
 const result=resolveEditorAppearance(prefs,"dark",true);
 assert.equal(result.options.fontSize,20);assert.equal(result.options.lineHeight,22);assert.equal(result.options.fontLigatures,true);
 assert.equal(result.options.cursorBlinking,"solid");assert.equal(result.options.smoothScrolling,false);
 assert.deepEqual(Object.keys(result.options).sort(),["cursorBlinking","fontFamily","fontLigatures","fontSize","lineHeight","smoothScrolling"].sort());
 assert.equal(prefs.editorLineHeight,18);
});
