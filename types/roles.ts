export type UserRole = "student" | "teacher" | "admin";

export type FacultyRequestStatus = "pending" | "approved" | "rejected";

export interface FacultyRequestView {
  id: string;
  schoolName: string;
  department: string;
  positionTitle: string;
  employeeId: string;
  note?: string;
  status: FacultyRequestStatus;
  reviewNote?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface FacultyStatusPayload {
  role: UserRole;
  request: FacultyRequestView | null;
}
