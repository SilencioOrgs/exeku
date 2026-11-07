import type { Metadata } from "next";
// Fonts ship inside the app bundle, so Exeku builds and runs with no internet.
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { appearanceBootstrap } from "@/lib/appearance-bootstrap";
import { AppearanceProvider } from "@/hooks/use-appearance";

export const metadata: Metadata = {
  title: "Exeku — Your Code. Your Machine.",
  description:
    "Online programming practice, assessment, and competition platform inspired by CodeChum (Developer Preview). Master Python 3, Java, C++, and C with isolated sandbox execution and deterministic automated judging.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased dark scroll-smooth`}
    >
      <head>
        <script
          id="exeku-theme-anti-flash"
          dangerouslySetInnerHTML={{ __html: appearanceBootstrap }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-[var(--color-primary)] selection:text-[var(--color-primary-foreground)]">
        <AppearanceProvider>{children}</AppearanceProvider>
      </body>
    </html>
  );
}
