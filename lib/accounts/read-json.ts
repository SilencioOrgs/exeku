const MAX_BODY_CHARS = 8_192;

/** Parses a small JSON request body. Returns undefined when it is too large or malformed. */
export async function readJson(request: Request): Promise<unknown> {
  const body = await request.text();
  if (body.length > MAX_BODY_CHARS) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}
