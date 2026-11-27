/**
 * The eight Stats tools (design-final.md, section 1). Each calls one GET
 * route under /v1/stats/ and hands on the API's answer with its outside
 * text marked (outside.ts). lookup_stats_wallet matches the address on this
 * machine: two characters of it reach the API.
 *
 * Descriptions and argument texts are appendices D and E of the design, word
 * for word, and the same in the Python sibling (`src/bca_mcp/tools/stats.py`).
 * This file holds no link, reads no settings and opens nothing:
 * test/stats_guard.test.ts checks it.
 */
import { z } from "zod";

import { getClient } from "../client.js";
import { BcaBadRequestError, formatValidationError } from "../errors.js";
import {
  OUTSIDE_TEXT_KEYS,
  cleanCitations,
  cleanStatsMeta,
  dataLinkOk,
  fitsTextBlock,
  isPlainObject,
  newMarkerId,
  outsideKeys,
  stripMarkers,
  wrapOutside,
  type StatsCitation,
  type StatsPageInfo,
} from "../outside.js";

// --- the owner's open lines (design-final.md, "For the owner") -------------------
//
// Built with the design's recommended answers. Each line the package sees is
// one switch; test/docs.test.ts counts the tools from these two, so a change
// shows every count of the copy that must follow.
//
// Line 1: the Stats tools work on the built-in demo key, under their own
// daily allowance in the API. false: a free key is required, and each
// description drops its last sentence, "Works without an API key."
export const STATS_WORKS_WITHOUT_KEY = true;
// The two numbers of that allowance, as the copy gives them. The API holds
// the allowance itself (app/api/demo_key.py, task A3). test/docs.test.ts
// checks every copy line against these, so other numbers in the owner's
// answer to line 1 change here, and the test names each line to follow.
export const STATS_DEMO_ALLOWANCE = { perNetworkPerDay: 60, allPerDay: 3_000 } as const;
// Line 2: keep the wallet lookup, which sends two characters of the address.
// false: lookup_stats_wallet is not registered.
export const STATS_WALLET_LOOKUP = true;

// --- fixed numbers -------------------------------------------------------------

export const STATS_SCHEMA = "bca.stats/1";
/** The largest body a Stats call reads (512 KiB). */
export const STATS_READ_CAP = 524_288;
/** The largest wallet shard answer the package reads (1.5 MiB). The model never sees it whole. */
export const STATS_SHARD_READ_CAP = 1_572_864;
/** Lookup records in one wallet answer. */
export const LOOKUP_RECORDS_PER_ANSWER = 50;

// --- fixed sentences -----------------------------------------------------------

/** search_stats refuses a full address with this sentence, before any request (design 1.0). */
export const SEARCH_ADDRESS_REFUSED =
  "search_stats takes a name. A vault address goes to get_stats_record. " +
  "A wallet address goes to lookup_stats_wallet, which matches it on this machine.";

export const LOOKUP_NOTES: readonly string[] = [
  "The address was matched on this machine. Two characters of it were sent to the API.",
  "A later call about one of these vaults sends that vault's address to the API.",
];
export const NAME_NOTE = "A vault name is chosen by its leader. It is not a statement by Blockchain Academics.";
export const LOOKUP_SUMMARY_READ: readonly string[] = [
  "result_on_withdrawals_usd adds the result key: what the wallet took home on money it withdrew.",
  "venue_list_result_usd adds the listed_result key: the wallet's all-time result on the venue's own list, " +
    "money still inside included.",
  "The two overlap and count different things. Do not add them together.",
  "sum_of_figures_the_file_uses_usd adds one figure for each vault, the one the file names under uses. " +
    "It is the total the Stats lookup page shows, and it mixes the two kinds.",
];
export const leaderCutsSentence = (n: number): string =>
  `This wallet leads ${n} of these vaults. The cuts a leader was paid by depositors are in none of these figures.`;
export const leaderZeroSentence = (n: number): string =>
  `In ${n} of them the vault is closed and the venue's list shows a result of 0. ` +
  "That 0 may mean the list no longer shows the leader's result. It is not proof the leader came out even.";

// The API's own 400 sentences, used when the package refuses the same call.
const MEASURE_NOT_IN_TAB = "That measure does not belong to that tab.";
const KIND_NOT_IN_MEASURE = "That kind does not apply to that measure.";
const IDS_COUNT = "Between 2 and 5 ids, with no repeats.";
// The package's own validation texts for ids.
const EXCHANGE_ID_RULE = "An exchange id is letters and digits, with spaces, dots, hyphens or underscores between them.";
const VAULT_ID_RULE = "A vault id is 0x and 40 hex characters.";
const YIELD_ID_RULE = "A yield product id is letters and digits, with spaces, dots, hyphens or underscores between them.";
const CHAIN_ID_RULE = "A chain id is letters and digits, with spaces, dots, hyphens or underscores between them.";
// An address outside the vaults tab, in any spelling (review finding 2).
const ADDRESS_OUTSIDE_VAULTS =
  "An address is not an exchange, yield product or chain id. A vault address goes to the vaults tab. " +
  "A wallet address goes to lookup_stats_wallet, which matches it on this machine.";

// --- patterns ----------------------------------------------------------------------

// No control character (Unicode Cc: U+0000 to U+001F and U+007F to U+009F).
const NO_CONTROL_RE = /^[^\x00-\x1f\x7f-\x9f]*$/;
// tab and measure: a strict pattern, not a closed list, so a tab or measure
// the API opens later needs no package release (design 2 and 3.4).
const NAME_RE = /^[a-z][a-z0-9_]{1,39}$/;
const DAY_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const BEFORE_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}~[a-z0-9]+(-[a-z0-9]+)*$/;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const LOWER_ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX2_RE = /^[0-9a-f]{2}$/;
const HEX64_RE = /^[0-9a-f]{64}$/;
// The hidden characters of the design's cleaners (appendix C).
const HIDDEN_RE =
  /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u2028-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0\ufff0-\ufffb\u{e0000}-\u{e007f}]/gu;
