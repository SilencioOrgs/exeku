import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PostDate } from "@/components/app/competition/post-date";
import { SampleNote } from "@/components/app/competition/sample-note";
import { getWinnerPosts, isSampleData } from "@/lib/competition/repository";

export const metadata: Metadata = {
  title: "Blog — Exeku",
  description: "Competition results and winners.",
};

async function PostList() {
  await connection();
  const posts = await getWinnerPosts();
  if (posts.length === 0) return <p className="profile-panel p-6 text-sm text-[var(--color-text-muted)]">No posts yet.</p>;
  return (
    <ul className="space-y-3">
      {posts.map((post) => (
        <li key={post.slug}>
          <Link href={`/app/blog/${post.slug}`} className="profile-panel block space-y-1 p-5 transition-colors hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]">
            <PostDate value={post.publishedOn} />
            <h2 className="text-lg font-semibold">{post.title}</h2>
            <p className="text-sm text-[var(--color-text-muted)]">{post.excerpt}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function BlogPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Blog</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Competition results and winners.</p>
        {isSampleData && <SampleNote />}
      </header>
      <Suspense fallback={<p role="status" className="text-sm text-[var(--color-text-muted)]">Loading posts…</p>}>
        <PostList />
      </Suspense>
    </div>
  );
}
