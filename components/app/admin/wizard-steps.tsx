import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Finished steps can be reopened. Later ones stay locked until the current step is valid. */
export function WizardSteps({ titles, step, onGo }: { titles: string[]; step: number; onGo: (index: number) => void }) {
  return (
    <ol aria-label="Steps" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {titles.map((title, index) => (
        <li key={title}>
          <Button type="button" variant="outline" disabled={index > step} aria-current={index === step ? "step" : undefined} aria-pressed={index === step}
            onClick={() => onGo(index)} className="h-10 w-full justify-start gap-2 px-3">
            {index < step ? <Check size={14} aria-hidden="true" className="text-[var(--color-primary-text)]" /> : <span className="font-code text-xs">{index + 1}</span>}
            {title}
          </Button>
        </li>
      ))}
    </ol>
  );
}
