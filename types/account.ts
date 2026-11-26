/** JSON contract between the browser and the account routes. Types only, so no school data reaches the client bundle. */
export interface SchoolLocation {
  id: string;
  name: string;
}

export interface Campus {
  id: string;
  name: string;
}

export type Program = Campus;

/** What the browser may see about a school. Email rules stay on the server. */
export interface SchoolOption {
  id: string;
  name: string;
  shortName: string;
  campuses: Campus[];
  programs: Program[];
}

export interface NewSchoolRequest {
  name: string;
  location: string;
  campus?: string;
  emailDomain: string;
}

export type SchoolSelection =
  | { kind: "listed"; schoolId: string; campusId: string; programId?: string }
  | ({ kind: "new" } & NewSchoolRequest);

export interface AccountSchool {
  id?: string;
  campusId?: string;
  name: string;
  shortName: string;
  location: string;
  campus?: string;
  programId?: string;
  program?: string;
  status: "listed" | "pending_review";
}

export interface StudentAccount {
  email: string;
  age: number;
  birthday?: string;
  school: AccountSchool;
  verified?: boolean;
}

export interface SchoolAccountRequest {
  birthday?: string;
  age?: string;
  email: string;
  school: SchoolSelection;
}

export type FieldErrors = Record<string, string>;
