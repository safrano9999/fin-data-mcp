import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { allTools, catalog } from "./providers/index.js";
import { formatHttpError } from "./lib/http.js";
import { CHARACTER_LIMIT } from "./constants.js";

const INSTRUCTIONS = `fin-data-mcp-server provides read-only access to free financial
market data across 13 categories: stocks, indices, options, forex, commodities,
crypto (spot + perpetual futures), energy, prediction markets, market-moving news/
filings, macroeconomics, alternative data (flights), sentiment, and congressional
trading.

Conventions:
- Tools are prefixed by domain: yahoo_* and cboe_* (equities/indices/options),
  crypto_* (OKX spot+perps), fx_* (FX), worldbank_*/oecd_*/dbnomics_* (macro),
  sec_* (filings), kalshi_*/polymarket_*/manifold_* (prediction markets),
  flights_* (OpenSky), congress_* (lawmaker trades), energy_* (Ember),
  tiingo_* (premium equities), crypto_fear_greed_index (sentiment).
- Equities have two independent backends: yahoo_* (primary) and cboe_* (no-key
  delayed quotes incl. options + long history). Prefer cboe_* if Yahoo is throttled.
- All responses are compact JSON and are truncated past ~25k chars — use limit/
  offset/date bounds to narrow large queries.
- Most tools need no configuration. Optional env: SEC_USER_AGENT (recommended for
  sec_*), EMBER_API_KEY, TIINGO_API_KEY, OPENSKY_CLIENT_ID/SECRET.`;

/** Wrap a handler result into MCP content with truncation + structured data. */
function formatResult(result: unknown) {
  const json =
    typeof result === "string" ? result : JSON.stringify(result, null, 2);

  if (json.length <= CHARACTER_LIMIT) {
    const structuredContent =
      result && typeof result === "object" && !Array.isArray(result)
        ? (result as Record<string, unknown>)
        : { data: result };
    return {
      content: [{ type: "text" as const, text: json }],
      structuredContent,
    };
  }

  const kept = json.slice(0, CHARACTER_LIMIT);
  return {
    content: [
      {
        type: "text" as const,
        text:
          `${kept}\n\n…[truncated ${json.length - CHARACTER_LIMIT} characters]. ` +
          `Narrow the query with limit/offset/date bounds or a more specific identifier.`,
      },
    ],
  };
}

export function createServer(): McpServer {
  const server = new McpServer(
    { name: "fin-data-mcp-server", version: "0.2.0" },
    { instructions: INSTRUCTIONS },
  );

  for (const t of allTools) {
    server.registerTool(
      t.name,
      {
        title: t.title,
        description: t.description,
        inputSchema: t.inputSchema,
        annotations: t.annotations,
      },
      async (args: Record<string, unknown>) => {
        try {
          const result = await t.handler(args);
          return formatResult(result);
        } catch (err) {
          return {
            isError: true,
            content: [
              { type: "text" as const, text: `Error: ${formatHttpError(err)}` },
            ],
          };
        }
      },
    );
  }

  // Discovery resource: which providers/categories exist and what needs a key.
  server.registerResource(
    "catalog",
    "fin-data://catalog",
    {
      title: "Provider catalog",
      description:
        "Inventory of every data provider, the category it serves, whether it " +
        "needs a key, and the tools it exposes.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(catalog, null, 2),
        },
      ],
    }),
  );

  return server;
}
