/**
 * Prompt-injection fence hardening. (Mirror of the Python sibling
 * `src/bca_mcp/_untrusted.py`.)
 *
 * The MCP server wraps untrusted upstream text (news article bodies,
 * whitepapers, contract source, event descriptions, entity dossiers) inside
 * `<untrusted_content …>…</untrusted_content>` fences so the host LLM treats
 * it as data, not instructions. That defence is only sound if the upstream
 * text cannot itself contain the fence's *closing* token: an attacker who
 * embeds a literal `</untrusted_content>` in — say — an article body would
 * otherwise close the fence early, and everything after it would be read by
 * the host model as trusted instructions (classic fence-escape / prompt
 * injection).
 *
 * `neutralizeFenceTokens` rewrites any literal fence tag — opening OR closing
 * — found inside upstream text into an inert, still-human-readable form
 * (`&lt;/untrusted_content&gt;`) so the fence can never be broken (or forged)
 * from within. It is deliberately tolerant of:
 *
 *   - case            — `</UNTRUSTED_CONTENT>` is caught
 *   - internal spaces — `< / untrusted_content >` is caught
 *   - attributes      — `<untrusted_content source="x">` is caught
 *
 * Call it on the raw upstream value *before* wrapping that value in a real
 * fence. Our own fence delimiters are added afterwards and are never touched.
 *
 * Kept behaviourally identical to the Python sibling: both neutralize to the
 * same `&lt;…&gt;` bytes so the two servers emit identical output for the
 * same payload.
 */

// Matches an opening OR closing untrusted_content tag. `\/?` covers the
// closing slash; the leading/trailing `\s*` and the `\s*` around the slash
// tolerate obfuscation whitespace; `[^>]*` swallows any attributes on the
// opening form up to the terminating `>`. Global + case-insensitive.
const FENCE_TAG_RE = /<\s*\/?\s*untrusted_content\b[^>]*>/gi;

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
