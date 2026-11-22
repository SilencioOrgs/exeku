import type { Metadata } from "next";
import { LearnView } from "@/components/app/learn/learn-view";
import type { PreferredLanguage } from "@/types/profile";

export const metadata: Metadata = {
  title: "Learn — Exeku",
  description: "Interactive W3Schools-style tutorials for Python 3, Java, C++, and C syntax, arrays, loops, and functions.",
};

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string; lang?: string }>;
}) {
  const params = await searchParams;
  const lang = (params.lang as PreferredLanguage | undefined) ?? null;
  return <LearnView initialChapterId={params.chapter ?? null} initialLang={lang} />;
}
