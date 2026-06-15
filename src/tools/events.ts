/**
 * Events tools. Wraps /v1/events — upcoming crypto conferences, hackathons,
 * meetups, summits, and festivals from the Blockchain Academics calendar.
 * Read-only, free tier.
 */
import { z } from "zod";
import { getClient } from "../client.js";
import { slugSchema } from "../schema.js";
import type { ResponseEnvelope } from "../types.js";

const EVENT_TYPES = [
  "conference",
  "hackathon",
  "meetup",
  "summit",
  "workshop",
  "festival",
] as const;

/**
 * Wrap free-text that originated from external sources (scraped event
 * descriptions) so the consuming LLM treats it as data, not instructions.
 */
function wrapUntrusted(source: string, s: unknown): string | undefined {
  if (typeof s !== "string" || s.length === 0) return s as undefined;
  return `<untrusted_content source="${source}">\n${s}\n</untrusted_content>`;
}

// --- get_events ------------------------------------------------------------
export const getEventsInputSchema = z.object({
  event_type: z.enum(EVENT_TYPES).optional().describe("Filter by event type."),
  country: z.string().max(160).optional().describe("Country name (case-insensitive)."),
  topic: z.string().max(128).optional().describe("Topic slug (e.g. defi, ai)."),
  is_virtual: z.boolean().optional().describe("Filter virtual vs in-person events."),
  featured: z.boolean().optional().describe("Only featured events."),
  q: z.string().min(2).max(160).optional().describe("Title substring search."),
  include_past: z
    .boolean()
    .default(false)
    .describe("Include events whose start date has already passed (default false)."),
  limit: z.number().int().min(1).max(100).default(20).describe("Max events (default 20)."),
  offset: z.number().int().min(0).default(0).describe("Pagination offset."),
});
export const getEventsDefinition = {
  name: "get_events",
  description:
    "List upcoming crypto events (conferences, hackathons, meetups, summits) soonest-first. Filter by type, country, topic, virtual/IRL, featured, or title substring. Use get_event for full detail by slug.",
};
export async function runGetEvents(
  input: z.infer<typeof getEventsInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  return getClient().request("/v1/events", {
    event_type: input.event_type,
    country: input.country,
    topic: input.topic,
    is_virtual: input.is_virtual,
    featured: input.featured,
    q: input.q,
    include_past: input.include_past,
    limit: input.limit,
    offset: input.offset,
  });
}

// --- get_event -------------------------------------------------------------
export const getEventInputSchema = z.object({
  slug: slugSchema("slug").describe("Event slug (from get_events)."),
});
export const getEventDefinition = {
  name: "get_event",
  description:
    "Fetch a single crypto event by slug: start/end dates, location, type, organizer, website, and description.",
};
export async function runGetEvent(
  input: z.infer<typeof getEventInputSchema>,
): Promise<ResponseEnvelope<unknown>> {
  const res = await getClient().request(
    `/v1/events/${encodeURIComponent(input.slug)}`,
  );
  const data = res?.data as Record<string, unknown> | undefined;
  if (data && typeof data.description === "string") {
    data.description = wrapUntrusted("get_event", data.description);
  }
  return res;
}
