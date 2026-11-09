import { ClerkProvider } from "@clerk/nextjs";

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider signInUrl="/setup" signUpUrl="/setup">{children}</ClerkProvider>;
}
