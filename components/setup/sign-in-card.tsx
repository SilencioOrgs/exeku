"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn, useUser } from "@clerk/nextjs";
import { BrandWordmark } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { toDisplayName } from "@/lib/profile-validation";
import { profileRepository } from "@/lib/storage/profile-repository";

/** Google's required multicolor mark. Brand colors, so these stay outside the design tokens. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.4-4.6 7l7.2 5.6c4.2-3.9 7.1-9.7 7.1-17z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C1 16.5 0 20.1 0 24s1 7.5 2.6 10.8l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8L32.7 36.6c-2 1.4-4.6 2.2-8.7 2.2-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function SignInCard() {
  const router = useRouter();
  const { signIn } = useSignIn();
  const { isLoaded, isSignedIn, user } = useUser();
  const { resumeSession } = useProfile();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const accountId = isSignedIn ? user.id : null;
  const accountName = isSignedIn ? toDisplayName(user.fullName || user.primaryEmailAddress?.emailAddress.split("@")[0]) : "";

  // Back from Google: use this account's profile on this browser, then enter the app.
  useEffect(() => {
    if (!accountId) return;
    profileRepository.claimProfile(accountId, accountName)
      .then(() => { resumeSession(); router.push("/app"); })
      .catch(() => setNotice("We couldn't save your profile on this browser. Try again."));
  }, [accountId, accountName, resumeSession, router]);

  const signInWithGoogle = async () => {
    setBusy(true);
    setNotice(undefined);
    const { error } = await signIn.sso({ strategy: "oauth_google", redirectCallbackUrl: "/setup/sso-callback", redirectUrl: "/setup" });
    if (error) {
      setBusy(false);
      setNotice("We couldn't start Google sign-in. Try again.");
    }
  };

  return (
    <main className="setup-stage grid min-h-svh place-items-center p-4 text-[var(--color-text-main)]">
      <section className="skeuo-panel w-full max-w-sm p-7 text-center sm:p-8">
        <Link href="/" className="inline-flex">
          <BrandWordmark height={60} />
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Welcome to Exeku</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Sign in to start practicing.</p>

        <Button
          variant="outline"
          size="lg"
          className="mt-6 h-11 w-full gap-2.5 text-sm"
          disabled={!isLoaded}
          loading={busy || Boolean(accountId)}
          loadingText="Signing you in…"
          onClick={signInWithGoogle}
        >
          <GoogleMark /> Continue with Google
        </Button>

        {notice && <p role="alert" className="skeuo-recess mt-4 rounded-xl p-3 text-sm">{notice}</p>}
      </section>
    </main>
  );
}
