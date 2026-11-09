"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProblem } from "@/lib/admin/api";
import type { ManagedProblemView, PickableProblem } from "@/types/admin";
import { DifficultyBadge } from "../difficulty-badge";
import { ConfirmDialog } from "../workspace/submission-modals";
import { ProblemWizard } from "./problem-wizard";

const HEAD = "px-4 py-3 font-medium";

export function ProblemsPanel({ problems, created, onChange, onError }: { problems: PickableProblem[]; created: ManagedProblemView[]; onChange: () => void; onError: (message: string) => void }) {
  const [creating, setCreating] = useState(false);
  const [saved, setSaved] = useState<string>();
  const [deleting, setDeleting] = useState<ManagedProblemView | null>(null);
  const createdById = new Map(created.map((p) => [p.id, p]));

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await deleteProblem(deleting.id);
    setDeleting(null);
    if (result.ok) onChange();
    else onError(result.error ?? "We couldn't delete that problem.");
  };

  if (creating) {
    return (
      <section aria-labelledby="new-problem-heading" className="space-y-3">
        <h2 id="new-problem-heading" className="text-lg font-semibold">New problem</h2>
        <ProblemWizard onCancel={() => setCreating(false)} onCreated={(title) => { setCreating(false); setSaved(`${title} was added to Challenges.`); onChange(); }} />
      </section>
    );
  }

  return (
    <section aria-labelledby="problems-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="problems-heading" className="text-lg font-semibold">Problems</h2>
        <Button className="h-10 px-4" onClick={() => { setSaved(undefined); setCreating(true); }}><Plus size={15} aria-hidden="true" />New problem</Button>
      </div>
      {saved && <p role="status" className="text-sm text-[var(--color-primary-text)]">{saved}</p>}
      {problems.length === 0 ? <p className="profile-panel p-5 text-sm text-[var(--color-text-muted)]">No problems yet.</p> : (
        <div className="profile-panel overflow-x-auto">
          <table className="w-full min-w-[38rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
                <th scope="col" className={HEAD}>Title</th>
                <th scope="col" className={HEAD}>Difficulty</th>
                <th scope="col" className={HEAD}>Category</th>
                <th scope="col" className={HEAD}>Tests</th>
                <th scope="col" className={HEAD}>Source</th>
                <th scope="col" aria-label="Actions" className={HEAD} />
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => {
                const mine = createdById.get(problem.id);
                return (
                  <tr key={problem.id} className="border-b border-[var(--color-border-subtle)] last:border-0">
                    <td className="px-4 py-3 font-medium">{problem.title}</td>
                    <td className="px-4 py-3"><DifficultyBadge difficulty={problem.difficulty} /></td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{problem.category}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{mine ? `${mine.sampleCount} sample, ${mine.hiddenCount} hidden` : problem.totalTests}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{mine ? "Created here" : "Built in"}</td>
                    <td className="px-4 py-3 text-right">
                      {mine && <Button variant="ghost" size="icon-sm" aria-label={`Delete ${problem.title}`} title="Delete" onClick={() => setDeleting(mine)}><Trash2 size={14} aria-hidden="true" /></Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null); }} title={`Delete ${deleting?.title ?? "this problem"}?`} description="Students can no longer open it. Saved submissions stay." confirmLabel="Delete" onConfirm={() => void confirmDelete()} />
    </section>
  );
}
