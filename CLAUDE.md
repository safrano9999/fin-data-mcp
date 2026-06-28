# fin-data-mcp-server — agent guide

A standalone **Model Context Protocol** server exposing free financial market data
across 13 categories. Lives inside the `cc-stack` workspace but is its own Node
package with its own deps. **83 no-key tools (15 providers)** always on; optional
free keys unlock 7 more providers (up to 110 tools / 22 providers).

## Stack / runtime

- **TypeScript + ESM** (`"type": "module"`, `module: NodeNext`). Relative imports
  MUST use the `.js` extension (e.g. `import { httpGet } from "../lib/http.js"`).
- **`@modelcontextprotocol/sdk`** over **stdio** (`StdioServerTransport`).
- **Zod v3** (`^3.25`) — pinned for MCP SDK `inputSchema` (ZodRawShape) compat.
  This deliberately diverges from the parent repo's Zod 4 convention; do **not**
  "upgrade" it without checking the SDK still accepts the raw-shape schemas.
- No `axios`/extra HTTP libs — uses native `fetch` via `src/lib/http.ts`.

## Commands

```bash
npm run build        # tsc → dist/   (run before considering work done)
npm run dev          # tsx watch src/index.ts
npm start            # node dist/index.js (stdio)
npx tsc --noEmit     # typecheck (strict + noUncheckedIndexedAccess)
npx tsx scripts/smoke.ts        # core no-key endpoints
npx tsx scripts/smoke-full.ts   # broad sample incl. expanded + chained discovery
npx tsx scripts/mcp-test.ts     # MCP handshake: tools/list, resource, a tool call
```

## Architecture

```
src/
  index.ts        # stdio entry (never write to stdout — logs go to stderr)
  server.ts       # createServer(): instructions, registers tools w/ annotations,
                  #   structuredContent + CHARACTER_LIMIT truncation, error mapping,
                  #   the fin-data://catalog resource
  config.ts       # all env config (all optional)
  constants.ts    # CHARACTER_LIMIT (~25k), DEFAULT_PAGE_SIZE
  lib/
    http.ts       # httpGet(url, {params,headers,accept,retries,timeoutMs}); HttpError;
                  #   formatHttpError() → actionable messages; sends Accept-Language: en
    cache.ts      # cached(key, fn, ttlMs) in-memory TTL
    tool.ts       # ToolDef + tool() helper (applies read-only annotations centrally)
  providers/
    index.ts      # PROVIDERS registry → allTools (enabled only) + catalog
    <provider>.ts # one file per source; exports `<name>Tools: ToolDef[]`
```

## How tools work

- Each provider file exports an array of `tool({...})`. The `tool()` helper applies
  default annotations (`readOnlyHint:true, destructiveHint:false, idempotentHint:true,
  openWorldHint:true`) — **don't set annotations per-tool** unless overriding.
- Handlers **return raw parsed JSON**. `server.ts` does the formatting:
  serializes, attaches `structuredContent`, and truncates anything over
  `CHARACTER_LIMIT` with a "narrow your query" note. Don't pre-format in handlers.
- Errors: throw a plain `Error` (or let `HttpError` propagate). `server.ts` catches
  and runs it through `formatHttpError`, returning an MCP tool error
  (`isError:true`) — never a thrown protocol error.
- `inputSchema` is a **Zod raw shape** (object of zod schemas), not `z.object(...)`.

## Adding a provider

1. `src/providers/foo.ts`: `export const fooTools = [ tool({ name, title, description,
   inputSchema, handler }) ]`. Use `httpGet` from `../lib/http.js`. End descriptions
   with an `Example: { ... }` line. snake_case names with a domain prefix.
2. Register in `src/providers/index.ts` `PROVIDERS`:
   - No-key: `enabled: true`.
   - **Keyed: `enabled: !!config.fooKey, keyEnv: "FOO_API_KEY"`** — this is the
     load-bearing bit. Keyed tools register ONLY when the key is set, so they never
     pollute `tools/list` without a key (they stay visible in the catalog as
     "set X to enable"). Also add a `requireKey()` guard in the handler as defense.
3. Add the key to `config.ts` + `.env.example`. Run build + a curl check.

## Verification discipline (non-negotiable)

**Verify every endpoint returns HTTP 200 with a live `curl` before adding a tool.**
This project was built by probing real responses, not from memory — several
"documented" endpoints had drifted. For keyed APIs we can't fully call, confirm the
base URL returns an auth error (401/403/400 "key required"), NOT a 404.

## Hard-won gotchas (don't regress these)

- **Yahoo**: send a *minimal* `User-Agent: Mozilla/5.0`. A full Chrome UA trips its
  bot filter → 429. `yahoo_quote_summary`/`yahoo_options_chain` need the cookie+crumb
  handshake (already implemented); `yahoo_quote` derives from the chart endpoint to
  avoid it. Failover query1 → query2.
- **Crypto = OKX, not Binance**: `fapi.binance.com` returns **451 to US IPs**. OKX is
  no-key, US-OK, spot + perps. Don't reintroduce Binance.
- **OECD**: undici defaults to `Accept-Language: *`, which 500s OECD's SDMX parser
  (`languageTag1`). `http.ts` sends `Accept-Language: en` globally — keep it. OECD
  also needs `Accept: application/vnd.sdmx.data+json` (not `application/json`).
- **SEC EDGAR**: requires a descriptive `User-Agent` (`SEC_USER_AGENT`) or 403.
- **Cboe**: equities use the plain ticker; indices use an underscore prefix
  (`_SPX`, `_VIX`, `_DJI`, `_NDX`).
- **Stock Watcher**: the S3 buckets and first GitHub mirror died; House feed now
  points at `TattooedHead/house-stock-watcher-data`. Override via env if it moves.
- **Alpha Vantage**: returns HTTP 200 even on errors/limits — `avGet` inspects
  `Error Message`/`Note`/`Information` and throws. (It also serves real data for any
  key string on some endpoints, so a bad-key "success" is expected.)
- **Quiver**: header auth `Authorization: Token <key>`.

## Conventions

- Strict TS, no `any` (use `unknown`/proper types). Optional chaining + nullish
  coalescing. `noUncheckedIndexedAccess` is on — guard array/destructure access.
- Reuse `httpGet`, `cached`, and per-file helpers (`okx()` envelope, SEC `headers()`/
  `resolveCik`, Yahoo `yahooGet`/`getCrumbAndCookie`). Don't duplicate.
- Responses are **compact JSON** (no per-tool Markdown) — deliberate: the consumer
  is an LLM, and `structuredContent` + truncation cover context efficiency.
