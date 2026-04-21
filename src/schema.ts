/**
 * Shared input-schema helpers for tool Zod schemas.
 *
 * Centralizing slug/ticker validation here gives us one place to tighten
 * regexes, length caps, and error messages. Tools import these helpers
 * instead of inlining `z.string().min(1)` and leaving the MCP boundary
 * open to path-traversal, homoglyph, or CRLF-injection payloads.
 */
import { z } from "zod";

export const slugSchema = (label = "slug") =>
  z
    .string()
    .min(1)
    .max(240)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      `${label} must be kebab-case lowercase [a-z0-9-]`,
    );

export const tickerSchema = () =>
  z
    .string()
    .min(1)
    .max(12)
    .regex(/^[A-Za-z0-9]{1,12}$/, "ticker must be 1-12 alphanumerics");
