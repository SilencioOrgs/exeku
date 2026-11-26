import type { FieldErrors, NewSchoolRequest, SchoolOption, StudentAccount } from "@/types/account";
import { computeAgeFromBirthday, MAX_ACCOUNT_AGE, MIN_ACCOUNT_AGE } from "./birthday";

export interface SchoolRecord extends SchoolOption {
  locationId: string;
  locationName: string;
  emailDomains: string[];
}

export interface SchoolLookup {
  findSchool(id: string): Promise<SchoolRecord | null>;
  findSchoolByDomain(domain: string): Promise<SchoolRecord | null>;
}

type Checked<K extends string, T> = ({ ok: true } & Record<K, T>) | { ok: false; fieldErrors: FieldErrors };

const EMAIL = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const ACADEMIC_DOMAIN = /^([a-z0-9-]+\.)+(edu(\.[a-z]{2})?|ac\.[a-z]{2})$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string) => UUID_RE.test(value);
export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
export const text = (source: Record<string, unknown>, key: string) =>
  typeof source[key] === "string" ? source[key].trim() : "";
export const domainMatches = (domain: string, allowed: string) =>
  domain === allowed || domain.endsWith(`.${allowed}`);

export async function checkNewSchool(input: unknown, lookup: SchoolLookup): Promise<Checked<"school", NewSchoolRequest>> {
  if (!isObject(input)) return { ok: false, fieldErrors: { name: "Enter your school's name." } };
  const errors: FieldErrors = {};
  const name = text(input, "name");
  const location = text(input, "location");
  const campus = text(input, "campus");
  const emailDomain = text(input, "emailDomain").toLowerCase().replace(/^@/, "");

  if (name.length < 3 || name.length > 120) errors.name = "Enter your school's full name.";
  if (location.length < 2 || location.length > 80) errors.location = "Enter the city or province of your school.";
  if (campus.length > 80) errors.campus = "Keep the campus name under 80 characters.";
  if (emailDomain.length > 120 || !ACADEMIC_DOMAIN.test(emailDomain)) {
    errors.emailDomain = "Enter a school domain, like school.edu.ph.";
  } else {
    const listed = await lookup.findSchoolByDomain(emailDomain);
    if (listed) errors.emailDomain = `${listed.shortName} is already listed. Pick it from the school list.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  return { ok: true, school: { name, location, campus: campus || undefined, emailDomain } };
}

export async function checkSchoolAccount(input: unknown, lookup: SchoolLookup): Promise<Checked<"account", StudentAccount>> {
  if (!isObject(input)) return { ok: false, fieldErrors: { email: "Enter your school email address." } };
  const errors: FieldErrors = {};

  const birthdayText = text(input, "birthday");
  const hasBirthdayInput = "birthday" in input;
  let age = Number.NaN;
  let birthday: string | undefined;

  if (hasBirthdayInput) {
    const computed = computeAgeFromBirthday(birthdayText);
    if (computed === null) {
      errors.birthday = "Enter your birthday.";
    } else if (computed < MIN_ACCOUNT_AGE || computed > MAX_ACCOUNT_AGE) {
      errors.birthday = `You must be between ${MIN_ACCOUNT_AGE} and ${MAX_ACCOUNT_AGE} years old.`;
    } else {
      age = computed;
      birthday = birthdayText;
    }
  } else {
    const ageText = text(input, "age");
    age = /^\d{1,3}$/.test(ageText) ? Number(ageText) : Number.NaN;
    if (!(age >= MIN_ACCOUNT_AGE && age <= MAX_ACCOUNT_AGE)) errors.age = "Enter an age from 13 to 100.";
  }

  const email = text(input, "email").toLowerCase();
  const validEmail = email.length <= 254 && EMAIL.test(email);
  if (!validEmail) errors.email = "Enter your school email address.";
  const emailDomain = email.split("@")[1] ?? "";

  const selection = isObject(input.school) ? input.school : {};
  let school: StudentAccount["school"] | null = null;

  if (selection.kind === "new") {
    const checked = await checkNewSchool(selection, lookup);
    if (!checked.ok) {
      errors.school = Object.values(checked.fieldErrors)[0];
    } else {
      const added = checked.school;
      school = { name: added.name, shortName: added.name, location: added.location, campus: added.campus, status: "pending_review" };
      if (validEmail && !domainMatches(emailDomain, added.emailDomain)) {
        errors.email = `Use your school email, ending in @${added.emailDomain}.`;
      }
    }
  } else {
    const record = await lookup.findSchool(text(selection, "schoolId"));
    if (!record) {
      errors.school = "Choose your school.";
    } else {
      const campus = record.campuses.find((c) => c.id === text(selection, "campusId"));
      if (!campus) errors.campus = "Choose your campus.";
      else school = { id: record.id, campusId: campus.id, name: record.name, shortName: record.shortName, location: record.locationName, campus: campus.name, status: "listed" };
      const program = record.programs.find((p) => p.id === text(selection, "programId"));
      if (record.programs.length > 0 && !program) errors.program = "Choose your program.";
      else if (school && program) school = { ...school, programId: program.id, program: program.name };
      if (validEmail && !record.emailDomains.some((d) => domainMatches(emailDomain, d))) {
        errors.email = `Use your ${record.shortName} email, ending in @${record.emailDomains[0]}.`;
      }
    }
  }

  if (Object.keys(errors).length > 0 || !school) return { ok: false, fieldErrors: errors };
  return { ok: true, account: { email, age, ...(birthday ? { birthday } : {}), school } };
}
