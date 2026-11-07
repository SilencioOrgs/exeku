"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent, type SyntheticEvent } from "react";
import { useAppearance } from "@/hooks/use-appearance";
import { resolveEditorAppearance } from "@/lib/editor-appearance";
import { tokenLines } from "@/lib/syntax";
import { cn } from "@/lib/utils";

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

function languageOf(filename: string) {
  const ext = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase();
  return ext === "py" ? "python" : ext === "java" ? "java" : ext === "c" ? "c" : "cpp";
}

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Shown to screen readers, e.g. "main.py". Also picks the highlighting language. */
  filename: string;
}

/**
 * Plain-text code editor with VS Code-style colors: a transparent native textarea on top of
 * a highlighted copy of the same text. Ctrl/Cmd+Enter bubbles to the workspace (run/submit).
 */
export function CodeEditor({ value, onChange, filename }: CodeEditorProps) {
  const { preferences, effectiveColorMode } = useAppearance();
  const { mode, style } = resolveEditorAppearance(preferences, effectiveColorMode);
  const gutterRef = useRef<HTMLPreElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const escapedRef = useRef(false);
  const [activeLine, setActiveLine] = useState(0);
  const hintId = useId();
  const lines = useMemo(() => tokenLines(value, languageOf(filename)), [value, filename]);

  // execCommand keeps the browser's own undo stack; setRangeText is the fallback.
  const insert = (area: HTMLTextAreaElement, text: string, start: number, end: number) => {
    area.setSelectionRange(start, end);
    if (!document.execCommand("insertText", false, text)) {
      area.setRangeText(text, start, end, "end");
      onChange(area.value);
    }
  };

  const trackCaret = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    const area = event.currentTarget;
    setActiveLine(area.value.slice(0, area.selectionStart).split("\n").length - 1);
  };

  const syncScroll = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = event.currentTarget;
    if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
    if (highlightRef.current) { highlightRef.current.scrollTop = scrollTop; highlightRef.current.scrollLeft = scrollLeft; }
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
      className="code-editor flex h-full min-h-[320px] overflow-hidden focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-[var(--color-ring)]"
      style={style}
    >
      <pre
        ref={gutterRef}
        aria-hidden="true"
        className="code-editor-gutter m-0 shrink-0 select-none overflow-hidden py-3 pl-3 pr-3 text-right"
        style={{ font: "inherit", minWidth: `${String(lines.length).length + 3}ch` }}
      >
        {lines.map((_, i) => <div key={i} className={i === activeLine ? "is-active" : undefined}>{i + 1}</div>)}
        <div className="h-12" />
      </pre>
      <div className="relative min-w-0 flex-1">
        <pre
          ref={highlightRef}
          aria-hidden="true"
          className="code-editor-highlight pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre py-3"
          style={{ font: "inherit", tabSize: 4 }}
        >
          <div className="min-w-full w-max pb-12">
            {lines.map((tokens, i) => (
              <div key={i} className={cn("px-3", i === activeLine && "is-active")}>
                {tokens.length ? tokens.map((t, j) => t.type === "plain" ? t.text : <span key={j} className={`tok-${t.type}`}>{t.text}</span>) : "​"}
              </div>
            ))}
          </div>
        </pre>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onSelect={trackCaret}
          onScroll={syncScroll}
          aria-label={`${filename} source code`}
          aria-describedby={hintId}
          wrap="off"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="code-editor-input relative m-0 block h-full w-full resize-none whitespace-pre border-0 bg-transparent px-3 py-3 outline-none focus-visible:outline-none"
          style={{ font: "inherit", tabSize: 4 }}
        />
      </div>
      <span id={hintId} className="sr-only">
        Tab indents. Press Escape then Tab to leave the editor. Control or Command plus Enter runs the code.
      </span>
    </div>
  );
}
