import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { appearanceBootstrap } from "../lib/appearance-bootstrap.ts";

function boot(stored, {dark=false,motion=false,denied=false}={}) {
 const root={dataset:{},style:{values:{},setProperty(k,v){this.values[k]=v}},classList:{toggle(k,v){this[k]=v}}};
 vm.runInNewContext(appearanceBootstrap,{document:{documentElement:root},localStorage:{getItem(k){if(denied)throw Error("denied");return stored[k]??null}},window:{matchMedia:q=>({matches:q.includes("color-scheme")?dark:motion})}});
 return root;
}
test("boot handles corrupt and denied storage with consistent defaults",()=>{
 for(const stored of [{},{exeku_appearance_settings:"{"}]) {const root=boot(stored);assert.equal(root.dataset.uiStyle,"minimal-saas");assert.equal(root.dataset.colorMode,"light");assert.equal(root.style.values["--ui-font-scale"],"100%");}
 assert.equal(boot({}, {denied:true,motion:true}).dataset.reducedMotion,"true");
});
test("boot resolves system without replacing its saved preference",()=>{
 const raw=JSON.stringify({uiStyle:"minimal-saas",colorMode:"system",reducedMotion:"system",density:"spacious"});
 for(const dark of [false,true]) {const root=boot({exeku_appearance_settings:raw},{dark,motion:true});assert.equal(root.dataset.colorMode,dark?"dark":"light");assert.equal(root.dataset.reducedMotion,"true");assert.equal(root.dataset.density,"spacious");}
});
test("boot prefers synchronized active snapshot and validates surface controls",()=>{
 const root=boot({exeku_appearance_snapshot:JSON.stringify({uiStyle:"studio-crm",contrastMode:"high",brightness:120,uiFontScale:999}),exeku_appearance_settings:JSON.stringify({uiStyle:"minimal-saas"})});
 assert.equal(root.dataset.uiStyle,"minimal-saas");assert.equal(root.style.values["--ui-font-scale"],"150%");assert.equal(root.style.values["--brightness-factor"],"1");
 const invalid=boot({exeku_appearance_settings:JSON.stringify({uiStyle:"bad",uiFontScale:null,brightness:"500",uiFontFamily:"inter"})});
 assert.equal(invalid.dataset.uiStyle,"minimal-saas");assert.equal(invalid.dataset.uiFont,"system-sans");assert.equal(invalid.style.values["--ui-font-scale"],"100%");assert.equal(invalid.style.values["--brightness-factor"],"1");
});
