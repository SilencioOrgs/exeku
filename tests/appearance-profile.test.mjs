import test from "node:test";
import assert from "node:assert/strict";
import { profileRepository } from "../lib/storage/profile-repository.ts";
import { appearanceRepository } from "../lib/storage/appearance-repository.ts";
import { DEFAULT_APPEARANCE_PREFERENCES, normalizeAppearancePreferences } from "../types/appearance.ts";
import { idbPut, idbGet, PROFILE_STORE, DRAFT_STORE } from "../lib/storage/db.ts";

test("profile inherits guest appearance and preserves unrelated data when edited or reset", async () => {
  await profileRepository.clearAll();
  appearanceRepository.savePreferences({uiStyle:"minimal-saas",density:"spacious"});
  const profile=await profileRepository.saveProfile({displayName:"Appearance Dev",avatarId:"glitch-bot",experienceLevel:"beginner",preferredLanguage:"c"});
  assert.equal(profile.appearancePreferences.uiStyle,"minimal-saas");
  const draft={id:"appearance-preservation",profileId:profile.id,source:"int main() { return 0; }"};
  await idbPut(DRAFT_STORE,draft);
  await profileRepository.saveAppearancePreferences(profile.id,normalizeAppearancePreferences({uiStyle:"studio-crm"}));
  const reloaded=await idbGet(PROFILE_STORE,profile.id);
  assert.equal(reloaded.appearancePreferences.uiStyle,"studio-crm");
  const before={...profile}; delete before.appearancePreferences;
  const after={...reloaded}; delete after.appearancePreferences;
  assert.deepEqual(after,before);
  assert.equal(appearanceRepository.getPreferences().uiStyle,"minimal-saas");
  await profileRepository.saveAppearancePreferences(profile.id,DEFAULT_APPEARANCE_PREFERENCES);
  assert.deepEqual((await idbGet(PROFILE_STORE,profile.id)).appearancePreferences,DEFAULT_APPEARANCE_PREFERENCES);
  assert.deepEqual(await idbGet(DRAFT_STORE,draft.id),draft);
  await profileRepository.updateProfile(profile.id,{bio:"Preserved"});
  assert.deepEqual((await idbGet(PROFILE_STORE,profile.id)).appearancePreferences,DEFAULT_APPEARANCE_PREFERENCES);
});

test("legacy profile accepts appearance without a database migration", async () => {
  const legacy={id:"legacy-profile",displayName:"Legacy",avatarId:"glitch-bot",experienceLevel:"intermediate",preferredLanguage:"python",createdAt:"2025-01-01T00:00:00.000Z",updatedAt:"2025-01-01T00:00:00.000Z"};
  await idbPut(PROFILE_STORE,legacy);
  await profileRepository.saveAppearancePreferences(legacy.id,normalizeAppearancePreferences({colorMode:"system"}));
  const saved=await idbGet(PROFILE_STORE,legacy.id);
  assert.equal(saved.appearancePreferences.colorMode,"system");
  const remaining={...saved}; delete remaining.appearancePreferences;
  assert.deepEqual(remaining,legacy);
  await assert.rejects(profileRepository.saveAppearancePreferences("missing",DEFAULT_APPEARANCE_PREFERENCES),/Failed to save profile appearance/);
});

test("corrupted guest data falls back and later writes recover",()=>{
  const map=new Map([["exeku_appearance_settings","{bad-json"]]);
  const storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
  const repo=new (appearanceRepository.constructor)({storage});
  assert.deepEqual(repo.getPreferences(),DEFAULT_APPEARANCE_PREFERENCES);
  assert.equal(repo.persistenceStatus,"error");
  repo.savePreferences({colorMode:"light"});
  assert.equal(repo.persistenceStatus,"saved");
  const reloaded=new (appearanceRepository.constructor)({storage});
  assert.equal(reloaded.getPreferences().colorMode,"light");
});

test("profile persistence rejects IndexedDB failure instead of reporting saved",async()=>{
 const previous=globalThis.window; globalThis.window={indexedDB:{open(){throw Error("permission denied")}}};
 try {await assert.rejects(profileRepository.saveAppearancePreferences("legacy-profile",DEFAULT_APPEARANCE_PREFERENCES),/Failed to save profile appearance/);} finally {if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});

test("concurrent profile edits preserve latest appearance",async()=>{
 const profile=await profileRepository.saveProfile({displayName:"Concurrent",avatarId:"glitch-bot",experienceLevel:"beginner",preferredLanguage:"python"});
 await Promise.all([
   profileRepository.updateProfile(profile.id,{bio:"New biography"}),
   profileRepository.saveAppearancePreferences(profile.id,normalizeAppearancePreferences({uiStyle:"studio-crm"})),
 ]);
 const saved=await idbGet(PROFILE_STORE,profile.id);
 assert.equal(saved.bio,"New biography");
 assert.equal(saved.appearancePreferences.uiStyle,"studio-crm");
});

test("atomic storage update rejects transaction abort after successful put request",async()=>{
 const {idbUpdate}=await import("../lib/storage/db.ts");
 const previous=globalThis.window;
 const transaction={error:new Error("quota exceeded"),objectStore(){return {
   get(){const request={result:{id:"profile"}};queueMicrotask(()=>request.onsuccess());return request;},
   put(){queueMicrotask(()=>transaction.onabort());return {};},
 };}};
 globalThis.window={indexedDB:{open(){const request={};queueMicrotask(()=>request.onsuccess({target:{result:{transaction:()=>transaction}}}));return request;}}};
 try {await assert.rejects(idbUpdate(PROFILE_STORE,"profile",value=>({...value,appearancePreferences:DEFAULT_APPEARANCE_PREFERENCES})),/quota exceeded/);}
 finally {if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});