// The 32 look-alike Cyrillic and Greek letters of the design's fold
// (appendix C, CONFUSABLE in the reference script), turned into Latin ones.
const CONFUSABLE: ReadonlyMap<string, string> = new Map([
  ["\u0430", "a"], ["\u0432", "b"], ["\u0435", "e"], ["\u043a", "k"], ["\u043c", "m"], ["\u043d", "h"],
  ["\u043e", "o"], ["\u0440", "p"], ["\u0441", "c"], ["\u0442", "t"], ["\u0443", "y"], ["\u0445", "x"],
  ["\u0456", "i"], ["\u0458", "j"], ["\u0455", "s"], ["\u0501", "d"], ["\u051b", "q"], ["\u051d", "w"],
  ["\u04cf", "l"], ["\u03b1", "a"], ["\u03b2", "b"], ["\u03b5", "e"], ["\u03b7", "n"], ["\u03b9", "i"],
  ["\u03ba", "k"], ["\u03bd", "v"], ["\u03bf", "o"], ["\u03c1", "p"], ["\u03c4", "t"], ["\u03c5", "u"],
  ["\u03c7", "x"], ["\u03c9", "w"],
]);
const LETTER_OR_DIGIT_RE = /^[\p{L}\p{N}]$/u;
const FORTY_HEX_RE = /[0-9a-f]{40}/;

/**
 * A text folded as the API folds a search query before it matches it (the
 * design's fold, appendix C): marks split off and dropped, small letters,
 * look-alike Cyrillic and Greek letters made Latin, and every character that
 * is not a letter or a digit taken out. Lower case stands in for Python's
 * casefold, with the sharp s folded to "ss", as in exchangeIdFrom.
 */
export function foldText(text: string): string {
  const plain = text.normalize("NFKD").replace(/\p{Mn}/gu, "").toLowerCase().replace(/ß/g, "ss");
  let out = "";
  for (const ch of plain) {
    const latin = CONFUSABLE.get(ch) ?? ch;
    if (LETTER_OR_DIGIT_RE.test(latin)) out += latin;
  }
  return out;
}

/**
 * True when a text holds a full address in any spelling: 40 hex characters in
 * a row once it is folded. "0X" and 40 hex, an address inside other words or
 * split by spaces, one written with a Cyrillic x or Cyrillic letters, and 40
 * hex characters with no 0x all count, because the API's fold joins each of
 * them back into the address (review finding 1).
 */
export function holdsAddress(text: string): boolean {
  return FORTY_HEX_RE.test(foldText(text));
}

/** A real calendar day, YYYY-MM-DD, years 1 to 9999. */
export function isRealDay(text: string): boolean {
  if (!DAY_RE.test(text)) return false;
  const [y, m, d] = text.split("-").map(Number) as [number, number, number];
  if (y < 1 || m < 1 || m > 12 || d < 1) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;
  return d <= days;
}

