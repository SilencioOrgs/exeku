import { ClerkProvider } from "@clerk/nextjs";

const CLERK_APPEARANCE = {
  options: {
    logoImageUrl: "/brand/exeku-logo.png",
    logoLinkUrl: "/",
    logoPlacement: "inside" as const,
  },
};

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider signInUrl="/setup" signUpUrl="/setup" appearance={CLERK_APPEARANCE}>
      {children}
    </ClerkProvider>
  );
}
