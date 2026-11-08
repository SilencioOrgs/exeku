import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PostDate } from "@/components/app/competition/post-date";
import { SampleNote } from "@/components/app/competition/sample-note";
import { getWinnerPost, isSampleData } from "@/lib/competition/repository";

const PLACE_LABELS = ["1st place", "2nd place", "3rd place"];

export const metadata: Metadata = { title: "Blog — Exeku" };

type Params = Promise<{ slug: string }>;

async function BlogPost({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getWinnerPost(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Link href="/app/blog" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">
        <ArrowLeft size={14} />All posts
      </Link>
      <header className="space-y-1">
        <PostDate value={post.publishedOn} />
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{post.title}</h1>
        {isSampleData && <SampleNote />}
      </header>
      {post.placements.length > 0 && (
        <ol className="grid gap-3 sm:grid-cols-3">
          {post.placements.map((winner) => (
            <li key={winner.place} className="profile-panel p-4">
              <p className="text-xs font-medium text-[var(--color-primary-text)]">{PLACE_LABELS[winner.place - 1]}</p>
              <p className="mt-1 text-lg font-semibold">{winner.name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{winner.campusName}</p>
            </li>
          ))}
        </ol>
      )}
      <div className="max-w-prose space-y-3 text-[var(--color-text-main)]">
        {post.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </article>
  );
}

export default function BlogPostPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-sm text-[var(--color-text-muted)]">Loading post…</p>}>
      <BlogPost params={params} />
    </Suspense>
  );
}
