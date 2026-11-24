/**
 * Prompt-injection fence hardening. (Mirror of the Python sibling
 * `src/bca_mcp/_untrusted.py`.)
 *
 * The MCP server wraps untrusted upstream text (news article bodies,
 * whitepapers, contract source, event descriptions, entity dossiers) inside
 * `<untrusted_content …>…</untrusted_content>` fences so the host LLM treats
 * it as data, not instructions. That defence is only sound if the upstream
 * text cannot itself contain the fence's *closing* token: an attacker who
 * embeds a literal `</untrusted_content>` in, say, an article body would
 * otherwise close the fence early, and everything after it would be read by
 * the host model as trusted instructions (classic fence-escape / prompt
 * injection).
 *
 * `neutralizeFenceTokens` rewrites any literal fence tag, opening OR closing,
 * found inside upstream text into an inert, still-human-readable form
 * (`&lt;/untrusted_content&gt;`) so the fence can never be broken (or forged)
 * from within. It is deliberately tolerant of:
 *
 *   - case:            `</UNTRUSTED_CONTENT>` is caught
 *   - internal spaces: `< / untrusted_content >` is caught
 *   - attributes:      `<untrusted_content source="x">` is caught
 *
 * Call it on the raw upstream value *before* wrapping that value in a real
 * fence. Our own fence delimiters are added afterwards and are never touched.
 *
 * Kept behaviourally identical to the Python sibling: both neutralize to the
 * same `&lt;…&gt;` bytes so the two servers emit identical output for the
 * same payload.
 */

import { randomBytes } from "node:crypto";

// Matches an opening OR closing untrusted_content tag. `\/?` covers the
// closing slash; the leading/trailing `\s*` and the `\s*` around the slash
// tolerate obfuscation whitespace; `[^>]*` swallows any attributes on the
// opening form up to the terminating `>`. Global + case-insensitive.
const FENCE_TAG_RE = /<\s*\/?\s*untrusted_content\b[^>]*>/gi;

// The hidden characters of the Stats design's cleaners (appendix C): control
// characters, the soft hyphen, zero width characters, direction marks,
// invisible operators, variation selectors and the byte order mark, among
// others. Tab, line feed and carriage return stay: article bodies and
// contract code keep their lines, and JSON writes them as \t, \n and \r.
const FENCE_HIDDEN_RE =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u2028-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0\ufff0-\ufffb]/g;

/**
 * One text cleaned before the whole-data fence neutralizes tags (AGENTS-08
 * fix 1): NFKC, so fullwidth brackets become plain ones, then the hidden
 * characters out, so a zero width space cannot split a tag name. A look-alike
 * tag then becomes a real one, which neutralizeFenceTokens catches.
 */
export function cleanFenceText(text: string): string {
  return text.normalize("NFKC").replace(FENCE_HIDDEN_RE, "");
}

/** A copy of a payload with every string in it cleaned. Keys and every other value stay. */
export function cleanFenceValue(value: unknown): unknown {
  if (typeof value === "string") return cleanFenceText(value);
  if (Array.isArray(value)) return value.map(cleanFenceValue);
  if (value !== null && typeof value === "object") {
    // fromEntries defines own keys, so a "__proto__" key stays a plain key.
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cleanFenceValue(item)]));
  }
  return value;
}

/**
 * The id of one whole-data fence: 16 hex characters from the system's random
 * source, made new for each answer (AGENTS-08 fix 2). Upstream text cannot
 * know it, so a tag it plants cannot close the fence.
 */
export function newFenceId(): string {
  return randomBytes(8).toString("hex");
}

/**
 * Defang every embedded `<untrusted_content …>` / `</untrusted_content>`
 * token so upstream content cannot break out of (or forge) a fence.
 * Non-strings and empty strings pass through unchanged.
 */
export function neutralizeFenceTokens(text: unknown): unknown {
  if (typeof text !== "string" || text.length === 0) return text;
  // Escape only the angle brackets: the token stays legible to a human
  // reading the transcript/logs, but can no longer be parsed as a real
  // fence delimiter by the host model.
  return text.replace(FENCE_TAG_RE, (m) =>
    m.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
  );
}

/**
 * Wrap one piece of upstream text in a field-level fence, neutralizing any
 * fence tag inside it first. Same bytes the tool modules emit for article
 * summaries and agent job output.
 */
export function fenceUntrusted(source: string, text: string): string {
  return `<untrusted_content source="${source}">\n${neutralizeFenceTokens(text) as string}\n</untrusted_content>`;
}

/**
 * Fence the named string fields of one record in place. Anything that is
 * not a plain object, and any field that is not a non-empty string, is left
 * as it is.
 */
export function fenceFields(record: unknown, keys: readonly string[], source: string): void {
  if (record === null || typeof record !== "object" || Array.isArray(record)) return;
  const row = record as Record<string, unknown>;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.length > 0) row[key] = fenceUntrusted(source, value);
  }
}

/**
 * The rows of a list payload: `results` (the API's list key), else the
 * older key the tool used to read, else the payload itself when it is an
 * array. Empty when there is no list.
 */
export function payloadRows(data: unknown, legacyKey?: string): unknown[] {
  if (Array.isArray(data)) return data;
  if (data === null || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj["results"])) return obj["results"] as unknown[];
  if (legacyKey && Array.isArray(obj[legacyKey])) return obj[legacyKey] as unknown[];
  return [];
}
