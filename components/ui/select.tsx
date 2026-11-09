"use client";

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cn } from "@/lib/utils";

type OptionProps = { value?: string | number; disabled?: boolean; children?: ReactNode };

export interface SelectProps {
  id?: string;
  value?: string | number | readonly string[];
  onChange: (value: string) => void;
  /** Plain <option> elements, so call sites read like a native select. */
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
  "aria-describedby"?: string;
}

const optionText = (children: ReactNode) => Children.toArray(children).join("");

export function Select({ id, value, onChange, children, disabled, className, ...aria }: SelectProps) {
  const options = Children.toArray(children)
    .filter((child): child is ReactElement<OptionProps> => isValidElement(child))
    .map(({ props }) => ({ value: String(props.value ?? ""), label: optionText(props.children), disabled: props.disabled }));

  return (
    <SelectPrimitive.Root items={options} value={String(value ?? "")} onValueChange={(next) => onChange(String(next))} disabled={disabled}>
      <SelectPrimitive.Trigger id={id} {...aria} className={cn("select-trigger skeuo-well flex h-10 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-input px-2.5 text-sm", className)}>
        <SelectPrimitive.Value className="truncate" />
        <SelectPrimitive.Icon className="shrink-0 text-[var(--color-text-muted)]"><ChevronDown size={14} /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-[60] outline-none">
          <SelectPrimitive.Popup className="select-popup skeuo-panel max-h-[min(20rem,var(--available-height))] min-w-[var(--anchor-width)] overflow-y-auto rounded-xl p-1.5 outline-none">
            <SelectPrimitive.List>
              {options.map((option) => (
                <SelectPrimitive.Item key={option.value} value={option.value} disabled={option.disabled} className="select-item flex min-h-9 cursor-default items-center justify-between gap-3 rounded-lg px-2.5 text-sm outline-none">
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="text-[var(--color-primary-text)]"><Check size={14} /></SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
