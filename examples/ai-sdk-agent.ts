/**
 * Use fin-data-mcp-server as tools inside a Vercel AI SDK agent.
 *
 * Setup:
 *   npm i ai @ai-sdk/anthropic
 *   export ANTHROPIC_API_KEY=...
 *   npx tsx examples/ai-sdk-agent.ts
 *
 * Targets AI SDK v5+/v7 (experimental MCP client). The MCP server is launched as
 * a subprocess over stdio via npx straight from GitHub — no manual install.
 */
import { anthropic } from "@ai-sdk/anthropic";
import { experimental_createMCPClient as createMCPClient, generateText, stepCountIs } from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio";

const mcp = await createMCPClient({
  transport: new StdioMCPTransport({
    command: "npx",
    args: ["-y", "github:CohenD/fin-data-mcp"],
    // Optional: set keys to unlock keyed providers (FRED/Finnhub/EIA/...).
    env: { SEC_USER_AGENT: "you@example.com" },
  }),
});

try {
  // Exposes all fin-data tools (yahoo_*, cboe_*, crypto_*, fx_*, sec_*, ...).
  const tools = await mcp.tools();

  const { text } = await generateText({
    model: anthropic("claude-opus-4-8"),
    tools,
    stopWhen: stepCountIs(10),
    prompt:
      "How is the S&P 500 (^GSPC) doing over the last week, what's the crypto " +
      "Fear & Greed index, and what's USD/EUR right now? Summarize in 3 bullets.",
  });

  console.log(text);
} finally {
  await mcp.close();
}
