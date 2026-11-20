import { isObject, text } from "@/lib/accounts/rules";
import type { FieldErrors } from "@/types/account";
import type { UserRole } from "@/types/roles";

export interface CheckedFacultyRequest {
  schoolName: string;
  department: string;
  positionTitle: string;
  employeeId: string;
  note?: string;
}

type Checked<T> = ({ ok: true } & T) | { ok: false; fieldErrors: FieldErrors };

export const canCreateClasses = (role: UserRole) => role === "teacher" || role === "admin";

export function checkFacultyRequest(input: unknown): Checked<{ request: CheckedFacultyRequest }> {
  if (!isObject(input)) {
    return { ok: false, fieldErrors: { schoolName: "Enter your school name." } };
  }
  const errors: FieldErrors = {};
  const schoolName = text(input, "schoolName");
  const department = text(input, "department");
  const positionTitle = text(input, "positionTitle");
  const employeeId = text(input, "employeeId");
  const note = text(input, "note");

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
      schoolName,
      department,
      positionTitle,
      employeeId,
      note: note || undefined,
    },
  };
}
