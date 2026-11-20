import { randomBytes } from "node:crypto";
import { isObject, text } from "@/lib/accounts/rules";
import type { FieldErrors } from "@/types/account";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string {
  const bytes = randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `EXK-${out}`;
}

export function normalizeInviteCode(raw: string): string {
  const clean = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (/^[A-Z0-9]{6}$/.test(clean)) return `EXK-${clean}`;
  return clean;
}

type Checked<T> = ({ ok: true } & T) | { ok: false; fieldErrors: FieldErrors };

export function checkNewClass(input: unknown): Checked<{ name: string; section?: string; description?: string }> {
  if (!isObject(input)) return { ok: false, fieldErrors: { name: "Enter a class name." } };
  const errors: FieldErrors = {};
  const name = text(input, "name");
  const section = text(input, "section");
  const description = text(input, "description");

  if (name.length < 2 || name.length > 100) {
    errors.name = "Enter a class name (2 to 100 characters).";
  }
  if (section.length > 48) {
    errors.section = "Keep the section under 48 characters.";
  }
  if (description.length > 300) {
    errors.description = "Keep the description under 300 characters.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    name,
    section: section || undefined,
    description: description || undefined,
  };
}

export function checkGroupName(input: unknown): Checked<{ name: string }> {
  if (!isObject(input)) return { ok: false, fieldErrors: { name: "Enter a group name." } };
  const name = text(input, "name");
  if (name.length < 2 || name.length > 60) {
    return { ok: false, fieldErrors: { name: "Enter a group name (2 to 60 characters)." } };
  }
  return { ok: true, name };
}

export function checkInviteCode(input: unknown): Checked<{ inviteCode: string }> {
  const raw = isObject(input) ? text(input, "inviteCode") : "";
  const code = normalizeInviteCode(raw);
  if (!/^EXK-[A-Z0-9]{6}$/.test(code)) {
    return { ok: false, fieldErrors: { inviteCode: "Enter a valid invite code like EXK-7Q4M2K." } };
  }
  return { ok: true, inviteCode: code };
}
