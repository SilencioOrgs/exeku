import type { Metadata } from "next";
import { Geist, Geist_Mono, Pixelify_Sans } from "next/font/google";
import "./globals.css";
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

const antiFlashScript = `
(function() {
  try {
    var raw = localStorage.getItem('exeku_appearance_settings');
    var p = raw ? JSON.parse(raw) : null;
    var style = (p && p.uiStyle) || 'pixel-arcade';
    var mode = (p && p.colorMode) || 'dark';
    var contrast = (p && p.contrastMode) || 'standard';
    var uiFont = (p && p.uiFontFamily) || 'geist-sans';
    var editorFont = (p && p.editorFontFamily) || 'geist-mono';
    var lineHeight = (p && p.lineHeight) || 'normal';
    var reducedMotion = (p && p.reducedMotion) ? 'true' : 'false';
    var fontScale = (p && p.uiFontScale) || 100;
    var brightness = (p && p.brightness) || 100;

    var isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var effectiveMode = isDark ? 'dark' : 'light';

    var doc = document.documentElement;
    doc.dataset.uiStyle = style;
    doc.dataset.colorMode = effectiveMode;
    doc.dataset.contrast = contrast;
    doc.dataset.uiFont = uiFont;
    doc.dataset.editorFont = editorFont;
    doc.dataset.lineHeight = lineHeight;
    doc.dataset.reducedMotion = reducedMotion;

    if (isDark) {
      doc.classList.add('dark');
    } else {
      doc.classList.remove('dark');
    }

    doc.style.setProperty('--ui-font-scale', fontScale + '%');
    doc.style.setProperty('--app-brightness', brightness + '%');
  } catch(e) {}
})();
`;

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
          dangerouslySetInnerHTML={{ __html: antiFlashScript }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-[var(--color-primary)] selection:text-white">
        <AppearanceProvider>{children}</AppearanceProvider>
      </body>
    </html>
  );
}
