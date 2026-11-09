export type ParsedHandle = { handle?: string; error?: undefined } | { handle?: undefined; error: string };

function parseHandle(input: string, profilePrefix: RegExp, pattern: RegExp, error: string): ParsedHandle {
  const handle = input.trim().replace(profilePrefix, "").replace(/^@/, "").replace(/[?#].*$/, "").replace(/\/+$/, "");
  if (!handle) return {};
  return pattern.test(handle) ? { handle } : { error };
}

/** Accepts a username or a full profile link. Other sites are rejected rather than stored. */
export const parseGithub = (input: string) =>
  parseHandle(input, /^(https?:\/\/)?(www\.)?github\.com\//i, /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i, "Enter a GitHub username or github.com link.");

export const parseLinkedin = (input: string) =>
  parseHandle(input, /^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/in\//i, /^[\p{L}\p{N}-]{3,100}$/u, "Enter a LinkedIn name or linkedin.com/in link.");

/** Portfolio link. Anything but a plain http(s) address, such as javascript:, is rejected rather than stored. */
export function parseWebsite(input: string): { url?: string; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) return {};
  const error = "Enter a website link, like yourname.dev.";
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname.includes(".") || url.username || url.password) return { error };
    return { url: url.href };
  } catch {
    return { error };
  }
}

// Only the handle is stored, so these links can never point anywhere but the two sites.
export const githubUrl = (handle: string) => `https://github.com/${encodeURIComponent(handle)}`;
export const linkedinUrl = (handle: string) => `https://www.linkedin.com/in/${encodeURIComponent(handle)}`;
