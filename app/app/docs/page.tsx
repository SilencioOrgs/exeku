import { Suspense } from "react";
import { LanguageDocsView } from "@/components/app/learn/language-docs-view";
import { PageSkeleton } from "@/components/app/page-skeletons";
import { ALL_SUPPORTED_LANGUAGES } from "@/lib/workspace-defaults";
import type { PreferredLanguage } from "@/types/profile";

async function DocsContent({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; lang?: string }>;
}) {
  const params = await searchParams;
  const initialLang =
    params.lang && ALL_SUPPORTED_LANGUAGES.includes(params.lang as PreferredLanguage)
      ? (params.lang as PreferredLanguage)
      : null;

  return <LanguageDocsView initialTopicId={params.topic ?? null} initialLang={initialLang} />;
}

export default function DocsPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; lang?: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DocsContent searchParams={searchParams} />
    </Suspense>
  );
}
