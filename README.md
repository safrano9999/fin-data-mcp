# fin-data-mcp-server

A one-stop **Model Context Protocol** server for free financial market data. It
wires up live API requests across **13 market-data categories**, focused on
sources that need **no API key** — so it works the moment you start it.

**83 no-key tools** (15 providers) work out of the box; adding optional free keys
unlocks **7 more providers for up to 110 tools / 22 providers**, spanning stocks,
indices, options, FX, commodities, crypto (spot + perpetual futures), energy,
prediction markets, macroeconomics, filings/news, flight tracking, sentiment, and
congressional trading. Equities have **two independent no-key backends** (Yahoo +
Cboe) plus optional premium ones.

**Keyed providers register only when their key is set** — with no keys configured,
their tools never appear in `tools/list`, so the agent never sees a tool it can't
use. The `fin-data://catalog` resource still lists them as "set `X` to enable."

Built to the MCP best-practices guide: every tool is read-only with proper
annotations, validated inputs (Zod), structured content, character-limit
truncation, actionable error messages, server instructions, and a discovery
resource. Every endpoint was verified returning HTTP 200 from a US IP.

## Install

No clone, no build — the server runs straight from GitHub via `npx` (it builds on
first install). Pick your client:

### Claude Code (one command)

```bash
claude mcp add fin-data -- npx -y github:CohenD/fin-data-mcp
```

That's it — restart Claude Code and the tools are available. To unlock keyed
providers, append env flags, e.g.:

```bash
claude mcp add fin-data \
  -e SEC_USER_AGENT="you@example.com" \
  -e FRED_API_KEY=xxxx \
  -- npx -y github:CohenD/fin-data-mcp
```

### Claude Desktop / Cursor / Windsurf / any MCP client

Add this to the client's MCP config (`claude_desktop_config.json`,
`.cursor/mcp.json`, etc.):

```json
{
  "mcpServers": {
    "fin-data": {
      "command": "npx",
      "args": ["-y", "github:CohenD/fin-data-mcp"],
      "env": { "SEC_USER_AGENT": "you@example.com" }
    }
  }
}
```

### Vercel AI SDK (agentic apps)

```ts
import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio";

const mcp = await createMCPClient({
  transport: new StdioMCPTransport({
    command: "npx",
    args: ["-y", "github:CohenD/fin-data-mcp"],
  }),
});
const tools = await mcp.tools(); // pass straight into generateText / streamText
```

Full runnable example: [`examples/ai-sdk-agent.ts`](examples/ai-sdk-agent.ts).

### From source

```bash
git clone https://github.com/CohenD/fin-data-mcp && cd fin-data-mcp
npm install            # builds dist/ via the prepare script
npm start              # run over stdio
```

A project-scoped [`.mcp.json`](.mcp.json) is included, so opening the cloned repo in
Claude Code auto-registers the server.

No configuration is required for the 83 no-key tools. To unlock keyed providers or
higher limits, set the env vars in [`.env.example`](.env.example).

The server also exposes a `fin-data://catalog` **resource** listing every provider,
its category, whether it needs a key, and its tools.

## Verify it works

```bash
npm run smoke                   # broad live sample incl. chained discovery
npx tsx scripts/smoke.ts        # core no-key endpoints
npx tsx scripts/mcp-test.ts     # full MCP handshake: tools/list, resource, a tool call
```

## Tools by category

