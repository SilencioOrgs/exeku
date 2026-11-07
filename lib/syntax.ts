/**
 * Small syntax highlighter for the four judge languages. Colors follow VS Code's
 * Dark+/Light+ token scopes. Not a parser: it only needs to look right while typing.
 */
export type TokenType =
  | "plain" | "comment" | "string" | "number" | "keyword" | "control" | "constant"
  | "type" | "function" | "variable" | "preproc" | "bracket0" | "bracket1" | "bracket2";

export interface Token { type: TokenType; text: string }

type Lang = "python" | "java" | "cpp" | "c";

const words = (s: string) => new Set(s.split(" "));

const CONTROL = words("if else elif for while do switch case default break continue return try catch except finally throw raise goto with yield pass match async await");

const KEYWORDS: Record<Lang, Set<string>> = {
  python: words("def class import from as lambda global nonlocal in is not and or del assert"),
  java: words("public private protected static final class interface extends implements import package new void int long double float boolean char byte short this super throws abstract enum var instanceof synchronized"),
  cpp: words("int char long short float double void bool auto const constexpr static unsigned signed struct class public private protected namespace using template typename typedef enum union virtual override new delete sizeof inline extern operator friend this mutable"),
  c: words("int char long short float double void const static unsigned signed struct typedef enum union sizeof inline extern register volatile"),
};

const CONSTANTS: Record<Lang, Set<string>> = {
  python: words("True False None self"),
  java: words("true false null"),
  cpp: words("true false nullptr NULL INT_MAX INT_MIN LLONG_MAX LLONG_MIN"),
  c: words("NULL INT_MAX INT_MIN LLONG_MAX LLONG_MIN EOF"),
};

const TYPES: Record<Lang, Set<string>> = {
  python: words("int str float list dict set tuple bool bytes object range"),
  java: words(""),
  cpp: words("string vector map set pair queue stack deque priority_queue unordered_map unordered_set multiset multimap bitset array size_t int64_t uint64_t int32_t uint32_t ll std"),
  c: words("size_t int64_t uint64_t int32_t uint32_t FILE"),
};

const COMMENT: Record<Lang, string> = {
  python: String.raw`#[^\n]*`,
  java: String.raw`\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|(?![\s\S]))`,
  cpp: String.raw`\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|(?![\s\S]))`,
  c: String.raw`\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|(?![\s\S]))`,
};

const STRING: Record<Lang, string> = {
  python: String.raw`[rRbBfFuU]{0,2}(?:"""[\s\S]*?(?:"""|(?![\s\S]))|'''[\s\S]*?(?:'''|(?![\s\S]))|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)`,
  java: String.raw`"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?`,
  cpp: String.raw`(?<=#\s*include\s*)<[^>\n]*>?|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?`,
  c: String.raw`(?<=#\s*include\s*)<[^>\n]*>?|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?`,
};

const PATTERNS = new Map<Lang, RegExp>();

function pattern(lang: Lang): RegExp {
  let re = PATTERNS.get(lang);
  if (!re) {
    const preproc = lang === "cpp" || lang === "c" ? String.raw`(?<preproc>^[ \t]*#[ \t]*\w+)|` : "";
    re = new RegExp(
      `(?<comment>${COMMENT[lang]})|${preproc}(?<string>${STRING[lang]})` +
      String.raw`|(?<number>\b(?:0[xX][\da-fA-F']+|0[bB][01']+|\d[\d']*\.?\d*(?:[eE][+-]?\d+)?)[uUlLfF]*\b|\.\d+(?:[eE][+-]?\d+)?\b)` +
      String.raw`|(?<word>[A-Za-z_]\w*)|(?<bracket>[()[\]{}])|(?<other>\s+|[^\sA-Za-z_\d()[\]{}"'#/]+|.)`,
      "gmy",
    );
    PATTERNS.set(lang, re);
  }
  re.lastIndex = 0;
  return re;
}

export function tokenize(code: string, lang: Lang): Token[] {
  const re = pattern(lang);
  const tokens: Token[] = [];
  let depth = 0;
  let previousWord = "";
  let match: RegExpExecArray | null;
  while (re.lastIndex < code.length && (match = re.exec(code))) {
    const g = match.groups!;
    const text = match[0];
    let type: TokenType = "plain";
    if (g.comment !== undefined) type = "comment";
    else if (g.preproc !== undefined) type = "preproc";
    else if (g.string !== undefined) type = "string";
    else if (g.number !== undefined) type = "number";
    else if (g.bracket !== undefined) {
      if (text === ")" || text === "]" || text === "}") depth = Math.max(0, depth - 1);
      type = (`bracket${depth % 3}`) as TokenType;
      if (text === "(" || text === "[" || text === "{") depth++;
    } else if (g.word !== undefined) {
      const rest = code.slice(re.lastIndex);
      if (CONTROL.has(text)) type = "control";
      else if (CONSTANTS[lang].has(text)) type = "constant";
      else if (KEYWORDS[lang].has(text)) type = "keyword";
      else if (TYPES[lang].has(text) || (lang === "java" && /^[A-Z]/.test(text)) || previousWord === "class" || previousWord === "struct") type = "type";
      else if (/^\s*\(/.test(rest) || previousWord === "def") type = "function";
      else type = "variable";
      previousWord = text;
    }
    const last = tokens[tokens.length - 1];
    if (type === "plain" && last?.type === "plain") last.text += text;
    else tokens.push({ type, text });
  }
  return tokens;
}

// Note: "m" flag is only for the preprocessor's ^; unterminated blocks use (?![\s\S]) for end of input.

/** Split tokens into lines so each line can be rendered (and highlighted) on its own. */
export function tokenLines(code: string, lang: Lang): Token[][] {
  const lines: Token[][] = [[]];
  for (const token of tokenize(code, lang)) {
    token.text.split("\n").forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ type: token.type, text: part });
    });
  }
  return lines;
}
