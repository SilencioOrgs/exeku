import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=(file)=>readFileSync(path.join(root,file),"utf8");

test("Phase 2 shell is top-navigation first and no longer mounts a persistent sidebar",()=>{
 const shell=read("components/app/app-shell.tsx");
 assert.match(shell, /<AppTopbar/);
 assert.doesNotMatch(shell, /<AppSidebar/);
 assert.doesNotMatch(shell, /exeku:sidebar-collapsed/);
 assert.match(shell, /id="main-content"/);
 assert.match(shell, /inert=\{blocked\}/);
 assert.match(shell, /router\.replace\("\/setup"\)/);
});

test("top navigation exposes practice, progress, profile, and guarded links",()=>{
 const nav=read("components/app/app-topbar.tsx");
 assert.match(nav, /\/app\/challenges/);
 assert.match(nav, /\/app\/progress/);
 assert.match(nav, /\/app\/profile/);
 assert.match(nav, /\/app\/settings/);
 assert.match(nav, /requestNavigation/);
 assert.match(nav, /Coming soon/);
 assert.match(nav, /ThemeToggle/);
 assert.match(nav, /<Sheet/);
 assert.match(nav, /<ProblemSearch/);
});

test("problem search works from the public metadata endpoint without importing hidden catalog",()=>{
 const search=read("components/app/problem-search.tsx");
 assert.match(search, /fetch\("\/api\/problems"/);
 assert.match(search, /Ctrl|Meta|KeyK|metaKey/);
 assert.match(search, /aria-label="Search problems"/);
 assert.match(search, /requestNavigation/);
 assert.match(search, /No matching problems/);
 assert.doesNotMatch(search, /@\/lib\/problems\/catalog|testCases|expectedOutput/);
});
