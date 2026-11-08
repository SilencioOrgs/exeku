/**
 * Word completion for the code editor: keywords, common built-ins and names already in the file.
 * Not a language server. It suggests whole words that start with what the student is typing.
 */
export type CompletionLang = "python" | "java" | "cpp" | "c";
export type CompletionKind = "keyword" | "function" | "type" | "name";

export interface Completion { word: string; kind: CompletionKind }

export interface CompletionState {
  /** Where the typed prefix starts; accepting replaces text from here to the caret. */
  start: number;
  prefix: string;
  items: Completion[];
}

const list = (s: string) => s.split(/\s+/).filter(Boolean);

const VOCAB: Record<CompletionLang, Record<Exclude<CompletionKind, "name">, string[]>> = {
  python: {
    keyword: list("def class return if elif else for while break continue pass import from as with try except finally raise lambda global nonlocal yield assert del in is not and or True False None"),
    function: list("print input len range enumerate zip sorted reversed sum min max abs round map filter open isinstance append extend insert pop remove index count split join strip lstrip rstrip replace startswith endswith lower upper find format items keys values get update setdefault readline readlines"),
    type: list("int str float bool list dict set tuple object Exception ValueError IndexError KeyError sys math collections defaultdict Counter deque heapq bisect itertools"),
  },
  java: {
    keyword: list("public private protected static final class interface extends implements import package return if else for while do switch case default break continue new void try catch finally throw throws this super null true false var instanceof"),
    function: list("main println print printf nextInt nextLong nextDouble nextLine next hasNext hasNextInt length size charAt substring indexOf equals compareTo toString parseInt valueOf add get put containsKey remove isEmpty sort contains split trim toCharArray"),
    type: list("System String Scanner Integer Long Double Boolean Character Math StringBuilder ArrayList List HashMap Map HashSet Set LinkedList Deque ArrayDeque PriorityQueue Arrays Collections BufferedReader InputStreamReader IOException int long double boolean char byte short float"),
  },
  cpp: {
    keyword: list("include using namespace return if else for while do switch case default break continue const constexpr static struct class public private protected template typename auto true false nullptr new delete sizeof"),
    function: list("main cout cin endl getline printf scanf push_back pop_back emplace_back size empty begin end front back insert erase find count sort reverse max min swap abs to_string stoi stoll accumulate lower_bound upper_bound make_pair memset ios_base sync_with_stdio tie"),
    type: list("int long double float char bool void string vector map set pair queue stack deque priority_queue unordered_map unordered_set iostream bits stdc std size_t"),
  },
  c: {
    keyword: list("include define return if else for while do switch case default break continue const static struct typedef enum sizeof"),
    function: list("main printf scanf puts gets fgets getchar putchar strlen strcpy strcmp strcat memset malloc calloc free abs qsort"),
    type: list("int long double float char void unsigned short size_t stdio stdlib string math FILE"),
  },
};

/** Words students type most in contest code. They win ties, so "ra" offers range before raise. */
const COMMON: Record<CompletionLang, Set<string>> = {
  python: new Set(list("print input range len int str list map split append sorted return while for if else elif def import")),
  java: new Set(list("System String Scanner println nextInt nextLine public static void main int long return for while if else new")),
  cpp: new Set(list("include iostream using namespace std cout cin endl vector string int long return for while if else push_back size sort")),
  c: new Set(list("include stdio printf scanf int long return for while if else char")),
};

const MIN_PREFIX = 2;
const MIN_NAME = 3;

/** True when the caret sits inside a comment or an unclosed string on its line (rough, line-based). */
function inCommentOrString(lineBeforeCaret: string, lang: CompletionLang): boolean {
  let quote: string | null = null;
  for (let i = 0; i < lineBeforeCaret.length; i++) {
    const ch = lineBeforeCaret[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (lang === "python" ? ch === "#" : ch === "/" && lineBeforeCaret[i + 1] === "/") return true;
  }
  return quote !== null;
}

export function getCompletions(text: string, caret: number, lang: CompletionLang, max = 8): CompletionState | null {
  // Only at the end of a word: "pri|" yes, "pri|nt" no.
  if (/[A-Za-z0-9_]/.test(text[caret] ?? "")) return null;
  const before = text.slice(0, caret);
  const match = before.match(/[A-Za-z_][A-Za-z0-9_]*$/);
  if (!match || match[0].length < MIN_PREFIX) return null;
  const prefix = match[0];
  const start = caret - prefix.length;
  const lineBefore = before.slice(before.lastIndexOf("\n") + 1, start);
  if (inCommentOrString(lineBefore, lang)) return null;

  const seen = new Set<string>([prefix]);
  const candidates: Completion[] = [];
  const add = (word: string, kind: CompletionKind) => {
    if (seen.has(word)) return;
    seen.add(word);
    candidates.push({ word, kind });
  };
  const vocab = VOCAB[lang];
  for (const kind of ["keyword", "function", "type"] as const) for (const word of vocab[kind]) add(word, kind);
  // Names the student already wrote, except the word being typed right now.
  const rest = text.slice(0, start) + text.slice(caret);
  for (const [word] of rest.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) if (word.length >= MIN_NAME) add(word, "name");

  const lower = prefix.toLowerCase();
  const common = COMMON[lang];
  const rank = (c: Completion) => (c.word.startsWith(prefix) ? 0 : 2) + (common.has(c.word) ? 0 : 1);
  const items = candidates
    .filter((c) => c.word.length > prefix.length && c.word.toLowerCase().startsWith(lower))
    .sort((a, b) => rank(a) - rank(b) || a.word.length - b.word.length || a.word.localeCompare(b.word))
    .slice(0, max);
  return items.length ? { start, prefix, items } : null;
}

/** Visual column of the caret, counting a tab as `tabSize` columns. */
export function caretPosition(text: string, caret: number, tabSize = 4): { line: number; column: number } {
  const before = text.slice(0, caret);
  const lineStart = before.lastIndexOf("\n") + 1;
  let column = 0;
  for (const ch of before.slice(lineStart)) column = ch === "\t" ? column + tabSize - (column % tabSize) : column + 1;
  return { line: before.split("\n").length - 1, column };
}
