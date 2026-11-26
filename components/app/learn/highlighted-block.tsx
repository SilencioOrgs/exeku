"use client";

import { tokenize } from "@/lib/syntax";
import type { PreferredLanguage } from "@/types/profile";

export function HighlightedBlock({ code, language }: { code: string; language: PreferredLanguage }) {
  return (
    <pre className="code-editor font-code overflow-x-auto rounded-xl border border-[var(--color-border)] p-3.5 text-xs leading-6">
      {tokenize(code, language).map((t, i) =>
        t.type === "plain" ? t.text : <span key={i} className={`tok-${t.type}`}>{t.text}</span>,
      )}
    </pre>
  );
}
