import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { tool } from "../lib/tool.js";

/**
 * Polymarket — large crypto-settled prediction markets. Public read APIs:
 * Gamma (metadata) + CLOB (order book / price history). No key for reads.
 * https://docs.polymarket.com/
 */
const GAMMA = "https://gamma-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";

export const polymarketTools = [
  tool({
    name: "polymarket_list_markets",
    title: "List Polymarket markets (Gamma)",
    description:
      "List markets with metadata (question, outcomes, prices, volume, liquidity, " +
      "clobTokenIds). Filter by active/closed. Use clobTokenIds with the price " +
      "history / order book tools below.",
    inputSchema: {
      limit: z.number().int().min(1).max(500).default(50),
      offset: z.number().int().min(0).default(0),
      active: z.boolean().optional(),
      closed: z.boolean().optional(),
      order: z.string().optional().describe("Field to order by, e.g. 'volume'"),
      ascending: z.boolean().optional(),
      slug: z.string().optional().describe("Filter by market slug"),
    },
    handler: ({ limit, offset, active, closed, order, ascending, slug }) =>
      httpGet(`${GAMMA}/markets`, {
        params: { limit, offset, active, closed, order, ascending, slug },
      }),
  }),

  tool({
    name: "polymarket_list_events",
    title: "List Polymarket events (Gamma)",
    description:
      "List events (groups of related markets), e.g. an election with many " +
      "candidate markets. Filter by active/closed/tag/slug.",
    inputSchema: {
      limit: z.number().int().min(1).max(500).default(50),
      offset: z.number().int().min(0).default(0),
      active: z.boolean().optional(),
      closed: z.boolean().optional(),
      order: z.string().optional(),
      slug: z.string().optional(),
      tag: z.string().optional(),
    },
    handler: ({ limit, offset, active, closed, order, slug, tag }) =>
      httpGet(`${GAMMA}/events`, {
        params: { limit, offset, active, closed, order, slug, tag },
      }),
  }),

  tool({
    name: "polymarket_get_market",
    title: "Get a Polymarket market (Gamma)",
    description:
      "Full detail for a single market. Pass `id` (numeric Gamma id) to fetch by " +
      "id, or `slug` to look it up by URL slug. Returns question, outcomes, " +
      "conditionId, clobTokenIds, prices, volume and liquidity. " +
      'Example: { id: "540817" }',
    inputSchema: {
      id: z.string().optional().describe("Numeric Gamma market id"),
      slug: z.string().optional().describe("Market URL slug"),
    },
    handler: ({ id, slug }) =>
      slug
        ? httpGet(`${GAMMA}/markets`, { params: { slug } })
        : httpGet(`${GAMMA}/markets/${id}`),
  }),

  tool({
    name: "polymarket_get_event",
    title: "Get a Polymarket event (Gamma)",
    description:
      "Full detail for a single event (a group of related markets). Pass `id` " +
      "(numeric Gamma id) to fetch by id, or `slug` to look it up by URL slug. " +
      "Includes nested markets. " +
      'Example: { slug: "kraken-ipo-in-2025" }',
    inputSchema: {
      id: z.string().optional().describe("Numeric Gamma event id"),
      slug: z.string().optional().describe("Event URL slug"),
    },
    handler: ({ id, slug }) =>
      slug
        ? httpGet(`${GAMMA}/events`, { params: { slug } })
        : httpGet(`${GAMMA}/events/${id}`),
  }),

  tool({
    name: "polymarket_price_history",
    title: "Polymarket price history (CLOB)",
    description:
      "Time series of an outcome's price. `market` is a CLOB token id (from a " +
      "market's clobTokenIds). Use `interval` (1m/1h/6h/1d/1w/max) OR explicit " +
      "startTs/endTs. `fidelity` is resolution in minutes.",
    inputSchema: {
      market: z.string().describe("CLOB token id (NOT the condition id)"),
      interval: z.enum(["1m", "1h", "6h", "1d", "1w", "max"]).optional(),
      startTs: z.number().int().optional().describe("Unix epoch seconds"),
      endTs: z.number().int().optional().describe("Unix epoch seconds"),
      fidelity: z.number().int().min(1).optional().describe("Resolution in minutes"),
    },
    handler: ({ market, interval, startTs, endTs, fidelity }) =>
      httpGet(`${CLOB}/prices-history`, {
        params: { market, interval, startTs, endTs, fidelity },
      }),
  }),

  tool({
    name: "polymarket_order_book",
    title: "Polymarket order book (CLOB)",
    description:
      "Live order book (bids/asks) for an outcome token. `token_id` is a CLOB " +
      "token id from a market's clobTokenIds.",
    inputSchema: {
      token_id: z.string().describe("CLOB token id"),
    },
    handler: ({ token_id }) => httpGet(`${CLOB}/book`, { params: { token_id } }),
  }),

  tool({
    name: "polymarket_midpoint",
    title: "Polymarket midpoint price (CLOB)",
    description:
      "Current midpoint (mid of best bid/ask) for an outcome token. `token_id` " +
      "is a CLOB token id from a market's clobTokenIds. " +
      'Example: { token_id: "98022490269692409998126496127597032490334070080325855126491859374983463996227" }',
    inputSchema: {
      token_id: z.string().describe("CLOB token id"),
    },
    handler: ({ token_id }) =>
      httpGet(`${CLOB}/midpoint`, { params: { token_id } }),
  }),

  tool({
    name: "polymarket_last_trade_price",
    title: "Polymarket last trade price (CLOB)",
    description:
      "Most recent trade price and side for an outcome token. `token_id` is a " +
      "CLOB token id from a market's clobTokenIds. " +
      'Example: { token_id: "98022490269692409998126496127597032490334070080325855126491859374983463996227" }',
    inputSchema: {
      token_id: z.string().describe("CLOB token id"),
    },
    handler: ({ token_id }) =>
      httpGet(`${CLOB}/last-trade-price`, { params: { token_id } }),
  }),

  tool({
    name: "polymarket_spread",
    title: "Polymarket bid-ask spread (CLOB)",
    description:
      "Current bid-ask spread for an outcome token. `token_id` is a CLOB token " +
      "id from a market's clobTokenIds. " +
      'Example: { token_id: "98022490269692409998126496127597032490334070080325855126491859374983463996227" }',
    inputSchema: {
      token_id: z.string().describe("CLOB token id"),
    },
    handler: ({ token_id }) =>
      httpGet(`${CLOB}/spread`, { params: { token_id } }),
  }),
];
