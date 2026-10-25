"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useChallengeSession } from "@/hooks/use-challenge-session";
import type { ProblemSummary } from "@/types/problem";

export function ProblemSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const { requestNavigation } = useChallengeSession();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  // Hide an already-open search if some other navigation succeeds.
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setStatus("loading");
    fetch("/api/problems", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Catalog unavailable");
        return response.json() as Promise<{ problems?: ProblemSummary[] }>;
      })
      .then((body) => {
        if (controller.signal.aborted) return;
        setProblems(Array.isArray(body.problems) ? body.problems : []);
        setStatus("ready");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [open]);

  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return problems.slice(0, 8);
    return problems.filter((problem) => [
      problem.title, problem.category, problem.difficulty, ...problem.tags,
    ].some((field) => field.toLocaleLowerCase().includes(needle))).slice(0, 12);
  }, [problems, query]);

  const navigate = (href: string) => {
    // The guard may open a confirmation modal; close this search in either case.
    const allowed = requestNavigation(href);
    setOpen(false);
    if (allowed) router.push(href);
  };

  return <>
    <Button type="button" variant="outline" size="icon" aria-label="Search problems"
      title="Search problems (Ctrl/Cmd+K)" onClick={() => { setQuery(""); setOpen(true); }}
      className="size-9 border-[var(--color-border)] bg-[var(--color-surface)]">
      <Search size={17} aria-hidden="true" />
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[min(34rem,calc(100vw-2rem))] max-w-none rounded-[var(--radius-card)] border border-[var(--color-border)] p-4">
        <DialogTitle>Find a problem</DialogTitle>
        <DialogDescription>Search exercises in the current Exeku catalog.</DialogDescription>
        <Input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)}
          aria-label="Search problems" placeholder="Problem title, topic or difficulty"
          onKeyDown={(event) => { if (event.key === "Enter" && matches[0] && status === "ready") {
            event.preventDefault();
            navigate(`/app/workspace?problem=${encodeURIComponent(matches[0].id)}`);
          }}}
          className="h-10 rounded-[var(--radius-btn)] border-[var(--color-border)]" />
        <div role="status" aria-live="polite" className="min-h-28 max-h-72 overflow-y-auto">
          {status === "loading" && <p className="p-3 text-sm text-[var(--color-text-muted)]">Loading problems…</p>}
          {status === "error" && <p className="p-3 text-sm text-[var(--color-text-muted)]">Problem search is unavailable. You can still browse Practice.</p>}
          {status === "ready" && matches.length === 0 && <p className="p-3 text-sm text-[var(--color-text-muted)]">No matching problems. Try another keyword.</p>}
          {status === "ready" && matches.length > 0 && <ul className="space-y-1">
            {matches.map((problem) => <li key={problem.id}>
              <Link href={`/app/workspace?problem=${encodeURIComponent(problem.id)}`}
                onClick={(event) => { event.preventDefault(); navigate(`/app/workspace?problem=${encodeURIComponent(problem.id)}`); }}
                className="flex min-w-0 items-center justify-between gap-3 rounded-[var(--radius-btn)] px-3 py-2 text-sm hover:bg-[var(--color-elevated)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]">
                <span className="min-w-0"><span className="block truncate font-medium">{problem.title}</span><span className="block truncate text-xs text-[var(--color-text-muted)]">{problem.category}</span></span>
                <span className="shrink-0 text-xs capitalize text-[var(--color-text-muted)]">{problem.difficulty}</span>
              </Link>
            </li>)}
          </ul>}
        </div>
        <div className="border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-text-muted)]">
          Press Enter to open the first match · Esc to close
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
