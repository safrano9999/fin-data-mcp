/**
 * Protocol smoke test — spins up the server over stdio via the MCP SDK client,
 * lists tools, and calls one no-key tool. Run: npx tsx scripts/mcp-test.ts
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "src/index.ts"],
});

const client = new Client({ name: "smoke-client", version: "0.0.0" });
await client.connect(transport);

const { tools } = await client.listTools();
console.log(`tools/list returned ${tools.length} tools`);
// Spot-check annotations are present on a tool.
const sample = tools.find((t) => t.name === "yahoo_chart");
console.log("yahoo_chart annotations:", JSON.stringify(sample?.annotations));

const { resources } = await client.listResources();
console.log(`resources/list returned ${resources.length}:`, resources.map((r) => r.uri).join(", "));
const cat = await client.readResource({ uri: "fin-data://catalog" });
const catText = cat.contents?.[0]?.text;
console.log("catalog resource:", typeof catText === "string" ? catText.slice(0, 90) : catText);

const res = await client.callTool({
  name: "crypto_fear_greed_index",
  arguments: { limit: 1 },
});
const first = Array.isArray(res.content) ? res.content[0] : undefined;
console.log("\ntools/call crypto_fear_greed_index →");
console.log(first && "text" in first ? String(first.text).slice(0, 160) : first);

await client.close();
process.exit(0);
