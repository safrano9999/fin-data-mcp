import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { cached } from "../lib/cache.js";
import { tool } from "../lib/tool.js";

/**
 * Cboe delayed quotes — a no-key, US-accessible backend for equities, indices
 * and options. Independent of Yahoo (different operator/CDN), so it's the
 * primary fallback when Yahoo is throttled, and a second independent options
 * source. Data is ~15-min delayed. https://www.cboe.com/
 *
 * Symbols: equities/ETFs use the plain ticker ("AAPL", "SPY"); indices use an
 * underscore prefix ("_SPX", "_VIX", "_DJI", "_NDX").
 */
const BASE = "https://cdn.cboe.com/api/global/delayed_quotes";

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export const cboeTools = [
  tool({
    name: "cboe_quote",
    title: "Cboe delayed quote (stocks / indices)",
    description:
      "Delayed (~15 min) quote snapshot for an equity, ETF, or index from Cboe — " +
      "a no-key backend independent of Yahoo. Returns last/bid/ask, day open/high/" +
      "low/close, previous close, volume, and security metadata.\n\n" +
      "Symbols: tickers as-is (AAPL, SPY); indices with an underscore prefix " +
      "(_SPX, _VIX, _DJI, _NDX).\n" +
      "Example: { symbol: 'AAPL' } or { symbol: '_SPX' }.",
    inputSchema: {
      symbol: z
        .string()
        .min(1)
        .describe("Ticker (AAPL, SPY) or underscore-prefixed index (_SPX, _VIX)"),
    },
    handler: ({ symbol }) =>
      cached(`cboe:quote:${normalizeSymbol(symbol)}`, () =>
        httpGet(`${BASE}/quotes/${normalizeSymbol(symbol)}.json`),
      ),
  }),

  tool({
    name: "cboe_history",
    title: "Cboe daily price history",
    description:
      "Daily OHLCV price history for an equity/ETF/index from Cboe (history can " +
      "extend back ~20 years). No key required. Use as a Yahoo-independent source " +
      "for charts/backtests.\n\n" +
      "Symbols: tickers as-is; indices with an underscore prefix (_SPX).\n" +
      "Example: { symbol: 'SPY' }.",
    inputSchema: {
      symbol: z
        .string()
        .min(1)
        .describe("Ticker or underscore-prefixed index symbol"),
    },
    handler: ({ symbol }) =>
      cached(
        `cboe:hist:${normalizeSymbol(symbol)}`,
        () => httpGet(`${BASE}/charts/historical/${normalizeSymbol(symbol)}.json`),
        15 * 60 * 1000,
      ),
  }),

  tool({
    name: "cboe_options_chain",
    title: "Cboe options chain",
    description:
      "Full options chain for an underlying from Cboe (no key, no crumb) — a " +
      "robust alternative to yahoo_options_chain. Returns every listed option " +
      "(all expirations/strikes) with bid/ask, last, volume, open interest, IV, " +
      "and greeks, plus the underlying quote.\n\n" +
      "Note: the response can be large; filter client-side by expiration/strike.\n" +
      "Example: { symbol: 'AAPL' }.",
    inputSchema: {
      symbol: z.string().min(1).describe("Underlying ticker, e.g. AAPL"),
    },
    handler: ({ symbol }) =>
      cached(
        `cboe:opt:${normalizeSymbol(symbol)}`,
        () => httpGet(`${BASE}/options/${normalizeSymbol(symbol)}.json`),
        5 * 60 * 1000,
      ),
  }),
];
