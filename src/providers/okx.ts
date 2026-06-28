import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { tool } from "../lib/tool.js";

/**
 * OKX public market data — no key, and (unlike Binance's fapi, which returns 451
 * to US IPs) reachable from the US. Serves both spot and perpetual-swap
 * "futures" data, so it covers the Crypto and Futures categories.
 * https://www.okx.com/docs-v5/en/
 *
 * Symbols (`instId`): spot looks like "BTC-USDT"; perpetual swap looks like
 * "BTC-USDT-SWAP"; dated futures like "BTC-USDT-240927".
 */
const BASE = "https://www.okx.com/api/v5";

// Minutes are lowercase (1m..30m); hours and up are uppercase (1H, 1D, 1W, 1M).
const BARS = [
  "1m", "3m", "5m", "15m", "30m",
  "1H", "2H", "4H", "6H", "12H",
  "1D", "1W", "1M",
] as const;

interface OkxEnvelope<T> {
  code: string;
  msg: string;
  data: T;
}

/** Call an OKX v5 endpoint and unwrap its {code,msg,data} envelope. */
async function okx<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const res = await httpGet<OkxEnvelope<T>>(`${BASE}${path}`, {
    params: params as Record<string, string | number | boolean | undefined | null>,
  });
  if (res && res.code && res.code !== "0") {
    throw new Error(`OKX error ${res.code}: ${res.msg}`);
  }
  return res.data;
}

