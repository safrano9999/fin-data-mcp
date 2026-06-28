import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { tool } from "../lib/tool.js";

/**
 * Yahoo Finance (unofficial) — global equities, indices, ETFs, FX, crypto and
 * options. No key, but IP rate-limited and unofficial (may break). Requires a
 * browser-like User-Agent. Covers categories 1 (Stocks), 2 (Indices via ^GSPC,
 * ^DJI, ^IXIC...) and 3 (Options).
 */
const Q1 = "https://query1.finance.yahoo.com";
const HOSTS = [
  "https://query1.finance.yahoo.com",
  "https://query2.finance.yahoo.com",
];

// A minimal UA passes; a full Chrome UA string trips Yahoo's bot detection (429).
const yahooHeaders = () => ({ "User-Agent": "Mozilla/5.0" });

/**
 * Yahoo is unofficial and IP-throttled (429). Try query1, then query2, each with
 * a few retries/backoff, before giving up.
 */
async function yahooGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
  headers: Record<string, string> = yahooHeaders(),
): Promise<T> {
  let lastErr: unknown;
  for (const host of HOSTS) {
    try {
      return await httpGet<T>(`${host}${path}`, { headers, params, retries: 3 });
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error(`Yahoo request failed: ${path}`);
}

/**
 * Yahoo's quote/options endpoints now require a cookie + matching crumb. Fetch a
 * cookie from fc.yahoo.com, exchange it for a crumb, and cache both briefly.
 */
let crumbCache: { crumb: string; cookie: string; expires: number } | null = null;

async function getCrumbAndCookie(): Promise<{ crumb: string; cookie: string }> {
  const now = Date.now();
  if (crumbCache && crumbCache.expires > now) return crumbCache;

  const cookieRes = await fetch("https://fc.yahoo.com", {
    headers: yahooHeaders(),
  });
  const setCookies = cookieRes.headers.getSetCookie?.() ?? [];
  const cookie = setCookies.map((c) => c.split(";")[0]).join("; ");

  const crumbRes = await fetch(`${Q1}/v1/test/getcrumb`, {
    headers: { ...yahooHeaders(), Cookie: cookie },
  });
  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.includes("<")) {
    throw new Error(
      "Could not obtain a Yahoo crumb (Yahoo may be blocking automated access " +
        "from this IP). Use yahoo_chart, which does not require a crumb.",
    );
  }
  crumbCache = { crumb, cookie, expires: now + 30 * 60 * 1000 };
  return crumbCache;
}

const RANGES = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"] as const;
const INTERVALS = ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"] as const;

export const yahooTools = [
  tool({
    name: "yahoo_chart",
    title: "Yahoo price history (stocks / indices / ETFs / FX / crypto)",
    description:
      "OHLCV price history + metadata for any Yahoo symbol. Works for equities " +
      "(AAPL), indices (^GSPC, ^DJI, ^IXIC, ^VIX), ETFs (SPY), FX (EURUSD=X) and " +
      "crypto (BTC-USD). Use this for both stock and index data.",
    inputSchema: {
      symbol: z.string().describe("Yahoo symbol, e.g. AAPL, ^GSPC, SPY, BTC-USD"),
      range: z.enum(RANGES).default("1mo").describe("Look-back window"),
      interval: z.enum(INTERVALS).default("1d").describe("Candle size"),
    },
    handler: ({ symbol, range, interval }) =>
      yahooGet(`/v8/finance/chart/${encodeURIComponent(symbol)}`, { range, interval }),
  }),

  tool({
    name: "yahoo_quote",
    title: "Yahoo latest quote",
    description:
      "Latest price snapshot for a symbol derived from the chart endpoint " +
      "(regular market price, previous close, day range, exchange, currency). " +
      "Avoids the crumb-gated quote endpoint.",
    inputSchema: {
      symbol: z.string().describe("Yahoo symbol, e.g. AAPL"),
    },
    handler: async ({ symbol }) => {
      const data = await yahooGet<{
        chart: { result?: Array<{ meta: Record<string, unknown> }>; error?: unknown };
      }>(`/v8/finance/chart/${encodeURIComponent(symbol)}`, {
        range: "1d",
        interval: "1d",
      });
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) throw new Error(`No quote data for '${symbol}'.`);
      return meta;
    },
  }),

  tool({
    name: "yahoo_search",
    title: "Yahoo symbol search",
    description:
      "Search Yahoo Finance for tickers/companies by name or symbol. Returns " +
      "matching quotes and related news. Use to resolve a company name to a symbol.",
    inputSchema: {
      query: z.string().describe("Company name or ticker fragment"),
      quotesCount: z.number().int().min(1).max(20).default(10),
    },
    handler: ({ query, quotesCount }) =>
      yahooGet(`/v1/finance/search`, { q: query, quotesCount, newsCount: 0 }),
  }),

  tool({
    name: "yahoo_quote_summary",
    title: "Yahoo quote summary (fundamentals / profile / statistics)",
    description:
      "Rich per-symbol fundamentals via the crumb-gated quoteSummary endpoint. " +
      "Pass a comma-separated `modules` list. Common modules: price, summaryDetail, " +
      "financialData, defaultKeyStatistics, assetProfile, earnings, " +
      "recommendationTrend, balanceSheetHistory, incomeStatementHistory, " +
      "cashflowStatementHistory, calendarEvents, earningsHistory, " +
      "institutionOwnership, majorHoldersBreakdown. " +
      'Example: { symbol: "AAPL", modules: "price,summaryDetail,financialData,defaultKeyStatistics,assetProfile,earnings,recommendationTrend" }',
    inputSchema: {
      symbol: z.string().describe("Yahoo symbol, e.g. AAPL"),
      modules: z
        .string()
        .default("price,summaryDetail,financialData,defaultKeyStatistics,assetProfile")
        .describe("Comma-separated quoteSummary modules"),
    },
    handler: async ({ symbol, modules }) => {
      const { crumb, cookie } = await getCrumbAndCookie();
      return httpGet(`${Q1}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`, {
        headers: { ...yahooHeaders(), Cookie: cookie },
        params: { modules, crumb },
      });
    },
  }),

  tool({
    name: "yahoo_recommendations",
    title: "Yahoo similar / recommended symbols",
    description:
      "Symbols Yahoo considers similar to the given one, each with a similarity " +
      "score. Use for peer/comparable discovery. Does not require a crumb. " +
      'Example: { symbol: "AAPL" }',
    inputSchema: {
      symbol: z.string().describe("Yahoo symbol, e.g. AAPL"),
    },
    handler: ({ symbol }) =>
      yahooGet(`/v6/finance/recommendationsbysymbol/${encodeURIComponent(symbol)}`),
  }),

  tool({
    name: "yahoo_spark",
    title: "Yahoo multi-symbol mini price series",
    description:
      "Compact close-price series for one or more symbols in a single call — " +
      "handy for sparklines or side-by-side comparisons. " +
      'Example: { symbols: "AAPL,MSFT,SPY", range: "1mo", interval: "1d" }',
    inputSchema: {
      symbols: z.string().describe("Comma-separated Yahoo symbols, e.g. AAPL,MSFT,SPY"),
      range: z.enum(RANGES).default("1mo").describe("Look-back window"),
      interval: z.enum(INTERVALS).default("1d").describe("Candle size"),
    },
    handler: ({ symbols, range, interval }) =>
      yahooGet(`/v8/finance/spark`, { symbols, range, interval }),
  }),

  tool({
    name: "yahoo_options_chain",
    title: "Yahoo options chain",
    description:
      "Options chain for a symbol: available expirations plus calls/puts (strikes, " +
      "bid/ask, IV, OI, volume). Pass a Unix epoch-seconds `expiration` for a " +
      "specific date, or omit for the nearest expiry.",
    inputSchema: {
      symbol: z.string().describe("Underlying symbol, e.g. AAPL"),
      expiration: z
        .number()
        .int()
        .optional()
        .describe("Expiration as Unix epoch seconds (from the first call's result)"),
    },
    handler: async ({ symbol, expiration }) => {
      const { crumb, cookie } = await getCrumbAndCookie();
      return httpGet(`${Q1}/v7/finance/options/${encodeURIComponent(symbol)}`, {
        headers: { ...yahooHeaders(), Cookie: cookie },
        params: { date: expiration, crumb },
      });
    },
  }),
];
