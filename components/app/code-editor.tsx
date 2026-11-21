"use client";

import { useId, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type SyntheticEvent } from "react";
import { useAppearance } from "@/hooks/use-appearance";
import { resolveEditorAppearance } from "@/lib/editor-appearance";
import { tokenLines } from "@/lib/syntax";
import { caretPosition, getCompletions, type Completion, type CompletionState } from "@/lib/completions";
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

const PAD = 12; // matches py-3 / px-3 on the textarea
const POPUP_CH = 28;
/** Inline on purpose: the list has to stay readable over the code even if a stylesheet fails to load. */
const SUGGEST = { bg: "#0a0a0a", border: "#3c3c3c", text: "#d4d4d4", active: "#04395e", match: "#18a3ff", kind: "#9d9d9d" };

interface Suggestions extends CompletionState {
  caret: number;
  index: number;
  top: number;
  /** CSS length: caret column in ch, clamped so the list stays inside the editor. */
  left: string;
  rowHeight: number;
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
  const acceptingRef = useRef(false);
  const [activeLine, setActiveLine] = useState(0);
  const [suggest, setSuggest] = useState<Suggestions | null>(null);
  const hintId = useId();
  const listId = useId();
  const lang = languageOf(filename);
  const lines = useMemo(() => tokenLines(value, lang), [value, lang]);

  /** Open or update the suggestion list for the word before the caret, placed under that word. */
  const refresh = (area: HTMLTextAreaElement) => {
    const caret = area.selectionStart;
    const found = area.selectionStart === area.selectionEnd ? getCompletions(area.value, caret, lang) : null;
    if (!found) { setSuggest(null); return; }
    const rowHeight = parseFloat(getComputedStyle(area).lineHeight) || 20;
    const { line, column } = caretPosition(area.value, found.start);
    const lineTop = PAD + line * rowHeight - area.scrollTop;
    const height = found.items.length * rowHeight + 10;
    // Below the line when it fits, otherwise above it.
    const top = lineTop + rowHeight + height <= area.clientHeight ? lineTop + rowHeight : Math.max(0, lineTop - height);
    // Line the suggested words up with the typed word. The font is monospace, so a column is 1ch;
    // 13px is the list's border, padding and item padding.
    const left = `max(0px, min(calc(${PAD - 13 - area.scrollLeft}px + ${column}ch), calc(100% - ${POPUP_CH}ch)))`;
    setSuggest({ ...found, caret, index: 0, top, left, rowHeight });
  };

  const accept = (area: HTMLTextAreaElement, item: Completion) => {
    if (!suggest) return;
    acceptingRef.current = true;
    insert(area, item.word, suggest.start, suggest.caret);
    acceptingRef.current = false;
    setSuggest(null);
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const area = event.target;
    const typedOneChar = area.value.length === value.length + 1;
    onChange(area.value);
    if (acceptingRef.current) return;
    // Open while typing; keep updating while open (e.g. Backspace); stay quiet on paste or delete.
    if (typedOneChar || suggest) refresh(area);
  };

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
    // Clicking or arrowing away from the word closes the list. Functional update: typing sets a new caret first.
    const { selectionStart: start, selectionEnd: end } = area;
    setSuggest((open) => (open && (start !== open.caret || end !== open.caret) ? null : open));
  };

  const syncScroll = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = event.currentTarget;
    // Keep the list under the caret when typing scrolls the editor.
    if (suggest) refresh(event.currentTarget);
    if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
    if (highlightRef.current) { highlightRef.current.scrollTop = scrollTop; highlightRef.current.scrollLeft = scrollLeft; }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const area = event.currentTarget;
    const { selectionStart: start, selectionEnd: end, value: text } = area;
    const plain = !event.ctrlKey && !event.metaKey && !event.altKey;

    // Ctrl+Space asks for suggestions without typing.
    if (event.key === " " && event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); refresh(area); return; }

    if (suggest && plain) {
      const count = suggest.items.length;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setSuggest({ ...suggest, index: (suggest.index + step + count) % count });
        return;
      }
      // Only Tab accepts. Enter stays a newline so "return ans⏎" never turns into another word.
      if (event.key === "Tab" && !event.shiftKey) {
        event.preventDefault();
        accept(area, suggest.items[suggest.index]);
        return;
      }
      if (event.key === "Escape") { event.preventDefault(); setSuggest(null); return; }
      if (event.key === "Enter") setSuggest(null);
    }

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
      className="code-editor flex h-full min-h-[320px] overflow-hidden"
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
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={trackCaret}
          onScroll={syncScroll}
          onBlur={() => setSuggest(null)}
          role="combobox"
          aria-expanded={Boolean(suggest)}
          aria-label={`${filename} source code`}
          aria-describedby={hintId}
          aria-autocomplete="list"
          aria-controls={suggest ? listId : undefined}
          aria-activedescendant={suggest ? `${listId}-${suggest.index}` : undefined}
          wrap="off"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="code-editor-input relative m-0 block h-full w-full resize-none whitespace-pre border-0 bg-transparent px-3 py-3 outline-none focus-visible:outline-none"
          style={{ font: "inherit", tabSize: 4 }}
        />
        {suggest && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Suggestions"
            style={{
              position: "absolute", top: suggest.top, left: suggest.left, width: `${POPUP_CH}ch`, zIndex: 10, margin: 0, padding: 4, listStyle: "none",
              background: SUGGEST.bg, border: `1px solid ${SUGGEST.border}`, borderRadius: 6, boxShadow: "0 6px 18px rgb(0 0 0 / 0.45)", color: SUGGEST.text,
            }}
          >
            {suggest.items.map((item, i) => (
              <li
                key={item.word}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === suggest.index}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 8px", borderRadius: 3, cursor: "pointer",
                  minHeight: Math.max(suggest.rowHeight, 28), background: i === suggest.index ? SUGGEST.active : "transparent",
                }}
                // pointerdown keeps focus in the textarea on mouse and touch; click would blur it first.
                onPointerDown={(event) => {
                  event.preventDefault();
                  const area = event.currentTarget.closest(".code-editor")?.querySelector("textarea");
                  if (area) accept(area, item);
                }}
              >
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ color: SUGGEST.match, fontWeight: 600 }}>{item.word.slice(0, suggest.prefix.length)}</span>
                  {item.word.slice(suggest.prefix.length)}
                </span>
                <span style={{ color: SUGGEST.kind, flexShrink: 0, fontSize: 12, fontFamily: "var(--font-sans), sans-serif" }}>{item.kind}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <span id={hintId} className="sr-only">
        Tab indents. Suggestions appear while typing: Tab accepts, arrow keys choose, Escape closes, Control plus Space opens them. Press Escape then Tab to leave the editor. Control or Command plus Enter runs the code.
      </span>
    </div>
  );
}
