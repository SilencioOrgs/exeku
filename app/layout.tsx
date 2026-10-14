import type { Metadata } from "next";
import { Geist, Geist_Mono, Pixelify_Sans } from "next/font/google";
import "./globals.css";
import { appearanceBootstrap } from "@/lib/appearance-bootstrap";
import { AppearanceProvider } from "@/hooks/use-appearance";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pixelifySans = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "exeku_ — Your Code. Your Machine.",
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${pixelifySans.variable} h-full antialiased dark scroll-smooth`}
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
