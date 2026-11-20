import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as accountRules from "../lib/accounts/rules.ts";
import * as roleRules from "../lib/roles/rules.ts";
import * as classRules from "../lib/classes/rules.ts";
import * as catalog from "../lib/problems/catalog.ts";
import { fakeDb, must } from "./fixtures/fake-db.mjs";

function loadTs(path, modules) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(output, {
    module: loaded,
    exports: loaded.exports,
    URL,
    console,
    require: (name) => {
      if (name in modules) return modules[name];
      throw new Error(`unexpected import: ${name}`);
    },
  });
  return loaded.exports;
}

test("checkFacultyRequest validates required school, department, title, and employee ID", () => {
  const bad = roleRules.checkFacultyRequest({ schoolName: "A", department: "", positionTitle: "", employeeId: "1" });
  assert.equal(bad.ok, false);
  assert.ok(bad.fieldErrors.schoolName);
  assert.ok(bad.fieldErrors.department);
  assert.ok(bad.fieldErrors.positionTitle);
  assert.ok(bad.fieldErrors.employeeId);

  const ok = roleRules.checkFacultyRequest({
    schoolName: "Laguna State Polytechnic University",
    department: "College of Computer Studies",
    positionTitle: "Instructor I",
    employeeId: "FAC-2026-01",
    note: "Teaching Data Structures",
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.request.employeeId, "FAC-2026-01");
});

test("submitFacultyRequest blocks existing teachers and duplicate pending requests", async () => {
  const tables = { faculty_requests: [] };
  const repo = loadTs("lib/roles/repository.ts", {
    "server-only": {},
    "@/lib/db/client": { db: fakeDb(tables), must },
    "./rules": roleRules,
  });

  const alreadyTeacher = await repo.submitFacultyRequest(
    { id: "t1", name: "Prof", role: "teacher" },
    { schoolName: "LSPU", department: "CCS", positionTitle: "Instructor", employeeId: "EMP-1" },
  );
  assert.equal(alreadyTeacher.ok, false);
  assert.equal(alreadyTeacher.status, 409);

  const first = await repo.submitFacultyRequest(
    { id: "s1", name: "Applicant", role: "student" },
    { schoolName: "LSPU", department: "CCS", positionTitle: "Instructor", employeeId: "EMP-2" },
  );
  assert.equal(first.ok, true);
  assert.equal(first.request.status, "pending");

  const dup = await repo.submitFacultyRequest(
    { id: "s1", name: "Applicant", role: "student" },
    { schoolName: "LSPU", department: "CCS", positionTitle: "Instructor", employeeId: "EMP-2" },
  );
  assert.equal(dup.ok, false);
  assert.equal(dup.status, 409);
});

test("teacher creates class with invite code, student joins, teacher groups students and assigns problems", async () => {
  const tables = {
    profiles: [
      { user_id: "teacher-1", display_name: "Prof Ada", avatar_id: "glitch-bot", border_id: "none", school_email: "ada@lspu.edu.ph", role: "teacher", is_admin: false },
      { user_id: "student-1", display_name: "Grace", avatar_id: "glitch-bot", border_id: "none", school_email: "grace@lspu.edu.ph", role: "student", is_admin: false },
    ],
    classes: [],
    class_groups: [],
    class_members: [],
    class_problems: [],
    submissions: [
      { id: "sub-1", user_id: "student-1", problem_id: "hello-world", verdict: "ACCEPTED", points: 100 },
    ],
  };

  const repo = loadTs("lib/classes/repository.ts", {
    "server-only": {},
    "@/lib/accounts/rules": accountRules,
    "@/lib/db/client": { db: fakeDb(tables), must },
    "@/lib/problems/store": {
      listProblemSummaries: async () => catalog.getProblemSummaries(),
    },
    "@/lib/roles/rules": roleRules,
    "./rules": classRules,
  });

  const studentViewer = { id: "student-1", name: "Grace", role: "student" };
  const teacherViewer = { id: "teacher-1", name: "Prof Ada", role: "teacher" };

  // Students cannot create classes.
  const denied = await repo.createClass(studentViewer, { name: "Algorithms" });
  assert.equal(denied.ok, false);
  assert.equal(denied.status, 403);

  // Teacher creates class and gets EXK-XXXXXX invite code.
  const created = await repo.createClass(teacherViewer, { name: "Algorithms", section: "BSCPE 2A" });
  assert.equal(created.ok, true);
  assert.match(created.inviteCode, /^EXK-[A-Z0-9]{6}$/);

  // Student joins with invite code (even without the EXK- prefix).
  const joined = await repo.joinClassByCode(studentViewer, { inviteCode: created.inviteCode.slice(4).toLowerCase() });
  assert.equal(joined.ok, true);
  assert.equal(joined.classId, created.id);

  // Teacher creates a student group, assigns student to it, and assigns hello-world problem.
  assert.equal((await repo.performClassAction(teacherViewer, created.id, { action: "createGroup", name: "Group A" })).ok, true);
  const groupId = tables.class_groups[0].id;
  assert.equal((await repo.performClassAction(teacherViewer, created.id, { action: "assignMemberGroup", userId: "student-1", groupId })).ok, true);
  assert.equal((await repo.performClassAction(teacherViewer, created.id, { action: "addProblem", problemId: "hello-world" })).ok, true);

  // Students cannot mutate teacher settings.
  const forbidden = await repo.performClassAction(studentViewer, created.id, { action: "createGroup", name: "Hack" });
  assert.equal(forbidden.ok, false);
  assert.equal(forbidden.status, 403);

  // Detail view reports solved progress per student, per group, and per problem.
  const detail = await repo.getClassDetail(teacherViewer, created.id);
  assert.equal(detail.members.length, 1);
  assert.equal(detail.members[0].groupName, "Group A");
  assert.deepEqual(Array.from(detail.members[0].solvedProblemIds), ["hello-world"]);
  assert.equal(detail.groups[0].solvedCount, 1);
  assert.equal(detail.groups[0].totalPossibleSolves, 1);
  assert.equal(detail.problems[0].solvedByCount, 1);

  // Student detail view hides inviteCode & schoolEmail but shows their AC status.
  const studentDetail = await repo.getClassDetail(studentViewer, created.id);
  assert.equal(studentDetail.inviteCode, undefined);
  assert.equal(studentDetail.members[0].schoolEmail, undefined);
  assert.equal(studentDetail.problems[0].solvedByViewer, true);
});