export const okxTools = [
  tool({
    name: "crypto_candles",
    title: "Crypto candlesticks (OKX, spot or perp)",
    description:
      "OHLCV candlesticks for a crypto instrument. Use spot ids like 'BTC-USDT' " +
      "or perpetual-swap ids like 'BTC-USDT-SWAP'. Rows: " +
      "[ts, open, high, low, close, vol, volCcy, volCcyQuote, confirm].",
    inputSchema: {
      instId: z.string().describe("OKX instrument id, e.g. BTC-USDT or BTC-USDT-SWAP"),
      bar: z.enum(BARS).default("1H"),
      limit: z.number().int().min(1).max(300).default(100),
    },
    handler: ({ instId, bar, limit }) =>
      okx(`/market/candles`, { instId: instId.toUpperCase(), bar, limit }),
  }),

  tool({
    name: "crypto_ticker",
    title: "Crypto ticker (OKX)",
    description:
      "Latest ticker for one instrument: last price, 24h high/low/volume, " +
      "bid/ask. Works for spot and swap ids.",
    inputSchema: {
      instId: z.string().describe("e.g. BTC-USDT or BTC-USDT-SWAP"),
    },
    handler: ({ instId }) => okx(`/market/ticker`, { instId: instId.toUpperCase() }),
  }),

  tool({
    name: "crypto_orderbook",
    title: "Crypto order book (OKX)",
    description: "Current bids/asks for an instrument.",
    inputSchema: {
      instId: z.string().describe("e.g. BTC-USDT-SWAP"),
      depth: z.number().int().min(1).max(400).default(20).describe("Levels per side"),
    },
    handler: ({ instId, depth }) =>
      okx(`/market/books`, { instId: instId.toUpperCase(), sz: depth }),
  }),

  tool({
    name: "crypto_funding_rate",
    title: "Crypto funding rate (OKX, perps)",
    description:
      "Current funding rate + next funding time for a perpetual swap. Set " +
      "`history: true` for recent historical funding rates.",
    inputSchema: {
      instId: z.string().describe("Perpetual swap id, e.g. BTC-USDT-SWAP"),
      history: z.boolean().default(false),
      limit: z.number().int().min(1).max(100).default(20).describe("Only with history"),
    },
    handler: ({ instId, history, limit }) =>
      history
        ? okx(`/public/funding-rate-history`, { instId: instId.toUpperCase(), limit })
        : okx(`/public/funding-rate`, { instId: instId.toUpperCase() }),
  }),

  tool({
    name: "crypto_open_interest",
    title: "Crypto open interest (OKX)",
    description: "Open interest for a swap/futures instrument (or all of an instType).",
    inputSchema: {
      instType: z.enum(["SWAP", "FUTURES", "OPTION"]).default("SWAP"),
      instId: z.string().optional().describe("e.g. BTC-USDT-SWAP. Omit for all of instType."),
    },
    handler: ({ instType, instId }) =>
      okx(`/public/open-interest`, { instType, instId: instId?.toUpperCase() }),
  }),

  tool({
    name: "crypto_mark_price",
    title: "Crypto mark price (OKX)",
    description: "Mark price for a swap/futures instrument (or all of an instType).",
    inputSchema: {
      instType: z.enum(["SWAP", "FUTURES", "OPTION"]).default("SWAP"),
      instId: z.string().optional().describe("e.g. BTC-USDT-SWAP. Omit for all of instType."),
    },
    handler: ({ instType, instId }) =>
      okx(`/public/mark-price`, { instType, instId: instId?.toUpperCase() }),
  }),

  tool({
    name: "crypto_recent_trades",
    title: "Crypto recent trades (OKX)",
    description:
      "Most recent public trades for an instrument: price, size, side, trade id, " +
      "timestamp. Works for spot and swap ids. " +
      'Example: { instId: "BTC-USDT", limit: 50 }',
    inputSchema: {
      instId: z.string().describe("e.g. BTC-USDT or BTC-USDT-SWAP"),
      limit: z.number().int().min(1).max(500).default(100),
    },
    handler: ({ instId, limit }) =>
      okx(`/market/trades`, { instId: instId.toUpperCase(), limit }),
  }),

  tool({
    name: "crypto_all_tickers",
    title: "All crypto tickers for an instType (OKX)",
    description:
      "Latest tickers for every instrument of an instType in one call — last price, " +
      "24h high/low/volume, bid/ask. Use for market-wide scans. " +
      'Example: { instType: "SPOT" }',
    inputSchema: {
      instType: z.enum(["SPOT", "SWAP", "FUTURES"]).default("SPOT"),
    },
    handler: ({ instType }) => okx(`/market/tickers`, { instType }),
  }),

  tool({
    name: "crypto_index_candles",
    title: "Crypto index candlesticks (OKX)",
    description:
      "OHLC candlesticks for an OKX index (not a tradable instrument). Use index " +
      "ids of the form 'BTC-USD' or 'ETH-USD'. Rows: [ts, open, high, low, close, confirm]. " +
      'Example: { instId: "BTC-USD", bar: "1H", limit: 100 }',
    inputSchema: {
      instId: z.string().describe("Index id, e.g. BTC-USD or ETH-USD"),
      bar: z.enum(BARS).default("1H"),
      limit: z.number().int().min(1).max(100).default(100),
    },
    handler: ({ instId, bar, limit }) =>
      okx(`/market/index-candles`, { instId: instId.toUpperCase(), bar, limit }),
  }),

  tool({
    name: "crypto_price_limit",
    title: "Crypto price limit (OKX, derivatives)",
    description:
      "Highest buy and lowest sell limit prices currently allowed for a " +
      "swap/futures instrument. " +
      'Example: { instId: "BTC-USDT-SWAP" }',
    inputSchema: {
      instId: z.string().describe("Derivative id, e.g. BTC-USDT-SWAP"),
    },
    handler: ({ instId }) =>
      okx(`/public/price-limit`, { instId: instId.toUpperCase() }),
  }),

  tool({
    name: "crypto_long_short_ratio",
    title: "Crypto long/short account ratio (OKX rubik)",
    description:
      "Time series of the long/short account ratio for a currency's contracts " +
      "(market sentiment). Rows: [ts, longShortRatio]. " +
      'Example: { ccy: "BTC", period: "5m" }',
    inputSchema: {
      ccy: z.string().describe("Underlying currency, e.g. BTC, ETH"),
      period: z.enum(["5m", "1H", "1D"]).default("5m").describe("Sampling period"),
    },
    handler: ({ ccy, period }) =>
      okx(`/rubik/stat/contracts/long-short-account-ratio`, {
        ccy: ccy.toUpperCase(),
        period,
      }),
  }),

  tool({
    name: "crypto_list_instruments",
    title: "List crypto instruments (OKX)",
    description:
      "List tradable instruments for an instType (SPOT, SWAP, FUTURES, OPTION). " +
      "Use to discover valid instId values.",
    inputSchema: {
      instType: z.enum(["SPOT", "SWAP", "FUTURES", "OPTION"]).default("SWAP"),
    },
    handler: ({ instType }) => okx(`/public/instruments`, { instType }),
  }),
];
