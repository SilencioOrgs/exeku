"use client";

import { useState, type FormEvent } from "react";
import { Code2, Eye, EyeOff, Loader2, Plus, Trash2 } from "lucide-react";
import { TextAreaField, TextField } from "@/components/app/school/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { postClassAction } from "@/lib/classes/api";
import type { FieldErrors } from "@/types/account";
import type { ProblemDifficulty } from "@/types/problem";

interface DraftCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  explanation: string;
}

const INITIAL_CASES: DraftCase[] = [
  { input: "", expectedOutput: "", isHidden: false, explanation: "" },
  { input: "", expectedOutput: "", isHidden: true, explanation: "" },
];

export function CreateProblemDialog({
  classId,
  open,
  onOpenChange,
  onCreated,
}: {
  classId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (title: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<ProblemDifficulty>("beginner");
  const [category, setCategory] = useState("Class Exercise");
  const [tags, setTags] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [description, setDescription] = useState("");
  const [inputSpec, setInputSpec] = useState("");
  const [outputSpec, setOutputSpec] = useState("");
  const [constraints, setConstraints] = useState("");
  const [testCases, setTestCases] = useState<DraftCase[]>(INITIAL_CASES);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string>();

  const reset = () => {
    setTitle("");
    setDifficulty("beginner");
    setCategory("Class Exercise");
    setTags("");
    setDueAt("");
    setDescription("");
    setInputSpec("");
    setOutputSpec("");
    setConstraints("");
    setTestCases(INITIAL_CASES);
    setFieldErrors({});
    setError(undefined);
  };

  const updateCase = (index: number, patch: Partial<DraftCase>) => {
    setTestCases((prev) => prev.map((tc, i) => (i === index ? { ...tc, ...patch } : tc)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFieldErrors({});
    setError(undefined);
    try {
      const parsedDue = dueAt && !Number.isNaN(Date.parse(dueAt)) ? new Date(dueAt).toISOString() : undefined;
      if (dueAt && !parsedDue) {
        setFieldErrors({ dueAt: "Enter a valid deadline date and time." });
        return;
      }
      const res = await postClassAction(classId, {
        action: "createProblem",
        title,
        difficulty,
        category,
        tags,
        dueAt: parsedDue,
        description,
        inputSpec,
        outputSpec,
        constraints,
        testCases,
      });
      if (!res.ok) {
        setFieldErrors(res.fieldErrors ?? {});
        setError(res.error);
        return;
      }
      const createdTitle = title.trim();
      reset();
      onOpenChange(false);
      onCreated(createdTitle);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 size={18} className="text-[var(--color-primary-text)]" aria-hidden="true" />
              Create custom class problem
            </DialogTitle>
            <DialogDescription>
              Author your own coding problem with sample and hidden judge test cases. Enrolled students are notified automatically.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p role="alert" className="skeuo-recess rounded-xl p-3 text-xs text-[var(--color-pink)]">
              {error}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              id="custom-problem-title"
              label="Problem title"
              placeholder="Sum of Even Elements"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={fieldErrors.title}
              disabled={submitting}
              required
            />
            <div className="space-y-1.5">
              <label htmlFor="custom-problem-difficulty" className="block text-sm font-medium">
                Difficulty
              </label>
              <Select
                id="custom-problem-difficulty"
                value={difficulty}
                onChange={(v) => setDifficulty(v as ProblemDifficulty)}
                disabled={submitting}
              >
                <option value="beginner">Easy</option>
                <option value="intermediate">Medium</option>
                <option value="advanced">Hard</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <TextField
              id="custom-problem-category"
              label="Topic / category"
              placeholder="Arrays & Loops"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              error={fieldErrors.category}
              disabled={submitting}
              required
            />
            <TextField
              id="custom-problem-tags"
              label="Tags (comma-separated)"
              placeholder="loops, arrays"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={submitting}
            />
            <TextField
              id="custom-problem-due"
              label="Deadline (optional)"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              error={fieldErrors.dueAt}
              disabled={submitting}
            />
          </div>

          <TextAreaField
            id="custom-problem-description"
            label="Problem statement"
            placeholder="Given an integer N followed by N integers, print the sum of all even numbers."
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={fieldErrors.description}
            disabled={submitting}
            required
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <TextAreaField
              id="custom-problem-input"
              label="Input format"
              placeholder="First line contains N. Second line contains N space-separated integers."
              rows={2}
              value={inputSpec}
              onChange={(e) => setInputSpec(e.target.value)}
              error={fieldErrors.inputSpec}
              disabled={submitting}
              required
            />
            <TextAreaField
              id="custom-problem-output"
              label="Output format"
              placeholder="Print a single integer: the sum of even numbers."
              rows={2}
              value={outputSpec}
              onChange={(e) => setOutputSpec(e.target.value)}
              error={fieldErrors.outputSpec}
              disabled={submitting}
              required
            />
          </div>

          <TextAreaField
            id="custom-problem-constraints"
            label="Constraints (one per line, optional)"
            placeholder={`1 <= N <= 10^5\n-10^6 <= A[i] <= 10^6`}
            rows={2}
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            disabled={submitting}
          />

          {/* Test Cases Builder */}
          <div className="space-y-2.5 border-t border-[var(--color-border)] pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Test cases ({testCases.length})</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Keep at least one sample case visible; hidden cases stay server-side for judging.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting || testCases.length >= 20}
                onClick={() =>
                  setTestCases((prev) => [
                    ...prev,
                    { input: "", expectedOutput: "", isHidden: true, explanation: "" },
                  ])
                }
              >
                <Plus size={13} aria-hidden="true" /> Add test case
              </Button>
            </div>

            {fieldErrors.testCases && (
              <p role="alert" className="text-xs text-[var(--color-pink)]">
                {fieldErrors.testCases}
              </p>
            )}

            <div className="space-y-2.5">
              {testCases.map((tc, idx) => (
                <div key={idx} className="skeuo-well space-y-2.5 rounded-xl border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-code text-xs font-medium text-[var(--color-text-main)]">
                      Case #{idx + 1} · {tc.isHidden ? "Hidden judge test" : "Visible sample"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={submitting}
                        aria-pressed={tc.isHidden}
                        onClick={() => updateCase(idx, { isHidden: !tc.isHidden })}
                        className="h-7 px-2 text-xs"
                      >
                        {tc.isHidden ? <EyeOff size={12} aria-hidden="true" /> : <Eye size={12} aria-hidden="true" />}
                        {tc.isHidden ? "Hidden" : "Visible"}
                      </Button>
                      {testCases.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={submitting}
                          aria-label={`Remove test case ${idx + 1}`}
                          onClick={() => setTestCases((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <TextAreaField
                      id={`tc-in-${idx}`}
                      label="Standard input (stdin)"
                      placeholder={"4\n1 2 3 4"}
                      rows={2}
                      value={tc.input}
                      onChange={(e) => updateCase(idx, { input: e.target.value })}
                      className="font-code text-xs"
                      disabled={submitting}
                    />
                    <TextAreaField
                      id={`tc-out-${idx}`}
                      label="Expected output"
                      placeholder="6"
                      rows={2}
                      value={tc.expectedOutput}
                      onChange={(e) => updateCase(idx, { expectedOutput: e.target.value })}
                      className="font-code text-xs"
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  Creating problem…
                </>
              ) : (
                <>
                  <Plus size={14} aria-hidden="true" />
                  Create &amp; assign problem
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
