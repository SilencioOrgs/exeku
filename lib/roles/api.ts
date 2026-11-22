import { call } from "@/lib/accounts/api";
import type { FacultyRequestView, FacultyStatusPayload } from "@/types/roles";

export const fetchFacultyStatus = () => call<FacultyStatusPayload>("/api/account/faculty");

export const submitFacultyVerification = (input: {
  fullName: string;
  schoolEmail: string;
  schoolName: string;
  department: string;
  positionTitle: string;
  employeeId: string;
  note?: string;
}) => call<{ ok: true; request: FacultyRequestView }>("/api/account/faculty", input);
