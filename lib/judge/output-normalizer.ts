/**
 * Output comparison policy for competitive programming evaluation:
 * - Normalizes Windows CRLF (\r\n) and legacy CR (\r) into Unix LF (\n).
 * - Strips trailing whitespace from each line (spaces and tabs).
 * - Strips trailing empty lines from the end of the output.
 * - Strictly preserves internal whitespace, indentation, casing, and intra-line tokens.
 */
export function normalizeOutput(raw: string): string {
  if (!raw) return "";

  // 1. Normalize line endings
  const unix = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 2. Split lines and strip trailing whitespace from each line
  const lines = unix.split("\n").map((line) => line.replace(/[ \t]+$/, ""));

  // 3. Strip trailing empty lines from the end of output
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.join("\n");
}

export function compareOutputs(actual: string, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}
