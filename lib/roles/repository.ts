import "server-only";
import type { Viewer } from "@/lib/auth/viewer";
import { db, must } from "@/lib/db/client";
import type { FieldErrors } from "@/types/account";
import type { FacultyRequestStatus, FacultyRequestView, FacultyStatusPayload } from "@/types/roles";
import { checkFacultyRequest } from "./rules";

interface FacultyRow {
  id: string;
  school_name: string;
  department: string;
  position_title: string;
  employee_id: string;
  note: string | null;
  status: FacultyRequestStatus;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const toView = (row: FacultyRow): FacultyRequestView => ({
  id: row.id,
  schoolName: row.school_name,
  department: row.department,
  positionTitle: row.position_title,
  employeeId: row.employee_id,
  note: row.note ?? undefined,
  status: row.status,
  reviewNote: row.review_note ?? undefined,
  createdAt: row.created_at,
  reviewedAt: row.reviewed_at ?? undefined,
});

export async function getFacultyStatus(viewer: Viewer): Promise<FacultyStatusPayload> {
  const rows = must(
    await db()
      .from("faculty_requests")
      .select("id,school_name,department,position_title,employee_id,note,status,review_note,created_at,reviewed_at")
      .eq("user_id", viewer.id)
      .order("created_at", { ascending: false })
      .limit(1),
  ) as FacultyRow[];
  return {
    role: viewer.role,
    request: rows[0] ? toView(rows[0]) : null,
  };
}

export type FacultySubmitResult =
  | { ok: true; request: FacultyRequestView }
  | { ok: false; status: number; error?: string; fieldErrors?: FieldErrors };

export async function submitFacultyRequest(viewer: Viewer, input: unknown): Promise<FacultySubmitResult> {
  if (viewer.role === "teacher" || viewer.role === "admin") {
    return { ok: false, status: 409, error: "Your account already has faculty permissions." };
  }
  const checked = checkFacultyRequest(input);
  if (!checked.ok) return { ok: false, status: 422, fieldErrors: checked.fieldErrors };

  const existing = must(
    await db()
      .from("faculty_requests")
      .select("id")
      .eq("user_id", viewer.id)
      .eq("status", "pending")
      .maybeSingle(),
  ) as { id: string } | null;
  if (existing) {
    return { ok: false, status: 409, error: "You already have a faculty verification request waiting for admin review." };
  }

  const req = checked.request;
  const { data, error } = await db()
    .from("faculty_requests")
    .insert({
      user_id: viewer.id,
      school_name: req.schoolName,
      department: req.department,
      position_title: req.positionTitle,
      employee_id: req.employeeId,
      note: req.note ?? null,
    })
    .select("id,school_name,department,position_title,employee_id,note,status,review_note,created_at,reviewed_at")
    .single();

  if (error?.code === "23505") {
    return { ok: false, status: 409, error: "You already have a faculty verification request waiting for admin review." };
  }
  if (error || !data) throw new Error(`Database error: ${error?.message ?? "Could not save request."}`);
  return { ok: true, request: toView(data as FacultyRow) };
}