| Category | Provider | Tools |
| --- | --- | --- |
| **Stocks / Indices / FX / Crypto** | Yahoo Finance | `yahoo_chart`, `yahoo_quote`, `yahoo_search`, `yahoo_quote_summary`, `yahoo_recommendations`, `yahoo_spark` |
| **Stocks / Indices / Options (no-key backup)** | Cboe | `cboe_quote`, `cboe_history`, `cboe_options_chain` |
| **Options** | Yahoo Finance | `yahoo_options_chain` |
| **Stocks (premium backup, free key)** | Tiingo | `tiingo_eod_prices`, `tiingo_metadata`, `tiingo_iex_intraday` |
| **Forex** | Frankfurter (ECB) | `fx_latest_rates`, `fx_historical_rate`, `fx_timeseries`, `fx_list_currencies` |
| **Forex** | ExchangeRate-API | `fx_open_rates` |
| **Commodities / Macro / Demographics** | World Bank | `worldbank_indicator`, `worldbank_search_indicators`, `worldbank_list_countries`, `worldbank_sources`, `worldbank_topics`, `worldbank_indicator_metadata`, `worldbank_country` |
| **Crypto (spot + perp futures)** | OKX | `crypto_candles`, `crypto_ticker`, `crypto_orderbook`, `crypto_funding_rate`, `crypto_open_interest`, `crypto_mark_price`, `crypto_recent_trades`, `crypto_all_tickers`, `crypto_index_candles`, `crypto_price_limit`, `crypto_long_short_ratio`, `crypto_list_instruments` |
| **Energy** (free key) | Ember | `energy_ember_series` |
| **Prediction Markets** | Polymarket | `polymarket_list_markets`, `polymarket_list_events`, `polymarket_get_market`, `polymarket_get_event`, `polymarket_price_history`, `polymarket_order_book`, `polymarket_midpoint`, `polymarket_last_trade_price`, `polymarket_spread` |
| **Prediction Markets** | Kalshi | `kalshi_list_markets`, `kalshi_get_market`, `kalshi_orderbook`, `kalshi_list_events`, `kalshi_get_event`, `kalshi_get_series`, `kalshi_trades`, `kalshi_exchange_status`, `kalshi_exchange_schedule`, `kalshi_list_series`, `kalshi_candlesticks` |
| **Prediction Markets** | Manifold | `manifold_search_markets`, `manifold_get_market`, `manifold_list_markets`, `manifold_get_user`, `manifold_market_positions`, `manifold_bets`, `manifold_groups`, `manifold_comments` |
| **News / Filings** | SEC EDGAR | `sec_company_filings`, `sec_company_facts`, `sec_company_concept`, `sec_full_text_search`, `sec_ticker_to_cik`, `sec_xbrl_frames` |
| **Macroeconomic** | OECD | `oecd_data`, `oecd_dataflows`, `oecd_data_structure` |
| **Macroeconomic** | DBnomics (100+ sources) | `dbnomics_search`, `dbnomics_series`, `dbnomics_providers`, `dbnomics_provider_datasets`, `dbnomics_dataset` |
| **Alternative (Flights)** | OpenSky | `flights_live_states`, `flights_by_aircraft`, `flights_by_airport`, `flights_track` |
| **Sentiment** | Alternative.me | `crypto_fear_greed_index` |
| **Congressional Trading** | House/Senate Stock Watcher | `congress_house_trades`, `congress_senate_trades` |

### Optional keyed providers (register only when their key is set)

| Category | Provider | Env | Tools |
| --- | --- | --- | --- |
| **Macro / news** | FRED | `FRED_API_KEY` | `fred_series_observations`, `fred_series_info`, `fred_search_series`, `fred_releases` |
| **Stocks (real-time + fundamentals)** | Finnhub | `FINNHUB_API_KEY` | `finnhub_quote`, `finnhub_company_profile`, `finnhub_company_news`, `finnhub_basic_financials`, `finnhub_recommendation_trends`, `finnhub_insider_transactions`, `finnhub_earnings_surprises`, `finnhub_symbol_search` |
| **Commodities / Stocks / FX / Macro** | Alpha Vantage | `ALPHAVANTAGE_API_KEY` | `av_commodity`, `av_economic_indicator`, `av_time_series_daily`, `av_global_quote`, `av_fx_daily` |
| **Energy** | EIA | `EIA_API_KEY` | `eia_browse_route`, `eia_data` |
| **Congressional / lobbying / contracts** | Quiver | `QUIVER_API_KEY` | `quiver_congress_trading`, `quiver_lobbying`, `quiver_gov_contracts`, `quiver_insider_trading` |
| **Stocks (premium backup)** | Tiingo | `TIINGO_API_KEY` | `tiingo_eod_prices`, `tiingo_metadata`, `tiingo_iex_intraday` |
| **Energy** | Ember | `EMBER_API_KEY` | `energy_ember_series` |

