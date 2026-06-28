import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { tool } from "../lib/tool.js";

/**
 * Kalshi — CFTC-regulated US event/prediction markets. Read endpoints are
 * fully public (no key); only /portfolio trading needs signed auth.
 * https://docs.kalshi.com/
 */
const BASE = "https://api.elections.kalshi.com/trade-api/v2";

export const kalshiTools = [
  tool({
    name: "kalshi_list_markets",
    title: "List Kalshi markets",
    description:
      "List regulated event markets (politics, macro, financials). Filterable by " +
      "status and parent event/series. Returns yes/no prices, volume, expirations.",
    inputSchema: {
      limit: z.number().int().min(1).max(1000).default(50),
      status: z.enum(["unopened", "open", "closed", "settled"]).optional(),
      event_ticker: z.string().optional().describe("Filter to one event"),
      series_ticker: z.string().optional().describe("Filter to one series"),
      cursor: z.string().optional().describe("Pagination cursor"),
    },
    handler: ({ limit, status, event_ticker, series_ticker, cursor }) =>
      httpGet(`${BASE}/markets`, {
        params: { limit, status, event_ticker, series_ticker, cursor },
      }),
  }),

  tool({
    name: "kalshi_get_market",
    title: "Get a Kalshi market",
    description: "Full detail for a single market by ticker.",
    inputSchema: {
      ticker: z.string().describe("Market ticker"),
    },
    handler: ({ ticker }) => httpGet(`${BASE}/markets/${ticker}`),
  }),

  tool({
    name: "kalshi_orderbook",
    title: "Kalshi market order book",
    description: "Current yes/no order book for a market ticker.",
    inputSchema: {
      ticker: z.string().describe("Market ticker"),
      depth: z.number().int().min(1).max(100).optional(),
    },
    handler: ({ ticker, depth }) =>
      httpGet(`${BASE}/markets/${ticker}/orderbook`, { params: { depth } }),
  }),

  tool({
    name: "kalshi_list_events",
    title: "List Kalshi events",
    description: "List events (groups of related markets). Optionally include nested markets.",
    inputSchema: {
      limit: z.number().int().min(1).max(200).default(50),
      status: z.enum(["unopened", "open", "closed", "settled"]).optional(),
      with_nested_markets: z.boolean().optional(),
      cursor: z.string().optional(),
    },
    handler: ({ limit, status, with_nested_markets, cursor }) =>
      httpGet(`${BASE}/events`, {
        params: { limit, status, with_nested_markets, cursor },
      }),
  }),

  tool({
    name: "kalshi_get_event",
    title: "Get a Kalshi event",
    description:
      "Full detail for a single event by event ticker. Set `with_nested_markets` " +
      "to include the event's child markets inline. " +
      'Example: { event_ticker: "KXELONMARS-99", with_nested_markets: true }',
    inputSchema: {
      event_ticker: z.string().describe("Event ticker"),
      with_nested_markets: z.boolean().optional(),
    },
    handler: ({ event_ticker, with_nested_markets }) =>
      httpGet(`${BASE}/events/${event_ticker}`, {
        params: { with_nested_markets },
      }),
  }),

  tool({
    name: "kalshi_get_series",
    title: "Get a Kalshi series",
    description:
      "Full detail for a single market series by series ticker (rules, category, " +
      "frequency, contract terms). " +
      'Example: { series_ticker: "KXELONMARS" }',
    inputSchema: {
      series_ticker: z.string().describe("Series ticker"),
    },
    handler: ({ series_ticker }) =>
      httpGet(`${BASE}/series/${series_ticker}`),
  }),

  tool({
    name: "kalshi_trades",
    title: "Kalshi public trade history",
    description:
      "Public trade history (executed prints) across the exchange or for one " +
      "market. Filter by `ticker`; page with `cursor`. " +
      'Example: { ticker: "KXELONMARS-99-Y", limit: 50 }',
    inputSchema: {
      ticker: z.string().optional().describe("Filter to one market ticker"),
      limit: z.number().int().min(1).max(1000).default(50),
      cursor: z.string().optional().describe("Pagination cursor"),
    },
    handler: ({ ticker, limit, cursor }) =>
      httpGet(`${BASE}/markets/trades`, { params: { ticker, limit, cursor } }),
  }),

  tool({
    name: "kalshi_exchange_status",
    title: "Kalshi exchange status",
    description:
      "Current exchange and trading availability flags. " +
      "Example: {}",
    inputSchema: {},
    handler: () => httpGet(`${BASE}/exchange/status`),
  }),

  tool({
    name: "kalshi_exchange_schedule",
    title: "Kalshi exchange schedule",
    description:
      "Standard trading hours and any maintenance windows for the exchange. " +
      "Example: {}",
    inputSchema: {},
    handler: () => httpGet(`${BASE}/exchange/schedule`),
  }),

  tool({
    name: "kalshi_list_series",
    title: "List Kalshi series",
    description: "List market series, optionally filtered by category (e.g. Economics).",
    inputSchema: {
      category: z.string().optional().describe("e.g. Economics, Politics, Financials"),
    },
    handler: ({ category }) => httpGet(`${BASE}/series`, { params: { category } }),
  }),

  tool({
    name: "kalshi_candlesticks",
    title: "Kalshi market candlesticks",
    description:
      "Historical price candlesticks for a market within a series. Provide Unix " +
      "epoch-seconds start/end and a period interval in minutes (1, 60, or 1440).",
    inputSchema: {
      series_ticker: z.string().describe("Parent series ticker"),
      ticker: z.string().describe("Market ticker"),
      start_ts: z.number().int().describe("Start, Unix epoch seconds"),
      end_ts: z.number().int().describe("End, Unix epoch seconds"),
      period_interval: z
        .union([z.literal(1), z.literal(60), z.literal(1440)])
        .default(60)
        .describe("Candle size in minutes"),
    },
    handler: ({ series_ticker, ticker, start_ts, end_ts, period_interval }) =>
      httpGet(
        `${BASE}/series/${series_ticker}/markets/${ticker}/candlesticks`,
        { params: { start_ts, end_ts, period_interval } },
      ),
  }),
];
