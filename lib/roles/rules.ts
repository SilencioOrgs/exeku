import type { FieldErrors } from "@/types/account";
import type { UserRole } from "@/types/roles";

export interface CheckedFacultyRequest {
  fullName: string;
  schoolEmail: string;
  schoolName: string;
  department: string;
  positionTitle: string;
  employeeId: string;
  note?: string;
}

type Checked<T> = ({ ok: true } & T) | { ok: false; fieldErrors: FieldErrors };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (source: Record<string, unknown>, key: string) =>
  typeof source[key] === "string" ? source[key].trim() : "";

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export const canCreateClasses = (role: UserRole) => role === "teacher" || role === "admin";

export function checkFacultyRequest(input: unknown): Checked<{ request: CheckedFacultyRequest }> {
  if (!isObject(input)) {
    return { ok: false, fieldErrors: { fullName: "Enter your complete name." } };
  }
  const errors: FieldErrors = {};
  const fullName = text(input, "fullName");
  const schoolEmail = text(input, "schoolEmail").toLowerCase();
  const schoolName = text(input, "schoolName");
  const department = text(input, "department");
  const positionTitle = text(input, "positionTitle");
  const employeeId = text(input, "employeeId");
  const note = text(input, "note");

  if (fullName.length < 3 || fullName.length > 120 || !/\s+/.test(fullName)) {
    errors.fullName = "Enter your complete name (first and last name).";
  }
  const domain = schoolEmail.split("@")[1] ?? "";
  if (schoolEmail.length > 254 || !EMAIL_RE.test(schoolEmail) || domain !== "gmail.com") {
    errors.schoolEmail = "Enter a valid Gmail address (like yourname@gmail.com).";
  }
  if (schoolName.length < 3 || schoolName.length > 120) {
    errors.schoolName = "Enter your school's full name (3 to 120 characters).";
  }
  if (department.length < 2 || department.length > 100) {
    errors.department = "Enter your college or department (2 to 100 characters).";
  }
  if (positionTitle.length < 2 || positionTitle.length > 80) {
    errors.positionTitle = "Enter your faculty title, like Instructor or Professor.";
  }
  if (employeeId.length < 2 || employeeId.length > 48) {
    errors.employeeId = "Enter your faculty or employee ID (2 to 48 characters).";
  }
  if (note.length > 300) {
    errors.note = "Keep your note under 300 characters.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    request: {
      fullName,
      schoolEmail,
      schoolName,
      department,
      positionTitle,
      employeeId,
      note: note || undefined,
    },
  };
}
