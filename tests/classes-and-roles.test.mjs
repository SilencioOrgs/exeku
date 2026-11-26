import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as accountRules from "../lib/accounts/rules.ts";
import * as roleRules from "../lib/roles/rules.ts";
import * as classRules from "../lib/classes/rules.ts";
import * as catalog from "./fixtures/sample-problems.ts";
import { exactCount, fakeDb, fetchAllPages, isMissingRelationError, must } from "./fixtures/fake-db.mjs";
import { NextResponse } from "next/server";
import * as readJson from "../lib/accounts/read-json.ts";

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

test("checkFacultyRequest validates complete name, normal Gmail address, department, title, and employee ID", () => {
  const bad = roleRules.checkFacultyRequest({
    fullName: "Juan",
    schoolEmail: "juan@lspu.edu.ph",
    schoolName: "A",
    department: "",
    positionTitle: "",
    employeeId: "1",
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.fieldErrors.fullName);
  assert.ok(bad.fieldErrors.schoolEmail);
  assert.ok(bad.fieldErrors.schoolName);
  assert.ok(bad.fieldErrors.department);
  assert.ok(bad.fieldErrors.positionTitle);
  assert.ok(bad.fieldErrors.employeeId);

  const nonGmail = roleRules.checkFacultyRequest({
    fullName: "Juan Dela Cruz",
    schoolEmail: "juan.delacruz@yahoo.com",
    schoolName: "Laguna State Polytechnic University",
    department: "College of Computer Studies",
    positionTitle: "Instructor I",
    employeeId: "FAC-2026-01",
  });
  assert.equal(nonGmail.ok, false);
  assert.ok(nonGmail.fieldErrors.schoolEmail);

  const ok = roleRules.checkFacultyRequest({
    fullName: "Juan Dela Cruz",
    schoolEmail: "Juan.DelaCruz@Gmail.com",
    schoolName: "Laguna State Polytechnic University",
    department: "College of Computer Studies",
    positionTitle: "Instructor I",
    employeeId: "FAC-2026-01",
    note: "Teaching Data Structures",
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.request.fullName, "Juan Dela Cruz");
  assert.equal(ok.request.schoolEmail, "juan.delacruz@gmail.com");
  assert.equal(ok.request.employeeId, "FAC-2026-01");
});

test("submitFacultyRequest enforces Clerk-verified Gmail address and blocks existing teachers or duplicate pending requests", async () => {
  const tables = { faculty_requests: [] };
  const repo = loadTs("lib/roles/repository.ts", {
    "server-only": {},
    "@/lib/db/client": { db: fakeDb(tables), exactCount, fetchAllPages, must },
    "./rules": roleRules,
  });

  const validInput = {
    fullName: "Prof Ada Lovelace",
    schoolEmail: "ada.lovelace@gmail.com",
    schoolName: "LSPU",
    department: "CCS",
    positionTitle: "Instructor",
    employeeId: "EMP-2",
  };

  const alreadyTeacher = await repo.submitFacultyRequest(
    { id: "t1", name: "Prof", role: "teacher" },
    validInput,
    ["ada.lovelace@gmail.com"],
  );
  assert.equal(alreadyTeacher.ok, false);
  assert.equal(alreadyTeacher.status, 409);

  // Unverified email is rejected with 403 even if all fields are valid.
  const unverified = await repo.submitFacultyRequest(
    { id: "s1", name: "Applicant", role: "student" },
    validInput,
    ["other@gmail.com"],
  );
  assert.equal(unverified.ok, false);
  assert.equal(unverified.status, 403);

  // Once Clerk verifies the Gmail address via OTP, submission succeeds.
  const first = await repo.submitFacultyRequest(
    { id: "s1", name: "Applicant", role: "student" },
    validInput,
    ["ADA.LOVELACE@GMAIL.COM"],
  );
  assert.equal(first.ok, true);
  assert.equal(first.request.status, "pending");
  assert.equal(first.request.emailVerified, true);
  assert.equal(first.request.fullName, "Prof Ada Lovelace");
  assert.equal(first.request.schoolEmail, "ada.lovelace@gmail.com");

  const dup = await repo.submitFacultyRequest(
    { id: "s1", name: "Applicant", role: "student" },
    validInput,
    ["ada.lovelace@gmail.com"],
  );
  assert.equal(dup.ok, false);
  assert.equal(dup.status, 409);
});

test("POST /api/account/faculty passes only Clerk-verified email addresses to submitFacultyRequest", async () => {
  const received = [];
  const route = loadTs("app/api/account/faculty/route.ts", {
    "next/server": { NextResponse },
    "@clerk/nextjs/server": {
      currentUser: async () => ({
        emailAddresses: [
          { emailAddress: "unverified@lspu.edu.ph", verification: { status: "unverified" } },
          { emailAddress: "verified@lspu.edu.ph", verification: { status: "verified" } },
          { emailAddress: "missing@lspu.edu.ph", verification: null },
        ],
      }),
    },
    "@/lib/accounts/read-json": readJson,
    "@/lib/api/route-handler": { withApiErrors: (_label, fn) => fn() },
    "@/lib/auth/viewer": { getViewer: async () => ({ id: "s1", name: "Applicant", role: "student" }) },
    "@/lib/roles/repository": {
      getFacultyStatus: async () => ({ role: "student", latestRequest: null }),
      submitFacultyRequest: async (_viewer, _body, verifiedEmails) => {
        received.push(verifiedEmails);
        return { ok: true, request: { id: "r1", status: "pending" } };
      },
    },
  });

  const req = new Request("http://localhost/api/account/faculty", { method: "POST", body: JSON.stringify({}) });
  const res = await route.POST(req);
  assert.equal(res.status, 201);
  assert.deepEqual(received, [["verified@lspu.edu.ph"]]);
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
    class_activities: [],
    notifications: [],
    problems: [],
    submissions: [
      { id: "sub-1", user_id: "student-1", problem_id: "hello-world", verdict: "ACCEPTED", points: 100 },
    ],
  };

  const problemRules = await import("../lib/classes/problem-rules.ts");
  const workspaceDefaults = await import("../lib/workspace-defaults.ts");
  const lockedIds = new Set(["secret-tournament-prob"]);
  const baseSummaries = catalog.getProblemSummaries();
  const listAllSummaries = () => [
    ...baseSummaries,
    ...tables.problems.map((p) => ({
      id: p.id,
      slug: p.id,
      title: p.title,
      difficulty: p.difficulty,
      category: p.category,
      tags: p.tags,
      supportedLanguages: p.supported_languages,
      sampleCount: p.test_cases.filter((t) => !t.isHidden).length,
      totalTestsCount: p.test_cases.length,
    })),
  ];

  const notifRepo = loadTs("lib/notifications/repository.ts", {
    "server-only": {},
    "@/lib/accounts/rules": accountRules,
    "@/lib/db/client": { db: fakeDb(tables), exactCount, fetchAllPages, isMissingRelationError, must },
    "@/lib/problems/store": {
      listProblemSummaries: async () => listAllSummaries(),
    },
  });

  const repo = loadTs("lib/classes/repository.ts", {
    "server-only": {},
    "@/lib/accounts/rules": accountRules,
    "@/lib/db/client": { db: fakeDb(tables), exactCount, fetchAllPages, isMissingRelationError, must },
    "@/lib/notifications/repository": notifRepo,
    "@/lib/workspace-defaults": workspaceDefaults,
    "@/lib/problems/store": {
      listProblemSummaries: async (_userId, opts) => {
        const all = listAllSummaries();
        return opts?.includeLocked ? all : all.filter((p) => !lockedIds.has(p.id));
      },
      problemExists: async (id, opts) => {
        if (!opts?.includeLocked && lockedIds.has(id)) return false;
        return listAllSummaries().some((p) => p.id === id) || lockedIds.has(id);
      },
    },
    "@/lib/roles/rules": roleRules,
    "./problem-rules": problemRules,
    "./rules": classRules,
  });

  const studentViewer = { id: "student-1", name: "Grace", role: "student" };
  const teacherViewer = { id: "teacher-1", name: "Prof Ada", role: "teacher" };
  const outsiderViewer = { id: "outsider-1", name: "Outsider", role: "student" };

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

  // Locked tournament problems cannot be assigned to a class.
  const lockedAdd = await repo.performClassAction(teacherViewer, created.id, { action: "addProblem", problemId: "secret-tournament-prob" });
  assert.equal(lockedAdd.ok, false);
  assert.equal(lockedAdd.status, 404);

  // Teacher creates a student group, assigns student to it, and assigns hello-world problem.
  assert.equal((await repo.performClassAction(teacherViewer, created.id, { action: "createGroup", name: "Group A" })).ok, true);
  const groupId = tables.class_groups[0].id;
  assert.equal((await repo.performClassAction(teacherViewer, created.id, { action: "assignMemberGroup", userId: "student-1", groupId })).ok, true);
  assert.equal((await repo.performClassAction(teacherViewer, created.id, { action: "addProblem", problemId: "hello-world" })).ok, true);

  // Students cannot mutate teacher settings; outsiders cannot view class details.
  const forbidden = await repo.performClassAction(studentViewer, created.id, { action: "createGroup", name: "Hack" });
  assert.equal(forbidden.ok, false);
  assert.equal(forbidden.status, 403);
  assert.equal(await repo.getClassDetail(outsiderViewer, created.id), null);

  // Demoted teacher loses teacher capabilities, inviteCode, and student schoolEmail access.
  const demotedTeacher = { id: "teacher-1", name: "Prof Ada", role: "student" };
  const demotedMutate = await repo.performClassAction(demotedTeacher, created.id, { action: "createGroup", name: "Revoked" });
  assert.equal(demotedMutate.ok, false);
  assert.equal(demotedMutate.status, 403);
  assert.equal(await repo.getClassDetail(demotedTeacher, created.id), null);
  assert.deepEqual(Array.from((await repo.listClassesForViewer(demotedTeacher)).teaching), []);

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

  // Teacher creates a custom class problem with a deadline -> inserts into problems, assigns it, records activity, and notifies student.
  const dueSoon = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  const badCustom = await repo.performClassAction(teacherViewer, created.id, {
    action: "createProblem",
    title: "Even Sum",
    description: "Sum all even integers in the input list.",
    difficulty: "beginner",
    category: "Arrays",
    inputSpec: "N then N ints",
    outputSpec: "Single integer",
    testCases: [{ input: "2\n2 4", expectedOutput: "6", isHidden: true }],
  });
  assert.equal(badCustom.ok, false);
  assert.equal(badCustom.status, 422);

  const customCreated = await repo.performClassAction(teacherViewer, created.id, {
    action: "createProblem",
    title: "Even Sum",
    description: "Sum all even integers in the input list.",
    difficulty: "beginner",
    category: "Arrays",
    inputSpec: "N then N ints",
    outputSpec: "Single integer",
    dueAt: dueSoon,
    testCases: [
      { input: "2\n2 4", expectedOutput: "6", isHidden: false },
      { input: "3\n1 3 5", expectedOutput: "0", isHidden: true },
    ],
  });
  assert.equal(customCreated.ok, true);
  assert.match(customCreated.problemId, /^cls-even-sum-/);
  assert.equal(tables.problems.length, 1);

  // Teacher posts a class deadline activity -> notifies enrolled students.
  const postedAct = await repo.performClassAction(teacherViewer, created.id, {
    action: "postActivity",
    title: "Lab 1 Submission",
    kind: "deadline",
    body: "Finish Even Sum before tonight.",
    dueAt: dueSoon,
  });
  assert.equal(postedAct.ok, true);

  // Student receives notifications and can mark all read.
  const inbox = await notifRepo.listNotificationsForViewer(studentViewer);
  assert.ok(inbox.unreadCount >= 2);
  assert.equal(inbox.role, "student");
  assert.ok(inbox.notifications.some((n) => n.title.includes("Even Sum")));
  assert.ok(inbox.notifications.some((n) => n.title.includes("Lab 1 Submission")));

  assert.equal((await notifRepo.handleNotificationAction(studentViewer, { action: "markAllRead" })).ok, true);
  const afterRead = await notifRepo.listNotificationsForViewer(studentViewer);
  // Stored notifications are read; synthetic unsolved urgent deadline remains surfaced until solved.
  assert.ok(afterRead.notifications.some((n) => n.read === true));
  assert.ok(afterRead.notifications.some((n) => n.synthetic === true && n.title.includes("Even Sum")));

  // Pagination: >1,000 submissions still register a solve on page 2.
  for (let i = 0; i < 1050; i++) {
    tables.submissions.push({ id: `filler-${i}`, user_id: "student-1", problem_id: "hello-world", verdict: "ACCEPTED", points: 100 });
  }
  tables.submissions.push({ id: "sub-late", user_id: "student-1", problem_id: "sum-two-integers", verdict: "ACCEPTED", points: 100 });
  assert.equal((await repo.performClassAction(teacherViewer, created.id, { action: "addProblem", problemId: "sum-two-integers" })).ok, true);
  const paginatedDetail = await repo.getClassDetail(teacherViewer, created.id);
  assert.deepEqual(Array.from(paginatedDetail.members[0].solvedProblemIds).sort(), ["hello-world", "sum-two-integers"]);
});

test("/app views use skeleton loading instead of the Exeku BrandLoader splash", () => {
  for (const rel of [
    "../components/app/app-shell.tsx",
    "../components/app/command-station.tsx",
    "../components/app/modern-overview.tsx",
    "../app/app/workspace/page.tsx",
    "../components/app/workspace/results-pane.tsx",
  ]) {
    const src = readFileSync(new URL(rel, import.meta.url), "utf8");
    assert.doesNotMatch(src, /BrandLoader/, `${rel} should not use BrandLoader`);
  }
});

test("learn repository validates chapterId, merges partial DB chapters safely over built-in lessons, and tracks progress", async () => {
  const curriculum = await import("../lib/learn/curriculum.ts");
  const workspaceDefaults = await import("../lib/workspace-defaults.ts");
  const tables = {
    learn_chapters: [
      {
        id: "printing-arrays",
        order_index: 6,
        number: "06",
        title: "Custom DB Printing an Array",
        short_title: "Printing Arrays",
        category: "Data Structures",
        difficulty: "intermediate",
        tags: ["arrays"],
        summary: "Updated DB summary",
        // Partial lessons object missing java/cpp/c — must fall back cleanly to built-in lessons for missing languages
        lessons: {
          python: curriculum.findLearnChapterById("printing-arrays").lessons.python,
        },
      },
    ],
    learn_progress: [],
  };

  const learnRepo = loadTs("lib/learn/repository.ts", {
    "server-only": {},
    "@/lib/accounts/rules": accountRules,
    "@/lib/db/client": { db: fakeDb(tables), isMissingRelationError },
    "@/lib/learn/curriculum": curriculum,
    "@/lib/workspace-defaults": workspaceDefaults,
  });

  const viewer = { id: "student-1", name: "Grace", role: "student" };

  // Malformed chapterId with colon or uppercase is rejected (400).
  const badId = await learnRepo.recordLearnCompletion(viewer, {
    chapterId: "printing:arrays",
    language: "python",
  });
  assert.equal(badId.ok, false);
  assert.equal(badId.status, 400);

  // Unknown chapterId not in built-in or DB is rejected (404).
  const unknownId = await learnRepo.recordLearnCompletion(viewer, {
    chapterId: "non-existent-topic",
    language: "python",
  });
  assert.equal(unknownId.ok, false);
  assert.equal(unknownId.status, 404);

  // Valid completion succeeds and records progress.
  const ok = await learnRepo.recordLearnCompletion(viewer, {
    chapterId: "printing-arrays",
    language: "python",
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.key, "python:printing-arrays");

  const payload = await learnRepo.listLearnForViewer(viewer);
  assert.equal(payload.chapters.length, 8);
  const merged = payload.chapters.find((c) => c.id === "printing-arrays");
  assert.equal(merged.title, "Custom DB Printing an Array");
  assert.ok(merged.lessons.python.headline.length > 0);
  assert.ok(merged.lessons.java.headline.length > 0);
  assert.ok(merged.lessons.cpp.headline.length > 0);
  assert.ok(merged.lessons.c.headline.length > 0);
  assert.deepEqual(Array.from(payload.completedKeys), ["python:printing-arrays"]);

  // Real DB FK error mentioning learn_progress must return 500, NOT ok: true.
  const failingLearnRepo = loadTs("lib/learn/repository.ts", {
    "server-only": {},
    "@/lib/accounts/rules": accountRules,
    "@/lib/db/client": {
      isMissingRelationError,
      db: () => ({
        from: () => ({
          upsert: async () => ({
            error: {
              code: "23503",
              message: 'insert or update on table "learn_progress" violates foreign key constraint',
            },
          }),
        }),
      }),
    },
    "@/lib/learn/curriculum": curriculum,
    "@/lib/workspace-defaults": workspaceDefaults,
  });
  const fkRes = await failingLearnRepo.recordLearnCompletion(viewer, {
    chapterId: curriculum.LEARN_CHAPTERS[0].id,
    language: "python",
  });
  assert.equal(fkRes.ok, false);
  assert.equal(fkRes.status, 500);

  // Genuine missing-table error (42P01) still degrades gracefully.
  const unmigratedLearnRepo = loadTs("lib/learn/repository.ts", {
    "server-only": {},
    "@/lib/accounts/rules": accountRules,
    "@/lib/db/client": {
      isMissingRelationError,
      db: () => ({
        from: () => ({
          upsert: async () => ({
            error: {
              code: "42P01",
              message: 'relation "public.learn_progress" does not exist',
            },
          }),
        }),
      }),
    },
    "@/lib/learn/curriculum": curriculum,
    "@/lib/workspace-defaults": workspaceDefaults,
  });
  const missingTableRes = await unmigratedLearnRepo.recordLearnCompletion(viewer, {
    chapterId: curriculum.LEARN_CHAPTERS[0].id,
    language: "python",
  });
  assert.equal(missingTableRes.ok, true);
});

