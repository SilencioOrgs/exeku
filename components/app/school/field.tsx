import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

function FieldShell({ id, label, error, hint, children }: FieldShellProps) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-xs text-[var(--color-text-muted)]">{label}</label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-[var(--color-pink)]">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-[var(--color-text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

type TextFieldProps = ComponentProps<"input"> & { id: string; label: string; error?: string; hint?: string };

export function TextField({ id, label, error, hint, ...props }: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <Input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} className="skeuo-well h-10" {...props} />
    </FieldShell>
  );
}

type TextAreaFieldProps = ComponentProps<"textarea"> & { id: string; label: string; error?: string; hint?: string };

export function TextAreaField({ id, label, error, hint, ...props }: TextAreaFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <textarea id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} className="skeuo-well w-full rounded-lg border border-input px-2.5 py-2 text-base md:text-sm" {...props} />
    </FieldShell>
  );
}

type SelectFieldProps = ComponentProps<"select"> & { id: string; label: string; error?: string };

export function SelectField({ id, label, error, children, ...props }: SelectFieldProps) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <div className="relative">
        <select id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error)}
          className="skeuo-well h-10 w-full appearance-none truncate rounded-lg border border-input pr-8 pl-2.5 text-base md:text-sm" {...props}>
          {children}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
      </div>
    </FieldShell>
  );
}
