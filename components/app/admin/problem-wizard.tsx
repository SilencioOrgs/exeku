"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createProblem } from "@/lib/admin/api";
import { checkNewProblem } from "@/lib/problems/rules";
import { ALL_SUPPORTED_LANGUAGES, LANGUAGE_DISPLAY_NAMES } from "@/lib/workspace-defaults";
import type { FieldErrors } from "@/types/account";
import type { PreferredLanguage } from "@/types/profile";
import { difficultyLabel } from "../difficulty-badge";
import { SelectField, TextAreaField, TextField } from "../school/field";
import { WizardSteps } from "./wizard-steps";

type TestDraft = { key: number; input: string; expectedOutput: string; isHidden: boolean };

const STEPS = [
  { title: "Basics", hint: "Name the problem and choose which languages students can use.", fields: ["title", "difficulty", "category", "supportedLanguages"] },
  { title: "Statement", hint: "This is what students read. Say what the program must do, what it reads, and what it prints.", fields: ["description", "inputSpec", "outputSpec"] },
  { title: "Tests", hint: "Each test is an input and the exact output a correct program prints. You need at least one of each kind.", fields: ["testCases"] },
  { title: "Review", hint: "Set the limits and check everything before you create it.", fields: ["timeLimitMs", "memoryMb"] },
];

const EMPTY = { title: "", description: "", difficulty: "beginner", category: "", inputSpec: "", outputSpec: "", constraints: "", timeLimitMs: "2000", memoryMb: "128" };
const firstTests = (): TestDraft[] => [{ key: 1, input: "", expectedOutput: "", isHidden: false }, { key: 2, input: "", expectedOutput: "", isHidden: true }];

export function ReviewRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[9rem_1fr]">
      <dt className="text-xs text-[var(--color-text-muted)]">{label}</dt>
      <dd className="min-w-0 text-sm break-words whitespace-pre-wrap">{children}</dd>
    </div>
  );
}

