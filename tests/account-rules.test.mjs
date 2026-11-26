import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkNewSchool, checkSchoolAccount } from "../lib/accounts/rules.ts";
import { birthdayBounds, computeAgeFromBirthday } from "../lib/accounts/birthday.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

const school = {
  id: "test-u", name: "Test University", shortName: "TU", locationId: "x", locationName: "X",
  emailDomains: ["tu.edu.ph"], campuses: [{ id: "main", name: "Main" }], programs: [{ id: "bs", name: "BS" }],
};
const lookup = {
  findSchool: async (id) => (id === school.id ? school : null),
  findSchoolByDomain: async (domain) => (domain === "tu.edu.ph" ? school : null),
};
const valid = { age: "20", email: "Maria@TU.edu.ph", school: { kind: "listed", schoolId: "test-u", campusId: "main", programId: "bs" } };

test("school account normalizes a valid student", async () => {
  const result = await checkSchoolAccount(valid, lookup);
  assert.equal(result.ok, true);
  assert.equal(result.account.email, "maria@tu.edu.ph");
  assert.equal(result.account.age, 20);
  assert.equal(result.account.school.campus, "Main");
  assert.equal(result.account.school.program, "BS");
});

test("school account computes exact age from birthday and rejects impossible or out-of-range dates", async () => {
  const refDate = new Date(2026, 10, 26); // Nov 26, 2026
  assert.equal(computeAgeFromBirthday("2006-11-26", refDate), 20);
  assert.equal(computeAgeFromBirthday("2006-11-27", refDate), 19);
  assert.equal(computeAgeFromBirthday("2005-02-30", refDate), null);
  assert.equal(computeAgeFromBirthday("not-a-date", refDate), null);
  assert.deepEqual(birthdayBounds(refDate), { min: "1926-11-26", max: "2013-11-26" });

  const withBirthday = await checkSchoolAccount(
    { birthday: "2005-05-15", email: "Maria@TU.edu.ph", school: valid.school },
    lookup,
  );
  assert.equal(withBirthday.ok, true);
  assert.equal(withBirthday.account.birthday, "2005-05-15");
  assert.equal(withBirthday.account.age, computeAgeFromBirthday("2005-05-15"));

  const tooYoung = await checkSchoolAccount(
    { birthday: "2020-01-01", email: "Maria@TU.edu.ph", school: valid.school },
    lookup,
  );
  assert.equal(tooYoung.ok, false);
  assert.match(tooYoung.fieldErrors.birthday, /13/);

  const badDate = await checkSchoolAccount(
    { birthday: "2005-02-30", email: "Maria@TU.edu.ph", school: valid.school },
    lookup,
  );
  assert.equal(badDate.ok, false);
  assert.ok(badDate.fieldErrors.birthday);
});

test("school account rejects emails outside the selected school, look-alike domains included", async () => {
  for (const email of ["a@gmail.com", "a@tu.edu.ph.evil.com", "a@nottu.edu.ph"]) {
    const result = await checkSchoolAccount({ ...valid, email }, lookup);
    assert.equal(result.ok, false, email);
    assert.match(result.fieldErrors.email, /@tu\.edu\.ph/);
  }
  assert.equal((await checkSchoolAccount({ ...valid, email: "a@cs.tu.edu.ph" }, lookup)).ok, true);
});

test("school account reports each bad field and survives malformed input", async () => {
  const result = await checkSchoolAccount({ age: "9", email: "nope", school: { schoolId: "test-u", campusId: "nope" } }, lookup);
  assert.deepEqual(Object.keys(result.fieldErrors).sort(), ["age", "campus", "email", "program"]);
  for (const bad of [null, [], "x", { age: 5, school: 3 }]) assert.equal((await checkSchoolAccount(bad, lookup)).ok, false);
});

test("an added school must use an academic domain, must not be listed, and stays pending", async () => {
  assert.ok((await checkNewSchool({ name: "New College", location: "Cebu", emailDomain: "gmail.com" }, lookup)).fieldErrors.emailDomain);
  assert.match((await checkNewSchool({ name: "Dup", location: "Cebu", emailDomain: "tu.edu.ph" }, lookup)).fieldErrors.emailDomain, /already listed/);
  const added = { kind: "new", name: "New College", location: "Cebu", emailDomain: "@new.edu.ph" };
  const result = await checkSchoolAccount({ ...valid, email: "a@new.edu.ph", school: added }, lookup);
  assert.equal(result.account.school.status, "pending_review");
  assert.equal((await checkSchoolAccount({ ...valid, school: added }, lookup)).ok, false);
});

test("school data and email rules stay out of client code", () => {
  assert.match(read("lib/accounts/school-directory.ts"), /import "server-only"/);
  const dirs = ["components/setup", "components/app/school"];
  const files = dirs.flatMap((d) => fs.readdirSync(path.join(root, d)).map((f) => `${d}/${f}`));
  for (const file of [...files, "lib/accounts/api.ts"]) {
    assert.doesNotMatch(read(file), /school-directory|accounts\/rules|lspu\.edu/i, file);
  }
});