/** The design's light cleaner (appendix C, signed): NFKC, hidden characters out, one space, trimmed, cut. */
export function cleanSigned(text: string, max: number): string {
  return text
    .slice(0, Math.max(max, 1) * 4)
    .normalize("NFKC")
    .replace(HIDDEN_RE, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

/**
 * An exchange id as a person or a model may type it, in the shape of a
 * slug: "Crypto.com" and "crypto com" both become "crypto-com". Undefined
 * when nothing usable is left. Lower case stands in for Python's casefold;
 * the one difference that can leave a slug, the sharp s, is folded to "ss".
 */
export function exchangeIdFrom(text: string): string | undefined {
  const folded = cleanSigned(text, 64)
    .toLowerCase()
    .replace(/\u00df/g, "ss")
    .replace(/[\s._]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return SLUG_RE.test(folded) ? folded : undefined;
}

/** A vault address, trimmed and lower-cased; undefined when it is not 0x and 40 hex characters. */
export function vaultIdFrom(text: string): string | undefined {
  const trimmed = text.trim();
  return ADDRESS_RE.test(trimmed) ? trimmed.toLowerCase() : undefined;
}

// --- measures the package knows --------------------------------------------------

// The eight measures and their tabs (design appendix F). A measure the API
// opens later is not here: it is sent, and the API's answer comes back.
// A Map, so a measure named like an object property ("constructor") is unknown.
const KNOWN_MEASURES: ReadonlyMap<string, { tab: string; kinds: readonly string[] | null; open: boolean }> =
  new Map([
    ["checks_passed", { tab: "exchanges", kinds: ["centralised", "swap", "leveraged"], open: true }],
    ["reserve_report_detail", { tab: "exchanges", kinds: ["centralised"], open: true }],
    ["real_cost_buy_1000", { tab: "exchanges", kinds: ["centralised"], open: true }],
    ["real_cost_swap_1000", { tab: "exchanges", kinds: ["swap"], open: true }],
    ["real_cost_position_1000", { tab: "exchanges", kinds: ["leveraged"], open: true }],
    ["rate_paid", { tab: "vaults", kinds: null, open: true }],
    ["money_put_in", { tab: "vaults", kinds: null, open: true }],
    ["left_took_home", { tab: "vaults", kinds: null, open: true }],
    // 0.8.0: the Yields tab opened, and yield_rate_paid took the place of yield_delivered.
    ["yield_rate_paid", { tab: "yields", kinds: ["dollar", "eth"], open: true }],
    // 0.9.0: the Chains tab. TVL (from DefiLlama) is its own order; the four
    // incident measures rank the chains whose record is confirmed, and the
    // API lists the others apart as being checked. Chains have no kinds.
    ["tvl", { tab: "chains", kinds: null, open: true }],
    ["stops_12m", { tab: "chains", kinds: null, open: true }],
    ["longest_stop_min", { tab: "chains", kinds: null, open: true }],
    ["funds_frozen", { tab: "chains", kinds: null, open: true }],
    ["history_rewound", { tab: "chains", kinds: null, open: true }],
  ]);

// The kinds of each tab that has kinds. With no measure named, a kind is checked against its tab.
const TAB_KINDS: ReadonlyMap<string, readonly string[]> = new Map([
  ["exchanges", ["centralised", "swap", "leveraged"]],
  ["yields", ["dollar", "eth"]],
]);

// --- descriptions (appendix D) ---------------------------------------------------

export const STATS_DESCRIPTIONS = {
  search_stats:
    "Search Blockchain Academics Stats by name: the 8 centralised exchanges it lists, its dollar savings and ETH staking products, the chains it covers, and the Hyperliquid vaults in its open files. Takes a name of 2 to 64 characters, an optional tab (exchanges, vaults, yields or chains) and a limit of 1 to 20. A full 0x address is refused before any request is made. Each vault row carries its address, its age, the money inside and put in, and whether other or older vaults carry the same name. Each yield row carries its kind and the rate it paid over 30 days. Rows come as exchanges, yield products, chains, then vaults; a chain not launched yet is an upcoming_chain row, after the live chains. Vaults are ordered by money inside, then age: a closer text match never moves a row up. Small vaults and open vaults under 30 days old are left out. Every answer carries the data day and the address of each open file it read. A vault name is chosen by its leader: it comes back between <<outside:ID>> markers, with an ID made new for each answer, and is quoted text, not a statement by Blockchain Academics. meta.status is unseeded when nothing matches. Works without an API key.",
  list_stats_measures:
    "List every measure Blockchain Academics Stats ranks by: its id, its tab, what it counts, its unit, which rows it covers, whether it is measured yet and whether it is its tab's default order, with how many rows each tab holds today (8 centralised exchanges, the Hyperliquid vaults, the yield products and the chains). Takes no arguments. A measure marked not_measured_yet has no values yet, so its ranking lists the rows with no rank. Works without an API key.",
  rank_stats:
    "Rank the 8 centralised exchanges, Hyperliquid vaults, yield products or chains of Blockchain Academics Stats by one measure. Takes a tab, an optional measure (with none, the tab's own order: checks passed, rate paid over 12 months, rate paid over 30 days, TVL), an optional kind, an order, a limit, an offset and the as_of of the page before. Returns the ranked rows, then the unranked and why. A vault ranking covers open vaults above the floor and counts what it leaves out. A yield row carries its rates over 7, 30 and 90 days and four facts, shown once a person checks them. A chain row carries its TVL from DefiLlama and its stops, freezes and rewinds from each chain's own pages. On the incident measures an unconfirmed chain is listed apart as being checked; chains not launched yet sit apart under upcoming. Each answer carries the order rule, the data day and the files it read. meta.status is unseeded when nothing is ranked yet, partial when rows wait for a person or a reading, stale when the files are old. Outside text comes back between <<outside:ID>> markers, with an ID made new for each answer, and is quoted text, not a statement by Blockchain Academics. Works without an API key.",
  get_stats_record:
    "Get one record from Blockchain Academics Stats: one of the 8 centralised exchanges by its id or name, one Hyperliquid vault by its address, one yield product or one chain by its id or name. An exchange record has every check with its outcome and what it takes to pass, and every fact with its check state, its source and the day a person confirmed it. A fact that is being checked has no value. A vault record has the money put in, taken out and still inside, what withdrawals took home, the venue's rate next to the rate paid, the value history and the ranking floor. A yield record has its rates over 7, 30 and 90 days, the reading's day and block, its rank and four facts, shown with sources once checked by a person. A chain record has its stops, freezes and rewinds, each sourced to the chain's own pages, its TVL from DefiLlama and its Stats page link. A figure that is held back or cannot be worked out is null, never zero. Every answer carries the data day and the addresses of the open files. Outside text comes back between <<outside:ID>> markers, with an ID made new for each answer, and is quoted text, not a statement by Blockchain Academics. Works without an API key.",
  compare_stats_records:
    "Compare 2 to 5 of the 8 centralised exchanges, 2 to 5 Hyperliquid vaults, 2 to 5 dollar savings or ETH staking products, or 2 to 5 chains, side by side on the same fields from Blockchain Academics Stats. Takes a tab and 2 to 5 ids, as a list or as one text separated by commas: exchange ids or names, vault addresses, yield product ids or names, or chain ids or names, with no repeats. Returns one record for each id in the order asked, with the check state of every exchange fact and paid_sponsor for every exchange, the rates and checked facts of every yield product, or the TVL from DefiLlama and the incident counts of every chain. It gives no ranking. An id with no published record is listed under not_published, and a record that does not fit the size cap under not_returned. Every answer carries the data day and the addresses of the open files. Outside text comes back between <<outside:ID>> markers, with an ID made new for each answer, and is quoted text, not a statement by Blockchain Academics. Works without an API key.",
  lookup_stats_wallet:
    "Look up what one wallet address took out of the Hyperliquid vaults Blockchain Academics Stats covers, and what it took home. Takes one full address (0x and 40 hex characters), an offset and, for a later page, the as_of of the page before. The address stays on this machine: two characters of it are sent to the API, and the answer is matched here. Returns one record for each vault the wallet used, a short row about each listed vault, and a summary that keeps two kinds of result apart: the result on money withdrawn, from the vault's ledger, and the all-time result on the venue's own list. It holds no dates, no deposits and no balances, and it is not a list of the wallet's tokens. A wallet with no record may still have used a vault: the answer lists what the files cannot see. Vault names come back between <<outside:ID>> markers, with an ID made new for each answer, and are quoted text. Works without an API key.",
  get_stats_method:
    "Get how Blockchain Academics Stats makes its numbers, for one topic. exchanges: the checks for the 8 centralised exchanges in their fixed wording, the order rule, what each fact is and what each fact status means. vaults: what each figure of a Hyperliquid vault record counts, the ranking floor, the order rules, what a null means, what the rankings leave out and the totals for all vaults. wallet_lookup: the fields of a lookup record, the rounding, how to read the summary and what the files cannot see. yields: the two kinds, the order rule, how a rate is read on chain, what each fact is and what each field counts. chains: what a stop, a freeze and a rewind are, how an incident is sourced to the chain's own pages and accepted, how TVL is read from DefiLlama, the order rules and what each field counts. The text is written by Blockchain Academics and comes with the method version or variant and the data day. Works without an API key.",
  list_stats_changes:
    "List the change lines of Blockchain Academics Stats, newest at the top: lines a person writes when a check or a published fact changes. Nightly moves of figures and rates, and vaults or products joining or leaving a list, are not in it, and every answer says so. Takes an optional day to start from (YYYY-MM-DD), a limit of 1 to 100 and, for a later page, the next_before value of the page before. Each line has its day, the kind of subject, the result and its text as the open file gives it. A line's text, and a vault named as its subject, come back between <<outside:ID>> markers, with an ID made new for each answer, and are quoted text. meta.status is unseeded while no change line has been published. Works without an API key.",
} as const;

export type StatsToolName = keyof typeof STATS_DESCRIPTIONS;

// --- input schemas (bounds of section 1, texts of appendix E) ---------------

const tabField = () =>
  z.string().max(40).regex(NAME_RE, "tab must be a tab name: a lower case letter, then letters, digits or _");

const dayField = (description: string) =>
  z
    .string()
    .max(10)
    .regex(DAY_RE, "a day written YYYY-MM-DD")
    .refine((value) => !DAY_RE.test(value) || isRealDay(value), { error: "not a real day" })
    .optional()
    .describe(description);

const PAGE_BEFORE =
  "The as_of of the page before, YYYY-MM-DD. A page of another data day is refused, so two days are never mixed.";

// A name is 2 to 64 characters once the package's markers are out (design
// 1.1). The argument itself may carry the 57 characters of one pair of
// markers on top, so a name copied back from an earlier answer still works
// (review finding G20); runSearchStats checks the name's own bound.
export const SEARCH_QUERY_MAX = 64;
const MARKER_PAIR_CHARS = 57;

export const searchStatsInputSchema = z.object({
  query: z
    .string()
    .min(2)
    .max(SEARCH_QUERY_MAX + MARKER_PAIR_CHARS)
    .regex(NO_CONTROL_RE, "query must not hold a control character")
    .describe("A name, 2 to 64 characters. Not an address."),
  tab: tabField().optional().describe("exchanges, vaults, yields or chains. Every open tab when left out."),
  limit: z.number().int().min(1).max(20).default(10).describe("Rows to return, 1 to 20 (default 10)."),
});

export const listStatsMeasuresInputSchema = z.object({});

export const rankStatsInputSchema = z.object({
  tab: tabField().describe("exchanges, vaults, yields or chains."),
  measure: z
    .string()
    .max(40)
    .regex(NAME_RE, "measure must be a measure id: a lower case letter, then letters, digits or _")
    .optional()
    .describe("A measure id from the list of measures. It must belong to the tab. The tab's own order when left out."),
  kind: z
    .enum(["centralised", "swap", "leveraged", "dollar", "eth"])
    .optional()
    .describe(
      "The kind: centralised, swap or leveraged for the exchanges tab, dollar or eth for the yields tab. The measure's own kind when left out.",
    ),
  order: z
    .enum(["top", "bottom"])
    .default("top")
    .describe(
      "top reads the list from its top, bottom from its other end. The rank numbers stay the same (default top).",
    ),
  limit: z.number().int().min(1).max(50).default(20).describe("Rows to return, 1 to 50 (default 20)."),
  offset: z
    .number()
    .int()
    .min(0)
    .max(10_000)
    .default(0)
    .describe("Rows to skip, for paging: the next_offset of the page before (default 0)."),
  as_of: dayField(PAGE_BEFORE),
});

export const getStatsRecordInputSchema = z.object({
  tab: tabField().describe("exchanges, vaults, yields or chains."),
  id: z
    .string()
    .min(1)
    .max(64)
    .regex(NO_CONTROL_RE, "id must not hold a control character")
    .describe(
      "An exchange id or name (for example kraken or Crypto.com), a vault address (0x and 40 hex characters), a yield product id or name (for example lido-wsteth), or a chain id or name (for example solana or BNB Chain).",
    ),
});

export const compareStatsRecordsInputSchema = z.object({
  tab: tabField().describe("exchanges, vaults, yields or chains."),
  ids: z
    .union([z.array(z.string().min(1).max(64)).min(2).max(5), z.string().min(3).max(400)])
    .describe(
      "2 to 5 ids with no repeats, as a list or as one text separated by commas (for example kraken,coinbase).",
    ),
});

export const lookupStatsWalletInputSchema = z.object({
  address: z
    .string()
    .max(64)
    .trim()
    .regex(ADDRESS_RE, "address must be 0x and 40 hex characters")
    .describe("One full wallet address: 0x and 40 hex characters."),
  offset: z
    .number()
    .int()
    .min(0)
    .max(5_000)
    .default(0)
    .describe("Records to skip when the wallet has more than 50: the next_offset of the page before (default 0)."),
  as_of: dayField(PAGE_BEFORE),
});

export const getStatsMethodInputSchema = z.object({
  topic: z
    .enum(["exchanges", "vaults", "wallet_lookup", "yields", "chains"])
    .describe("exchanges, vaults, wallet_lookup, yields or chains."),
});

export const listStatsChangesInputSchema = z.object({
  since: dayField(
    "A day, YYYY-MM-DD: lines on or after it. A day outside the allowed range is moved to the nearest allowed day, and the answer says so.",
  ),
  limit: z.number().int().min(1).max(100).default(20).describe("Lines to return, 1 to 100 (default 20)."),
  before: z
    .string()
    .max(80)
    .regex(BEFORE_RE, "before must be a next_before value of an earlier answer")
    .optional()
    .describe("The next_before value of the page before, for the next page."),
});

export type SearchStatsInput = z.infer<typeof searchStatsInputSchema>;
export type RankStatsInput = z.infer<typeof rankStatsInputSchema>;
export type GetStatsRecordInput = z.infer<typeof getStatsRecordInputSchema>;
export type CompareStatsRecordsInput = z.infer<typeof compareStatsRecordsInputSchema>;
export type LookupStatsWalletInput = z.infer<typeof lookupStatsWalletInputSchema>;
export type GetStatsMethodInput = z.infer<typeof getStatsMethodInputSchema>;
export type ListStatsChangesInput = z.infer<typeof listStatsChangesInputSchema>;

// --- what a Stats call returns ---------------------------------------------------

/** The API answer did not have the Stats shape. index.ts turns it into its fixed sentence. */
export class StatsShapeError extends Error {
  constructor() {
    super("the API answer did not have the Stats shape");
    this.name = "StatsShapeError";
  }
}

export interface StatsCallContext {
  /** 16 hex characters, sent as X-Request-ID and named in errors. */
  readonly requestId: string;
}

/** The answer a Stats tool hands the model: one text block, and the same object as structured content. */
export interface StatsAnswer {
  data: unknown;
  attribution: { citations: StatsCitation[] };
  meta: Record<string, unknown>;
}

const STATUSES: ReadonlySet<unknown> = new Set(["complete", "unseeded", "partial", "stale"]);

type Check = "count" | "count_or_null" | "text" | "text_or_null" | "list" | "object" | "bool" | "hex2" | "hex64" | "lookup_notes";

// The keys each tool needs in data, besides the common block (design 1.0).
const REQUIRED: Readonly<Record<StatsToolName, Readonly<Record<string, Check>>>> = {
  search_stats: {
    count: "count",
    matches_total: "count",
    limit: "count",
    results: "list",
    left_out: "object",
    searched: "object",
    order: "text",
  },
  list_stats_measures: { count: "count", measures: "list", tabs: "list" },
  rank_stats: {
    tab: "text",
    measure: "object",
    order: "text",
    order_rule: "text",
    sample_size: "count",
    counts: "object",
    count: "count",
    total: "count",
    limit: "count",
    offset: "count",
    results: "list",
    what_is_missing: "list",
    next_offset: "count_or_null",
    trimmed: "bool",
  },
  get_stats_record: { tab: "text", record: "object" },
  compare_stats_records: {
    tab: "text",
    ids_asked: "count",
    count: "count",
    records: "list",
    not_published: "list",
    not_returned: "list",
  },
  lookup_stats_wallet: {
    prefix: "hex2",
    page: "text",
    page_sha256: "hex64",
    counts: "object",
    lookup_notes: "lookup_notes",
    vaults: "object",
    wallets: "object",
  },
  get_stats_method: { topic: "text", text: "object" },
  list_stats_changes: {
    count: "count",
    total: "count",
    limit: "count",
    results: "list",
    covers: "text",
    not_covered: "list",
    next_before: "text_or_null",
  },
};

const isCount = (value: unknown): boolean => Number.isInteger(value) && (value as number) >= 0;
const isTextList = (value: unknown): boolean =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

function lookupNotesOk(value: unknown): boolean {
  return (
    isPlainObject(value) &&
    isPlainObject(value["fields"]) &&
    isPlainObject(value["status_meanings"]) &&
    isPlainObject(value["uses_meanings"]) &&
    isTextList(value["why_sentences"]) &&
    typeof value["rounding"] === "string" &&
    isTextList(value["cannot_see"])
  );
}

function passes(check: Check, value: unknown): boolean {
  switch (check) {
    case "count":
      return isCount(value);
    case "count_or_null":
      return value === null || isCount(value);
    case "text":
      return typeof value === "string";
    case "text_or_null":
      return value === null || typeof value === "string";
    case "list":
      return Array.isArray(value);
    case "object":
      return isPlainObject(value);
    case "bool":
      return typeof value === "boolean";
    case "hex2":
      return typeof value === "string" && HEX2_RE.test(value);
    case "hex64":
      return typeof value === "string" && HEX64_RE.test(value);
    case "lookup_notes":
      return lookupNotesOk(value);
  }
}

// A key made of digits alone: JavaScript moves such a key to the front of an
// object, so the two packages would hand on the keys in another order.
const DIGITS_KEY_RE = /^[0-9]+$/;

/** No key made of digits alone and no number that is not finite, at any depth (64 at most). */
function walkIsPlain(node: unknown, depth = 0): boolean {
  if (depth > 64) return false;
  if (Array.isArray(node)) return node.every((item) => walkIsPlain(item, depth + 1));
  if (isPlainObject(node)) {
    return Object.entries(node).every(([key, value]) => !DIGITS_KEY_RE.test(key) && walkIsPlain(value, depth + 1));
  }
  if (typeof node === "number") return Number.isFinite(node);
  return true;
}

/** The block every Stats answer starts with. A status key in data is refused: the status is meta's. */
function commonBlockOk(data: Record<string, unknown>): boolean {
  return (
    data["schema"] === STATS_SCHEMA &&
    !Object.prototype.hasOwnProperty.call(data, "status") &&
    typeof data["as_of"] === "string" &&
    isRealDay(data["as_of"]) &&
    Array.isArray(data["sources"]) &&
    data["sources"].every((s) => isPlainObject(s) && dataLinkOk(s["file"])) &&
    outsideKeys(data["outside_text_keys"]) !== undefined &&
    isCount(data["rows_dropped"]) &&
    isTextList(data["notes"])
  );
}

interface CheckedEnvelope {
  data: Record<string, unknown> | null;
  status: string;
  citations: readonly unknown[];
  meta: Record<string, unknown>;
}

/**
 * The canonical envelope, a status of the four, and the keys the tool needs
 * in data. An answer with no data is passed on when its status says so
 * (unseeded or partial). Anything else is a StatsShapeError: the old flat
 * shape and a raw body are not accepted, and a missing status is never read
 * as complete.
 */
export function checkStatsEnvelope(tool: StatsToolName, raw: unknown): CheckedEnvelope {
  if (!isPlainObject(raw) || !("data" in raw)) throw new StatsShapeError();
  const attribution = raw["attribution"];
  const meta = raw["meta"];
  if (!isPlainObject(attribution) || !Array.isArray(attribution["citations"]) || !isPlainObject(meta)) {
    throw new StatsShapeError();
  }
  const status = meta["status"];
  if (!STATUSES.has(status)) throw new StatsShapeError();
  const data = raw["data"];
  const checked = { status: status as string, citations: attribution["citations"] as unknown[], meta };
  if (data === null) {
    if (status !== "unseeded" && status !== "partial") throw new StatsShapeError();
    return { ...checked, data: null };
  }
  if (!isPlainObject(data) || !commonBlockOk(data)) throw new StatsShapeError();
  for (const [key, check] of Object.entries(REQUIRED[tool])) {
    if (!passes(check, data[key])) throw new StatsShapeError();
  }
  if (!walkIsPlain(data)) throw new StatsShapeError();
  return { ...checked, data };
}

/** The answer for the model: data with its outside text marked, the checked citations and meta. */
function finish(
  checked: CheckedEnvelope,
  data: Record<string, unknown> | null,
  ctx: StatsCallContext,
  pageInfo?: StatsPageInfo,
): StatsAnswer {
  const marker = newMarkerId();
  const keys = data === null ? new Set(OUTSIDE_TEXT_KEYS) : outsideKeys(data["outside_text_keys"]);
  if (keys === undefined) throw new StatsShapeError();
  return {
    data: data === null ? null : wrapOutside(data, marker, keys),
    attribution: { citations: cleanCitations(checked.citations) },
    meta: cleanStatsMeta(checked.meta, checked.status, ctx.requestId, marker, pageInfo),
  };
}

type Params = Record<string, string | number | boolean | undefined>;

async function getStats(
  tool: StatsToolName,
  path: string,
  params: Params | undefined,
  ctx: StatsCallContext,
  maxBodyBytes = STATS_READ_CAP,
): Promise<CheckedEnvelope> {
  const raw = await getClient().requestRaw(path, params, { maxBodyBytes, requestId: ctx.requestId });
  return checkStatsEnvelope(tool, raw);
}

function refuse(tool: StatsToolName, field: string, message: string): never {
  throw new BcaBadRequestError(formatValidationError(tool, [{ code: "custom", path: [field], message }]));
}

// --- runners ---------------------------------------------------------------------

export async function runSearchStats(input: SearchStatsInput, ctx: StatsCallContext): Promise<StatsAnswer> {
  // A name copied back from an earlier answer still works: the markers come out before the checks.
  const query = stripMarkers(input.query).trim();
  // Counted in code points, as zod and the API count a string's length.
  const length = Array.from(query).length;
  if (length < 2) refuse("search_stats", "query", "String must contain at least 2 character(s)");
  if (length > SEARCH_QUERY_MAX) {
    refuse("search_stats", "query", `String must contain at most ${SEARCH_QUERY_MAX} character(s)`);
  }
  // A full address in any spelling is refused here, so none reaches the API.
  if (holdsAddress(query)) throw new BcaBadRequestError(SEARCH_ADDRESS_REFUSED);
  const checked = await getStats(
    "search_stats",
    "/v1/stats/search",
    { q: query, tab: input.tab, limit: input.limit },
    ctx,
  );
  return finish(checked, checked.data, ctx);
}

export async function runListStatsMeasures(_input: unknown, ctx: StatsCallContext): Promise<StatsAnswer> {
  const checked = await getStats("list_stats_measures", "/v1/stats/measures", undefined, ctx);
  return finish(checked, checked.data, ctx);
}

export async function runRankStats(input: RankStatsInput, ctx: StatsCallContext): Promise<StatsAnswer> {
  const known = input.measure === undefined ? undefined : KNOWN_MEASURES.get(input.measure);
  if (known !== undefined && (known.tab !== input.tab || !known.open)) {
    refuse("rank_stats", "measure", MEASURE_NOT_IN_TAB);
  }
  if (input.kind !== undefined) {
    // The measure's own kinds when the package knows it, else the tab's kinds:
    // a tab with no kinds (vaults) takes none.
    const kinds = known === undefined ? TAB_KINDS.get(input.tab) : known.kinds;
    if (kinds === undefined || kinds === null || !kinds.includes(input.kind)) {
      refuse("rank_stats", "kind", KIND_NOT_IN_MEASURE);
    }
  }
  const checked = await getStats(
    "rank_stats",
    "/v1/stats/rank",
    {
      tab: input.tab,
      measure: input.measure,
      kind: input.kind,
      order: input.order,
      limit: input.limit,
      offset: input.offset,
      as_of: input.as_of,
    },
    ctx,
  );
  return finish(checked, checked.data, ctx);
}

export async function runGetStatsRecord(input: GetStatsRecordInput, ctx: StatsCallContext): Promise<StatsAnswer> {
  const vaults = input.tab === "vaults";
  // The vaults tab is the one place an address goes. In any other tab it
  // would sit in the path, /v1/stats/<tab>/<address>, so it is refused here.
  if (!vaults && holdsAddress(input.id)) refuse("get_stats_record", "id", ADDRESS_OUTSIDE_VAULTS);
  const id = vaults ? vaultIdFrom(input.id) : exchangeIdFrom(input.id);
  if (id === undefined) refuse("get_stats_record", "id", idRule(input.tab));
  const checked = await getStats(
    "get_stats_record",
    `/v1/stats/${encodeURIComponent(input.tab)}/${encodeURIComponent(id)}`,
    undefined,
    ctx,
  );
  return finish(checked, checked.data, ctx);
}

/** What an id of a tab must look like, said when one does not. */
function idRule(tab: string): string {
  if (tab === "vaults") return VAULT_ID_RULE;
  if (tab === "chains") return CHAIN_ID_RULE;
  return tab === "yields" ? YIELD_ID_RULE : EXCHANGE_ID_RULE;
}

/** The ids a comparison sends: folded, checked, 2 to 5 and no repeats. */
export function compareIds(tab: string, ids: string | readonly string[]): string[] {
  let items: readonly string[];
  if (typeof ids === "string") {
    if (!NO_CONTROL_RE.test(ids)) refuse("compare_stats_records", "ids", "ids must not hold a control character");
    items = ids.split(",");
  } else {
    items = ids;
  }
  const vaults = tab === "vaults";
  // Outside the vaults tab, an address in any spelling is refused. The ids
  // are checked together, because the query joins them with commas.
  if (!vaults && holdsAddress(items.join(","))) refuse("compare_stats_records", "ids", ADDRESS_OUTSIDE_VAULTS);
  const folded = items.map((one) => (vaults ? vaultIdFrom(one) : exchangeIdFrom(one)));
  if (folded.some((one) => one === undefined)) {
    refuse("compare_stats_records", "ids", idRule(tab));
  }
  const out = folded as string[];
  if (out.length < 2 || out.length > 5 || new Set(out).size !== out.length) {
    refuse("compare_stats_records", "ids", IDS_COUNT);
  }
  return out;
}

export async function runCompareStatsRecords(
  input: CompareStatsRecordsInput,
  ctx: StatsCallContext,
): Promise<StatsAnswer> {
  const ids = compareIds(input.tab, input.ids);
  const checked = await getStats(
    "compare_stats_records",
    "/v1/stats/compare",
    { tab: input.tab, ids: ids.join(",") },
    ctx,
  );
  return finish(checked, checked.data, ctx);
}

export async function runGetStatsMethod(input: GetStatsMethodInput, ctx: StatsCallContext): Promise<StatsAnswer> {
  const checked = await getStats("get_stats_method", "/v1/stats/method", { topic: input.topic }, ctx);
  return finish(checked, checked.data, ctx);
}

export async function runListStatsChanges(
  input: ListStatsChangesInput,
  ctx: StatsCallContext,
): Promise<StatsAnswer> {
  const checked = await getStats(
    "list_stats_changes",
    "/v1/stats/changes",
    { since: input.since, limit: input.limit, before: input.before },
    ctx,
  );
  return finish(checked, checked.data, ctx);
}

// --- the wallet lookup, matched on this machine -----------------------------------

const money = (value: unknown): boolean =>
  value === null || (typeof value === "number" && Number.isFinite(value));

/** A lookup record as the shard answer carries it: the file's 12 keys and vault_listed. */
function lookupRecordOk(r: Record<string, unknown>): boolean {
  return (
    typeof r["vault"] === "string" &&
    LOWER_ADDRESS_RE.test(r["vault"]) &&
    (r["vault_state"] === "open" || r["vault_state"] === "closed") &&
    typeof r["leader"] === "boolean" &&
    typeof r["status"] === "string" &&
    isCount(r["withdrawals"]) &&
    money(r["cost"]) &&
    money(r["received"]) &&
    money(r["result"]) &&
    money(r["cut"]) &&
    money(r["listed_result"]) &&
    typeof r["why"] === "string" &&
    typeof r["vault_listed"] === "boolean"
  );
}

// The 12 keys of a lookup record in the file, in the file's order, and the
// vault_listed the API adds (design 1.6 and 3.1, rule 12). A record in the
// answer is built from these by name, so a key the shard carries beyond them
// never reaches the model (review finding 11).
const LOOKUP_RECORD_KEYS: readonly string[] = [
  "vault",
  "vault_state",
  "leader",
  "status",
  "withdrawals",
  "cost",
  "received",
  "result",
  "cut",
  "listed_result",
  "uses",
  "why",
  "vault_listed",
];

function ownValue(obj: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
}

const sumOf = (values: ReadonlyArray<number | null>): number =>
  values.reduce<number>((total, value) => (value === null ? total : total + value), 0);

/**
 * The wallet answer, built here from one shard: the records of `address`
 * alone, each joined to its vault row, a summary over every record of the
 * wallet with the two kinds of result apart, and one page of 50 records.
 */
export function walletAnswer(
  shard: Record<string, unknown>,
  address: string,
  offset: number,
): Record<string, unknown> {
  const notes = shard["lookup_notes"] as Record<string, unknown>;
  const wallets = shard["wallets"] as Record<string, unknown>;
  const vaultRows = shard["vaults"] as Record<string, unknown>;
  const listed = ownValue(wallets, address);
  if (listed !== undefined && !Array.isArray(listed)) throw new StatsShapeError();
  const every: Array<Record<string, unknown>> = [];
  for (const record of (listed as unknown[] | undefined) ?? []) {
    if (!isPlainObject(record)) throw new StatsShapeError();
    // A record whose figure is neither of the two kinds is dropped (design 3.1, rule 12).
    if (record["uses"] !== "ledger" && record["uses"] !== "list") continue;
    if (!lookupRecordOk(record)) throw new StatsShapeError();
    const row = ownValue(vaultRows, record["vault"] as string);
    if (row !== undefined && !isPlainObject(row)) throw new StatsShapeError();
    every.push({
      ...Object.fromEntries(LOOKUP_RECORD_KEYS.map((key) => [key, record[key]])),
      figure_the_file_uses: record["uses"] === "ledger" ? record["result"] : record["listed_result"],
      leader_listed_zero_after_close:
        record["leader"] === true && record["vault_state"] === "closed" && record["listed_result"] === 0,
      vault_row: row ?? null,
    });
  }
  const page = every.slice(offset, offset + LOOKUP_RECORDS_PER_ANSWER);
  // A Map keeps any status text a plain key, in the order it is met.
  const byStatus = new Map<string, number>();
  for (const r of every) {
    const status = r["status"] as string;
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
  }
  const led = every.filter((r) => r["leader"] === true).length;
  const zeros = every.filter((r) => r["leader_listed_zero_after_close"] === true).length;
  const howToRead = [...LOOKUP_SUMMARY_READ];
  if (led > 0) howToRead.push(leaderCutsSentence(led));
  if (zeros > 0) howToRead.push(leaderZeroSentence(zeros));
  const figure = (r: Record<string, unknown>, key: string) => r[key] as number | null;
  const summary =
    every.length === 0
      ? null
      : {
          records: every.length,
          leads: led,
          by_status: Object.fromEntries(byStatus),
          records_with_withdrawals: every.filter((r) => r["result"] !== null).length,
          result_on_withdrawals_usd: sumOf(every.map((r) => figure(r, "result"))),
          records_on_venue_list: every.filter((r) => r["listed_result"] !== null).length,
          venue_list_result_usd: sumOf(every.map((r) => figure(r, "listed_result"))),
          sum_of_figures_the_file_uses_usd: sumOf(every.map((r) => figure(r, "figure_the_file_uses"))),
          how_to_read: howToRead,
        };
  const named = page.some((r) => {
    const row = r["vault_row"];
    return isPlainObject(row) && typeof row["name_by_leader"] === "string" && row["name_by_leader"] !== "";
  });
  const more = offset + page.length < every.length;
  const statusMeanings = notes["status_meanings"] as Record<string, unknown>;
  return {
    schema: shard["schema"],
    as_of: shard["as_of"],
    uploaded_at: shard["uploaded_at"] ?? null,
    method_version: shard["method_version"] ?? null,
    variant: shard["variant"] ?? null,
    sources: shard["sources"],
    outside_text_keys: shard["outside_text_keys"],
    rows_dropped: shard["rows_dropped"],
    notes: [...LOOKUP_NOTES, ...(named ? [NAME_NOTE] : [])],
    address,
    found: every.length > 0,
    count: page.length,
    total: every.length,
    limit: LOOKUP_RECORDS_PER_ANSWER,
    offset,
    next_offset: more && page.length > 0 ? offset + page.length : null,
    lookup_page: { name: shard["page"], sha256: shard["page_sha256"] },
    summary,
    records: page,
    uses_meanings: notes["uses_meanings"],
    status_meanings: Object.fromEntries(
      Object.entries(statusMeanings).filter(([status]) => page.some((r) => r["status"] === status)),
    ),
    cannot_see: notes["cannot_see"],
  };
}

function walletPageInfo(data: Record<string, unknown>): StatsPageInfo {
  return {
    hasNextPage: data["next_offset"] !== null,
    hasPreviousPage: (data["offset"] as number) > 0,
    startCursor: null,
    endCursor: null,
  };
}

/** The package's last check: records go from the end of the page until the text block fits. */
function fitWalletAnswer(answer: StatsAnswer): StatsAnswer {
  const data = answer.data as Record<string, unknown>;
  const records = data["records"] as unknown[];
  while (records.length > 0 && !fitsTextBlock(answer)) {
    records.pop();
    data["count"] = records.length;
    data["next_offset"] = (data["offset"] as number) + records.length;
    // The meanings cover the statuses still on the page (design 1.6).
    const meanings = data["status_meanings"];
    if (isPlainObject(meanings)) {
      data["status_meanings"] = Object.fromEntries(
        Object.entries(meanings).filter(([status]) =>
          records.some((r) => isPlainObject(r) && r["status"] === status),
        ),
      );
    }
    answer.meta["pageInfo"] = walletPageInfo(data);
  }
  return answer;
}

export async function runLookupStatsWallet(
  input: LookupStatsWalletInput,
  ctx: StatsCallContext,
): Promise<StatsAnswer> {
  const address = input.address.trim().toLowerCase();
  const prefix = address.slice(2, 4);
  // The two characters after 0x name the shard. The full address is never sent.
  const checked = await getStats(
    "lookup_stats_wallet",
    `/v1/stats/wallets/shard/${prefix}`,
    { as_of: input.as_of },
    ctx,
    STATS_SHARD_READ_CAP,
  );
  if (checked.data === null) return finish(checked, null, ctx);
  if (checked.data["prefix"] !== prefix) throw new StatsShapeError();
  const data = walletAnswer(checked.data, address, input.offset);
  return fitWalletAnswer(finish(checked, data, ctx, walletPageInfo(data)));
}

// --- registration ------------------------------------------------------------------

export interface StatsToolSpec {
  readonly schema: z.ZodType;
  readonly definition: { name: StatsToolName; description: string };
  readonly runner: (input: any, ctx: StatsCallContext) => Promise<StatsAnswer>;
}

export const KEYLESS_SENTENCE = " Works without an API key.";

/** A tool's description as tools/list shows it: appendix D, with the owner's line 1 applied. */
export function statsDescription(name: StatsToolName): string {
  const text = STATS_DESCRIPTIONS[name];
  return STATS_WORKS_WITHOUT_KEY || !text.endsWith(KEYLESS_SENTENCE)
    ? text
    : text.slice(0, -KEYLESS_SENTENCE.length);
}

const spec = (
  name: StatsToolName,
  schema: z.ZodType,
  runner: (input: any, ctx: StatsCallContext) => Promise<StatsAnswer>,
): StatsToolSpec => ({ schema, definition: { name, description: statsDescription(name) }, runner });

/** The Stats tools, in the order tools/list shows them (eight, with the owner's line 2 applied). */
export const STATS_TOOL_SPECS: readonly StatsToolSpec[] = [
  spec("search_stats", searchStatsInputSchema, runSearchStats),
  spec("list_stats_measures", listStatsMeasuresInputSchema, runListStatsMeasures),
  spec("rank_stats", rankStatsInputSchema, runRankStats),
  spec("get_stats_record", getStatsRecordInputSchema, runGetStatsRecord),
  spec("compare_stats_records", compareStatsRecordsInputSchema, runCompareStatsRecords),
  spec("lookup_stats_wallet", lookupStatsWalletInputSchema, runLookupStatsWallet),
  spec("get_stats_method", getStatsMethodInputSchema, runGetStatsMethod),
  spec("list_stats_changes", listStatsChangesInputSchema, runListStatsChanges),
].filter((s) => STATS_WALLET_LOOKUP || s.definition.name !== "lookup_stats_wallet");
