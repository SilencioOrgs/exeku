export interface ClerkEmailResource {
  id: string;
  emailAddress: string;
  verification?: { status?: string | null } | null;
  prepareVerification(params: { strategy: "email_code" }): Promise<unknown>;
  attemptVerification(params: { code: string }): Promise<{ verification?: { status?: string | null } | null }>;
}

export interface ClerkEmailUser {
  emailAddresses: ClerkEmailResource[];
  createEmailAddress(params: { email: string }): Promise<ClerkEmailResource>;
  reload(): Promise<ClerkEmailUser>;
}

export function clerkErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "errors" in err && Array.isArray((err as { errors: unknown[] }).errors)) {
    const first = (err as { errors: Array<{ longMessage?: string; message?: string }> }).errors[0];
    if (first?.longMessage) return first.longMessage;
    if (first?.message) return first.message;
  }
  return err instanceof Error ? err.message : fallback;
}

const normalize = (email: string) => email.trim().toLowerCase();

function findEmail(user: ClerkEmailUser, email: string, id?: string | null): ClerkEmailResource | undefined {
  const normalized = normalize(email);
  return (
    (id ? user.emailAddresses.find((entry) => entry.id === id) : undefined) ??
    user.emailAddresses.find((entry) => entry.emailAddress.toLowerCase() === normalized)
  );
}

export function isClerkEmailVerified(user: Pick<ClerkEmailUser, "emailAddresses"> | null | undefined, email: string): boolean {
  if (!user || !email) return false;
  const normalized = normalize(email);
  return user.emailAddresses.some(
    (entry) => entry.emailAddress.toLowerCase() === normalized && entry.verification?.status === "verified",
  );
}

/**
 * Prepares Clerk email_code verification for an email on the signed-in user.
 * Reuses an existing verified or unverified email on the same account instead of
 * re-creating it (which Clerk rejects with a duplicate-email error).
 */
export async function prepareClerkEmailOtp(
  user: ClerkEmailUser,
  email: string,
): Promise<{ status: "already_verified" | "otp_sent"; emailId: string }> {
  const normalized = normalize(email);
  const freshUser = (await user.reload().catch(() => user)) ?? user;
  let resource = findEmail(freshUser, normalized);

  if (resource?.verification?.status === "verified") {
    return { status: "already_verified", emailId: resource.id };
  }
  if (!resource) {
    resource = await freshUser.createEmailAddress({ email: normalized });
  }
  await resource.prepareVerification({ strategy: "email_code" });
  return { status: "otp_sent", emailId: resource.id };
}

export async function verifyClerkEmailOtp(
  user: ClerkEmailUser,
  pendingEmailId: string | null,
  email: string,
  otpCode: string,
): Promise<{ ok: true } | { ok: false; error: string; expired?: boolean }> {
  const freshUser = (await user.reload().catch(() => user)) ?? user;
  const resource = findEmail(freshUser, email, pendingEmailId);
  if (!resource) {
    return { ok: false, error: "Verification session expired. Request a new code.", expired: true };
  }
  if (resource.verification?.status === "verified") {
    return { ok: true };
  }
  const code = otpCode.trim();
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit verification code from your school email." };
  }
  const verified = await resource.attemptVerification({ code });
  if (verified.verification?.status !== "verified") {
    return { ok: false, error: "Code could not be verified. Check the code and try again." };
  }
  await freshUser.reload();
  return { ok: true };
}

export async function resendClerkEmailOtp(
  user: ClerkEmailUser,
  pendingEmailId: string | null,
  email: string,
): Promise<{ ok: true; alreadyVerified?: boolean } | { ok: false; expired: true }> {
  const freshUser = (await user.reload().catch(() => user)) ?? user;
  const resource = findEmail(freshUser, email, pendingEmailId);
  if (!resource) return { ok: false, expired: true };
  if (resource.verification?.status === "verified") return { ok: true, alreadyVerified: true };
  await resource.prepareVerification({ strategy: "email_code" });
  return { ok: true };
}
