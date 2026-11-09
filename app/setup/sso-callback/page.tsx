"use client";

import { useRouter } from "next/navigation";
import { HandleSSOCallback } from "@clerk/nextjs";

export default function SsoCallbackPage() {
  const router = useRouter();
  const backToSetup = () => router.push("/setup");
  return (
    <main className="setup-stage grid min-h-svh place-items-center p-4 text-sm text-[var(--color-text-muted)]">
      <p role="status">Signing you in…</p>
      <HandleSSOCallback
        navigateToApp={({ decorateUrl }) => {
          // Clerk may return a full URL when it has to pass through its own domain.
          const url = decorateUrl("/setup");
          if (url.startsWith("http")) window.location.href = url;
          else router.push(url);
        }}
        navigateToSignIn={backToSetup}
        navigateToSignUp={backToSetup}
      />
      <div id="clerk-captcha" />
    </main>
  );
}
