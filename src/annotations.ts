/**
 * MCP tool annotations: the hints hosts and directory reviews read to label
 * a tool and decide whether to ask before calling it. This module is the one
 * place the map lives; the Python sibling (bca_mcp) must produce the same
 * annotations for every tool.
 *
 *   title           tool name with underscores as spaces, first letter
 *                   capitalized (get_price -> "Get price")
 *   openWorldHint   true for every tool: each call reaches the BCA API
 *   readOnlyHint    true, except for the write tools below
 *
 * Write tools create a record or start a job on BCA's side (a service
 * request, an agent job, a keyword monitor). They set readOnlyHint,
 * destructiveHint and idempotentHint to false: nothing is deleted or
 * overwritten, and calling twice files two requests.
 */

export const WRITE_TOOLS: ReadonlySet<string> = new Set([
  "submit_listing",
  "book_kol_campaign",
  "request_custom_research",
  "monitor_keyword",
  "generate_due_diligence",
  "generate_tokenomics_model",
  "summarize_whitepaper",
  "translate_contract",
]);

export interface ToolAnnotations {
  readonly title: string;
  readonly readOnlyHint: boolean;
  readonly destructiveHint?: boolean;
  readonly idempotentHint?: boolean;
  readonly openWorldHint: boolean;
}

/** "get_price" -> "Get price". */
export function toolTitle(name: string): string {
  const spaced = name.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function toolAnnotations(name: string): ToolAnnotations {
  const title = toolTitle(name);
  if (WRITE_TOOLS.has(name)) {
    return {
      title,
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    };
  }
  return { title, readOnlyHint: true, openWorldHint: true };
}
