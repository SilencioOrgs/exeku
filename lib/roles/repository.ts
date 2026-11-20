import "server-only";
import type { Viewer } from "@/lib/auth/viewer";
import { db, must } from "@/lib/db/client";
import type { FieldErrors } from "@/types/account";
import type { FacultyRequestStatus, FacultyRequestView, FacultyStatusPayload } from "@/types/roles";
import { checkFacultyRequest } from "./rules";

interface FacultyRow {
  id: string;
  full_name: string;
  school_email: string;
  email_verified: boolean;
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

const SELECT_COLS =
  "id,full_name,school_email,email_verified,school_name,department,position_title,employee_id,note,status,review_note,created_at,reviewed_at";

const toView = (row: FacultyRow): FacultyRequestView => ({
  id: row.id,
  fullName: row.full_name,
  schoolEmail: row.school_email,
  emailVerified: Boolean(row.email_verified),
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
      .select(SELECT_COLS)
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

/**
 * Saves a faculty verification request only after the server confirms the submitted
 * schoolEmail is verified on the user's Clerk account via email OTP.
 */
export async function submitFacultyRequest(
  viewer: Viewer,
  input: unknown,
  verifiedClerkEmails: string[],
): Promise<FacultySubmitResult> {
  if (viewer.role === "teacher" || viewer.role === "admin") {
    return { ok: false, status: 409, error: "Your account already has faculty permissions." };
  }
  const checked = checkFacultyRequest(input);
  if (!checked.ok) return { ok: false, status: 422, fieldErrors: checked.fieldErrors };

  const req = checked.request;
  const normalizedVerified = new Set(verifiedClerkEmails.map((e) => e.trim().toLowerCase()));
  if (!normalizedVerified.has(req.schoolEmail)) {
    return {
      ok: false,
      status: 403,
      error: "Verify your school email with the OTP code sent by Clerk before submitting.",
      fieldErrors: { schoolEmail: "This school email has not been verified with Clerk yet." },
    };
  }

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

  const { data, error } = await db()
    .from("faculty_requests")
    .insert({
      user_id: viewer.id,
      full_name: req.fullName,
      school_email: req.schoolEmail,
      email_verified: true,
      school_name: req.schoolName,
      department: req.department,
      position_title: req.positionTitle,
      employee_id: req.employeeId,
      note: req.note ?? null,
    })
    .select(SELECT_COLS)
    .single();

  if (error?.code === "23505") {
    return { ok: false, status: 409, error: "You already have a faculty verification request waiting for admin review." };
  }
  if (error || !data) throw new Error(`Database error: ${error?.message ?? "Could not save request."}`);
  return { ok: true, request: toView(data as FacultyRow) };
}