## Notes & caveats (verified live 2026-06-28; all return 200 from a US IP)

- **Equities have two independent no-key backends.** `yahoo_*` is primary;
  `cboe_*` (Cboe's delayed-quote CDN) is a fully independent fallback that also
  serves indices, full options chains, and ~20 years of daily history. Prefer
  `cboe_*` if Yahoo is throttled. `tiingo_*` adds a premium source with a free key.
- **Crypto uses OKX, not Binance.** Binance's `fapi` returns HTTP 451 to US IPs.
  OKX is no-key, US-accessible, and serves spot (`BTC-USDT`) and perpetual-swap
  futures (`BTC-USDT-SWAP`).
- **Yahoo** is unofficial and bot-sensitive: a full Chrome UA trips its bot filter
  (429), so the client sends a minimal `Mozilla/5.0` and fails over query1 →
  query2. `yahoo_quote_summary`/`yahoo_options_chain` do the cookie+crumb
  handshake automatically.
- **SEC EDGAR** requires a descriptive `User-Agent` with a contact — set
  `SEC_USER_AGENT`.
- **House Stock Watcher** original S3 bucket and the first GitHub mirror both went
  away; this points at the current maintained mirror. Override via
  `HOUSE_STOCK_WATCHER_URL` / `SENATE_STOCK_WATCHER_URL` if it moves.
- **OpenSky** works anonymously (~400 credits/day); set `OPENSKY_CLIENT_ID/SECRET`
  for higher limits.
- The HTTP layer sends `Accept-Language: en` on every request — Node's undici
  defaults to `Accept-Language: *`, which made OECD's SDMX server 500.

## Architecture (MCP best practices)

```
src/
  index.ts          # stdio entry point
  server.ts         # builds the server: instructions, annotations, structured
                    #   content, CHARACTER_LIMIT truncation, error mapping, catalog resource
  config.ts         # env-driven config (all optional)
  constants.ts      # CHARACTER_LIMIT, default page size
  lib/
    http.ts         # fetch wrapper: params, timeout, retries, formatHttpError
    cache.ts        # in-memory TTL cache
    tool.ts         # ToolDef + tool() helper (applies read-only annotations)
  providers/
    index.ts        # aggregates tools, uniqueness check, builds the catalog
    <provider>.ts   # one file per source; exports an array of ToolDef
```

- **Annotations:** every tool is `readOnlyHint: true`, `destructiveHint: false`,
  `idempotentHint: true`, `openWorldHint: true`.
- **Structured content:** handlers return JSON; the server attaches
  `structuredContent` and truncates anything over `CHARACTER_LIMIT` (~25k chars)
  with a message telling the agent to narrow the query.
- **Errors:** mapped to actionable messages (404/403/429/451/5xx/timeout) and
  returned as MCP tool errors (`isError: true`), never thrown to the protocol.

**Adding a provider:** write `src/providers/foo.ts` exporting `fooTools` (array of
`tool({...})`), then add it to `PROVIDERS` in `src/providers/index.ts`. See
`PROVIDERS.md` for the full inventory and the key-required expansion roadmap.

### A deliberate non-default

These are data APIs whose consumer is an LLM, so responses are **compact JSON**
(no per-tool Markdown renderer) — optimized for agent context. `structuredContent`
+ truncation cover the best-practice intent (context efficiency) without a lossy
Markdown layer over numeric time series.
