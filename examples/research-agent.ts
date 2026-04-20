/**
 * Minimal research-agent demo — connects to the local BCA MCP server over
 * stdio, runs a `search_news` query, then fans out to `get_entity` on the
 * top article's first entity. Illustrates the canonical tool-chaining loop.
 *
 * Run (after `npm run build`):
 *   BCA_API_KEY=... npx tsx examples/research-agent.ts "stablecoin regulation"
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const query = process.argv[2] ?? "ethereum roadmap";

const transport = new StdioClientTransport({
  command: "node",
  args: ["./dist/index.js"],
  env: { ...process.env, BCA_API_KEY: process.env.BCA_API_KEY ?? "" },
});

const client = new Client(
  { name: "bca-research-demo", version: "0.0.1" },
  { capabilities: {} },
);
await client.connect(transport);

const search = await client.callTool({
  name: "search_news",
  arguments: { query, limit: 5 },
});
console.log("--- search_news ---\n", search.content);

const firstText = Array.isArray(search.content)
  ? (search.content[0] as { text?: string } | undefined)?.text
  : undefined;
if (firstText) {
  const parsed = JSON.parse(firstText) as {
    data?: { articles?: Array<{ entities?: string[] }> };
  };
  const firstEntity = parsed.data?.articles?.[0]?.entities?.[0];
  if (firstEntity) {
    const ent = await client.callTool({
      name: "get_entity",
      arguments: { slug: firstEntity },
    });
    console.log(`--- get_entity ${firstEntity} ---\n`, ent.content);
  }
}

await client.close();
