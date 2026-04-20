#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { BcaError } from "./errors.js";
import {
  searchNewsInputSchema,
  searchNewsDefinition,
  runSearchNews,
} from "./tools/search_news.js";
import {
  getEntityInputSchema,
  getEntityDefinition,
  runGetEntity,
} from "./tools/get_entity.js";
import {
  getExplainerInputSchema,
  getExplainerDefinition,
  runGetExplainer,
} from "./tools/get_explainer.js";

// --- zod -> JSON Schema (minimal, MCP-compatible) ---------------------------
// Uses zod's built-in toJSONSchema when present (zod 3.23+), else a minimal
// hand-rolled shim that introspects the top-level ZodObject shape. MCP clients
// only need a syntactically valid JSON Schema object for tool advertisement.
function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  // Prefer zod's own exporter if present (zod >= 3.23 ships z.toJSONSchema in some builds)
  const zAny = z as unknown as {
    toJSONSchema?: (s: z.ZodTypeAny) => Record<string, unknown>;
  };
  if (typeof zAny.toJSONSchema === "function") {
    try {
      return zAny.toJSONSchema(schema);
    } catch {
      /* fall through */
    }
  }

  // Fallback: derive from ZodObject shape. Handles Optional/Default wrappers.
  const unwrap = (s: z.ZodTypeAny): z.ZodTypeAny => {
    let cur: z.ZodTypeAny = s;
    while ((cur as any)?._def?.innerType) cur = (cur as any)._def.innerType as z.ZodTypeAny;
    return cur;
  };

  const describe = (s: z.ZodTypeAny): Record<string, unknown> => {
    const inner = unwrap(s);
    const typeName: string | undefined = (inner as any)?._def?.typeName;
    const description: string | undefined = (s as any)._def?.description;
    const base: Record<string, unknown> = {};
    if (description) base["description"] = description;

    switch (typeName) {
      case "ZodString":
        base["type"] = "string";
        break;
      case "ZodNumber":
        base["type"] = "number";
        break;
      case "ZodBoolean":
        base["type"] = "boolean";
        break;
      case "ZodArray":
        base["type"] = "array";
        break;
      default:
        base["type"] = "string";
    }
    return base;
  };

  const root = unwrap(schema);
  const shape: Record<string, z.ZodTypeAny> | undefined = (root as any)?.shape;
  if (!shape) return { type: "object" };

  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [key, value] of Object.entries(shape)) {
    properties[key] = describe(value);
    const tn: string | undefined = (value as any)?._def?.typeName;
    if (tn !== "ZodOptional" && tn !== "ZodDefault") required.push(key);
  }

  const out: Record<string, unknown> = {
    type: "object",
    properties,
    additionalProperties: false,
  };
  if (required.length > 0) out["required"] = required;
  return out;
}

interface ToolEntry {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly run: (args: unknown) => Promise<{
    data: unknown;
    cite_url?: string;
    as_of?: string;
    source_hash?: string;
    meta?: Record<string, unknown>;
  }>;
}

const TOOLS: ReadonlyArray<ToolEntry> = [
  {
    name: searchNewsDefinition.name,
    description: searchNewsDefinition.description,
    inputSchema: zodToJsonSchema(searchNewsInputSchema),
    run: async (args) => runSearchNews(searchNewsInputSchema.parse(args)),
  },
  {
    name: getEntityDefinition.name,
    description: getEntityDefinition.description,
    inputSchema: zodToJsonSchema(getEntityInputSchema),
    run: async (args) => runGetEntity(getEntityInputSchema.parse(args)),
  },
  {
    name: getExplainerDefinition.name,
    description: getExplainerDefinition.description,
    inputSchema: zodToJsonSchema(getExplainerInputSchema),
    run: async (args) => runGetExplainer(getExplainerInputSchema.parse(args)),
  },
];

const server = new Server(
  { name: "@blockchainacademics/mcp", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = TOOLS.find((t) => t.name === req.params.name);
  if (!tool) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: {
              code: "BCA_BAD_REQUEST",
              message: `Unknown tool: ${req.params.name}`,
            },
          }),
        },
      ],
    };
  }

  try {
    const envelope = await tool.run(req.params.arguments ?? {});
    // Attribution surfacing: cite_url/as_of/source_hash always present
    // (null when upstream omits) so downstream agents can detect provenance.
    const payload = {
      data: envelope.data,
      attribution: {
        cite_url: envelope.cite_url ?? null,
        as_of: envelope.as_of ?? null,
        source_hash: envelope.source_hash ?? null,
      },
      meta: envelope.meta ?? null,
    };
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  } catch (err) {
    const code = err instanceof BcaError ? err.code : "BCA_UNKNOWN";
    const message = err instanceof Error ? err.message : String(err);
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ error: { code, message } }, null, 2),
        },
      ],
    };
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Deliberately no console.log — stdio transport owns stdout.
}

main().catch((err) => {
  // Fatal startup errors go to stderr so the host sees them without corrupting stdio.
  process.stderr.write(
    `[bca-mcp] fatal: ${err?.stack ?? String(err)}\n`,
  );
  process.exit(1);
});
