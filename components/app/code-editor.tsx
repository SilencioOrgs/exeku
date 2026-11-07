"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { useAppearance } from "@/hooks/use-appearance";
import { resolveEditorAppearance } from "@/lib/editor-appearance";

const INDENT = "    ";

/** Indent (or outdent) every line of a block by one level. */
export function shiftLines(block: string, outdent: boolean): string {
  return block.split("\n").map((line) => outdent ? line.replace(/^( {1,4}|\t)/, "") : INDENT + line).join("\n");
}

/** Text to insert for Enter: keep the line's indent, one level deeper after an opener. */
export function newlineFor(lineBeforeCaret: string): string {
  const indent = lineBeforeCaret.match(/^[ \t]*/)?.[0] ?? "";
  return "\n" + indent + (/[:{([]\s*$/.test(lineBeforeCaret) ? INDENT : "");
}

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Shown to screen readers, e.g. "main.py". */
  filename: string;
}

/**
 * Plain-text code editor: a native textarea with a line-number gutter.
 * Ctrl/Cmd+Enter bubbles to the workspace, which runs or submits.
 */
export function CodeEditor({ value, onChange, filename }: CodeEditorProps) {
  const { preferences, effectiveColorMode } = useAppearance();
  const { mode, style } = resolveEditorAppearance(preferences, effectiveColorMode);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLPreElement>(null);
  const escapedRef = useRef(false);
  const hintId = useId();
  const lineCount = value.split("\n").length;

  // execCommand keeps the browser's own undo stack; setRangeText is the fallback.
  const insert = (area: HTMLTextAreaElement, text: string, start: number, end: number) => {
    area.setSelectionRange(start, end);
    if (!document.execCommand("insertText", false, text)) {
      area.setRangeText(text, start, end, "end");
      onChange(area.value);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const area = event.currentTarget;
    const { selectionStart: start, selectionEnd: end, value: text } = area;
    const plain = !event.ctrlKey && !event.metaKey && !event.altKey;

    if (event.key === "Escape") { escapedRef.current = true; return; }
    const escaped = escapedRef.current;
    escapedRef.current = false;

    if (event.key === "Tab" && plain && !escaped) {
      event.preventDefault();
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      if (!event.shiftKey && start === end) { insert(area, INDENT, start, end); return; }
      // Indent or outdent every selected line.
      const next = shiftLines(text.slice(lineStart, end), event.shiftKey);
      insert(area, next, lineStart, end);
      area.setSelectionRange(lineStart, lineStart + next.length);
      return;
    }

    if (event.key === "Enter" && plain && !event.shiftKey) {
      event.preventDefault();
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      insert(area, newlineFor(text.slice(lineStart, start)), start, end);
    }
  };

  return (
    <div
      data-theme-scope={mode}
      className="code-editor flex h-full min-h-[320px] overflow-hidden bg-[var(--color-surface)] text-[var(--color-text-main)] focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-[var(--color-ring)]"
      style={style}
    >
      <pre
        ref={gutterRef}
        aria-hidden="true"
        className="m-0 shrink-0 select-none overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-canvas)] py-3 pl-3 pr-2 text-right text-[var(--color-text-dim)]"
        style={{ font: "inherit", minWidth: `${String(lineCount).length + 3}ch` }}
      >
        {Array.from({ length: lineCount }, (_, i) => i + 1).join("\n")}
      </pre>
      <textarea
        ref={areaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={(event) => { if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop; }}
        aria-label={`${filename} source code`}
        aria-describedby={hintId}
        wrap="off"
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        className="m-0 min-h-0 min-w-0 flex-1 resize-none whitespace-pre border-0 bg-transparent px-3 py-3 outline-none focus-visible:outline-none"
        style={{ font: "inherit", tabSize: 4 }}
      />
      <span id={hintId} className="sr-only">
        Tab indents. Press Escape then Tab to leave the editor. Control or Command plus Enter runs the code.
      </span>
    </div>
  );
}
