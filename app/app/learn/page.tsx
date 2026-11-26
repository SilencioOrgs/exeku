import { Suspense } from "react";
import type { Metadata } from "next";
import { LearnView } from "@/components/app/learn/learn-view";
import { PageSkeleton } from "@/components/app/page-skeletons";
import { ALL_SUPPORTED_LANGUAGES } from "@/lib/workspace-defaults";
import type { PreferredLanguage } from "@/types/profile";

export const metadata: Metadata = {
  title: "Learn — Exeku",
  description: "Interactive tutorials for Python 3, Java, C++, and C syntax, arrays, loops, and functions.",
};

async function LearnContent({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string; lang?: string }>;
}) {
  const params = await searchParams;
  const lang =
    params.lang && ALL_SUPPORTED_LANGUAGES.includes(params.lang as PreferredLanguage)
      ? (params.lang as PreferredLanguage)
      : null;
  return <LearnView initialChapterId={params.chapter ?? null} initialLang={lang} />;
}

export default function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string; lang?: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LearnContent searchParams={searchParams} />
    </Suspense>
  );
}
