const DEFAULT_MAX_BYTES = 8 * 1024;

export type JsonBody = { ok: true; value: unknown } | { ok: false; status: 400 | 413; error: string };

/** Parses a JSON request body, and stops reading as soon as it passes maxBytes. */
export async function readJson(request: Request, maxBytes = DEFAULT_MAX_BYTES): Promise<JsonBody> {
  const reader = request.body?.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      return { ok: false, status: 413, error: "That request is too large." };
    }
    text += decoder.decode(value, { stream: true });
  }
  try {
    return { ok: true, value: JSON.parse(text + decoder.decode()) };
  } catch {
    return { ok: false, status: 400, error: "Invalid request." };
  }
}