export function ProblemWizard({ onCreated, onCancel }: { onCreated: (title: string) => void; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [languages, setLanguages] = useState<PreferredLanguage[]>(ALL_SUPPORTED_LANGUAGES);
  const [tests, setTests] = useState(firstTests);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // Keyboard and screen reader users land on the new step's heading.
  useEffect(() => {
    if (moved.current) heading.current?.focus();
    moved.current = true;
  }, [step]);

  const field = (key: keyof typeof EMPTY) => ({
    value: form[key],
    error: errors[key],
    onChange: (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value })),
  });
  const updateTest = (key: number, patch: Partial<TestDraft>) => { setErrors({}); setTests((all) => all.map((t) => (t.key === key ? { ...t, ...patch } : t))); };
  const addTest = () => setTests((all) => [...all, { key: Math.max(0, ...all.map((t) => t.key)) + 1, input: "", expectedOutput: "", isHidden: true }]);
  const payload = () => ({ ...form, supportedLanguages: languages, testCases: tests.map(({ input, expectedOutput, isHidden }) => ({ input, expectedOutput, isHidden })) });

  const problemsIn = (index: number, all: FieldErrors) => Object.fromEntries(Object.entries(all).filter(([key]) => STEPS[index].fields.includes(key)));
  const allErrors = (): FieldErrors => { const checked = checkNewProblem(payload()); return checked.ok ? {} : checked.fieldErrors; };

  /** Shows only the errors of the first step that has any. */
  const showFirstProblem = (all: FieldErrors) => {
    const index = STEPS.findIndex((_, i) => Object.keys(problemsIn(i, all)).length > 0);
    if (index < 0) return false;
    setErrors(problemsIn(index, all));
    setStep(index);
    return true;
  };

  const next = () => {
    const here = problemsIn(step, allErrors());
    setErrors(here);
    if (Object.keys(here).length === 0) setStep(step + 1);
  };

  const create = async () => {
    setFormError(undefined);
    if (showFirstProblem(allErrors())) return;
    setBusy(true);
    const result = await createProblem(payload());
    setBusy(false);
    if (result.ok) { onCreated(form.title.trim()); return; }
    if (!(result.fieldErrors && showFirstProblem(result.fieldErrors))) setFormError(result.error ?? "We couldn't save this problem.");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step < STEPS.length - 1) next();
    else void create();
  };

  const samples = tests.filter((t) => !t.isHidden).length;
  const constraints = form.constraints.split("\n").map((line) => line.trim()).filter(Boolean);

  return (
    <form onSubmit={submit} noValidate className="profile-panel space-y-5 p-5 sm:p-6">
      <WizardSteps titles={STEPS.map((item) => item.title)} step={step} onGo={(index) => { setErrors({}); setStep(index); }} />

      <div className="space-y-1">
        <h3 ref={heading} tabIndex={-1} className="text-lg font-semibold outline-none">Step {step + 1} of {STEPS.length}: {STEPS[step].title}</h3>
        <p className="text-sm text-[var(--color-text-muted)]">{STEPS[step].hint}</p>
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <TextField id="p-title" label="Problem title" placeholder="Sum of two numbers" maxLength={80} {...field("title")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField id="p-difficulty" label="Difficulty" {...field("difficulty")}>
              <option value="beginner">Easy (100 points)</option><option value="intermediate">Medium (200 points)</option><option value="advanced">Hard (300 points)</option>
            </SelectField>
            <TextField id="p-category" label="Category" placeholder="Math, Strings, Arrays" maxLength={40} {...field("category")} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-[var(--color-text-muted)]">Languages students can use</p>
            <div role="group" aria-label="Languages" className="flex flex-wrap gap-2">
              {ALL_SUPPORTED_LANGUAGES.map((language) => (
                <Button key={language} type="button" variant="outline" size="sm" aria-pressed={languages.includes(language)}
                  onClick={() => setLanguages((all) => (all.includes(language) ? all.filter((l) => l !== language) : [...all, language]))}>
                  {LANGUAGE_DISPLAY_NAMES[language]}
                </Button>
              ))}
            </div>
            {errors.supportedLanguages && <p className="text-xs text-[var(--color-pink)]">{errors.supportedLanguages}</p>}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <TextAreaField id="p-description" label="What should the program do?" rows={5} maxLength={5000} placeholder="Read two integers and print their sum." {...field("description")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextAreaField id="p-input" label="What does it read?" rows={3} maxLength={2000} placeholder="One line with two integers a and b." {...field("inputSpec")} />
            <TextAreaField id="p-output" label="What does it print?" rows={3} maxLength={2000} placeholder="One integer, the sum of a and b." {...field("outputSpec")} />
          </div>
          <TextAreaField id="p-constraints" label="Constraints (optional)" hint="One per line." rows={3} placeholder="-1000 <= a, b <= 1000" {...field("constraints")} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <dl className="skeuo-recess grid gap-3 rounded-xl p-3 text-xs sm:grid-cols-2">
            <div><dt className="font-semibold">Sample</dt><dd className="text-[var(--color-text-muted)]">Students can see it, so use it to show the format.</dd></div>
            <div><dt className="font-semibold">Hidden</dt><dd className="text-[var(--color-text-muted)]">Only the judge sees it. Use it to catch wrong solutions.</dd></div>
          </dl>
          {tests.map((test, index) => (
            <fieldset key={test.key} className="skeuo-recess space-y-3 rounded-xl p-3">
              <legend className="sr-only">Test {index + 1}</legend>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Test {index + 1}</p>
                <div className="flex items-center gap-1">
                  <div role="group" aria-label={`Who can see test ${index + 1}`} className="flex gap-1">
                    <Button type="button" variant="outline" size="sm" aria-pressed={!test.isHidden} onClick={() => updateTest(test.key, { isHidden: false })}>Sample</Button>
                    <Button type="button" variant="outline" size="sm" aria-pressed={test.isHidden} onClick={() => updateTest(test.key, { isHidden: true })}>Hidden</Button>
                  </div>
                  {tests.length > 1 && <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove test ${index + 1}`} onClick={() => setTests((all) => all.filter((t) => t.key !== test.key))}><Trash2 size={14} aria-hidden="true" /></Button>}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextAreaField id={`t-${test.key}-in`} label="Input" rows={3} className="font-code" placeholder="2 3" value={test.input} onChange={(e) => updateTest(test.key, { input: e.target.value })} />
                <TextAreaField id={`t-${test.key}-out`} label="Expected output" rows={3} className="font-code" placeholder="5" value={test.expectedOutput} onChange={(e) => updateTest(test.key, { expectedOutput: e.target.value })} />
              </div>
            </fieldset>
          ))}
          {errors.testCases && <p role="alert" className="text-sm text-[var(--color-pink)]">{errors.testCases}</p>}
          <Button type="button" variant="outline" size="sm" onClick={addTest}><Plus size={14} aria-hidden="true" />Add another test</Button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="p-time" label="Time limit (milliseconds)" hint="1000 to 5000. 2000 suits most problems." type="number" min={1000} max={5000} {...field("timeLimitMs")} />
            <TextField id="p-memory" label="Memory limit (MB)" hint="64 to 256. 128 suits most problems." type="number" min={64} max={256} {...field("memoryMb")} />
          </div>
          <dl className="skeuo-recess divide-y divide-[var(--color-border-subtle)] rounded-xl px-4 py-1">
            <ReviewRow label="Title">{form.title}</ReviewRow>
            <ReviewRow label="Difficulty">{difficultyLabel(form.difficulty)}</ReviewRow>
            <ReviewRow label="Category">{form.category}</ReviewRow>
            <ReviewRow label="Languages">{languages.map((l) => LANGUAGE_DISPLAY_NAMES[l]).join(", ")}</ReviewRow>
            <ReviewRow label="Description">{form.description}</ReviewRow>
            <ReviewRow label="Input">{form.inputSpec}</ReviewRow>
            <ReviewRow label="Output">{form.outputSpec}</ReviewRow>
            {constraints.length > 0 && <ReviewRow label="Constraints">{constraints.join("\n")}</ReviewRow>}
            <ReviewRow label="Tests">{samples} sample, {tests.length - samples} hidden</ReviewRow>
          </dl>
        </div>
      )}

      {formError && <p role="alert" className="text-sm text-[var(--color-pink)]">{formError}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <div className="flex gap-2">
          {step > 0 && <Button type="button" variant="outline" className="h-10 px-4" onClick={() => { setErrors({}); setStep(step - 1); }}><ArrowLeft size={15} aria-hidden="true" />Back</Button>}
          {step < STEPS.length - 1
            ? <Button type="submit" className="h-10 px-4">Next<ArrowRight size={15} aria-hidden="true" /></Button>
            : <Button type="submit" className="h-10 px-4" disabled={busy}>{busy ? "Creating…" : "Create problem"}</Button>}
        </div>
      </div>
    </form>
  );
}
