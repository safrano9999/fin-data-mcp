import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { tool } from "../lib/tool.js";

/**
 * Manifold Markets — play-money prediction markets. No key for reads.
 * https://docs.manifold.markets/api
 */
const BASE = "https://api.manifold.markets/v0";

export const manifoldTools = [
  tool({
    name: "manifold_search_markets",
    title: "Search Manifold prediction markets",
    description:
      "Full-text search Manifold markets by term. Returns probability forecasts " +
      "for crowd-sourced predictions across politics, economics, tech, etc.",
    inputSchema: {
      term: z.string().describe("Search query"),
      limit: z.number().int().min(1).max(100).default(20),
      sort: z
        .enum(["score", "newest", "liquidity", "close-date", "most-popular"])
        .optional(),
    },
    handler: ({ term, limit, sort }) =>
      httpGet(`${BASE}/search-markets`, { params: { term, limit, sort } }),
  }),

  tool({
    name: "manifold_get_market",
    title: "Get a Manifold market by id or slug",
    description:
      "Full detail for a single market including current probability, pool, and " +
      "resolution status. Provide either the market id or its URL slug.",
    inputSchema: {
      id: z.string().optional().describe("Market id"),
      slug: z.string().optional().describe("URL slug (the part after /<user>/)"),
    },
    handler: ({ id, slug }) => {
      if (id) return httpGet(`${BASE}/market/${id}`);
      if (slug) return httpGet(`${BASE}/slug/${slug}`);
      throw new Error("Provide either `id` or `slug`.");
    },
  }),

  tool({
    name: "manifold_list_markets",
    title: "List recent Manifold markets",
    description: "List markets in reverse-chronological order (newest first).",
    inputSchema: {
      limit: z.number().int().min(1).max(1000).default(50),
    },
    handler: ({ limit }) => httpGet(`${BASE}/markets`, { params: { limit } }),
  }),

  tool({
    name: "manifold_get_user",
    title: "Get a Manifold user",
    description:
      "Public profile for a Manifold user: balance, profit, market/trade counts, " +
      "bio and creation date. Identify by username or by user id. " +
      "Example: { username: 'DZC' }",
    inputSchema: {
      username: z.string().optional().describe("Handle, e.g. DZC (the @username)"),
      id: z.string().optional().describe("User id (use instead of username)"),
    },
    handler: ({ username, id }) => {
      if (username) return httpGet(`${BASE}/user/${username}`);
      if (id) return httpGet(`${BASE}/user/by-id/${id}`);
      throw new Error("Provide either `username` or `id`.");
    },
  }),

  tool({
    name: "manifold_market_positions",
    title: "Get Manifold market positions",
    description:
      "Per-user positions (holdings, shares, profit) for a single market. Reveals " +
      "who is on each side and how concentrated the order book is. " +
      "Example: { id: 'ZtAEnyhO29' }",
    inputSchema: {
      id: z.string().describe("Market (contract) id"),
    },
    handler: ({ id }) => httpGet(`${BASE}/market/${id}/positions`),
  }),

  tool({
    name: "manifold_bets",
    title: "List Manifold bets",
    description:
      "Recent bets (trades), newest first. Filter by a single market via " +
      "`contractId`, by a trader via `username`, or both. " +
      "Example: { contractId: 'ZtAEnyhO29', limit: 50 }",
    inputSchema: {
      contractId: z.string().optional().describe("Market (contract) id to filter by"),
      username: z.string().optional().describe("Trader handle to filter by"),
      limit: z.number().int().min(1).max(1000).default(100),
    },
    handler: ({ contractId, username, limit }) =>
      httpGet(`${BASE}/bets`, { params: { contractId, username, limit } }),
  }),

  tool({
    name: "manifold_groups",
    title: "List Manifold groups",
    description:
      "List Manifold groups (topics/categories) markets are organized under, with " +
      "member and market counts. " +
      "Example: { limit: 50 }",
    inputSchema: {
      limit: z.number().int().min(1).max(1000).optional().describe("Max groups to return"),
      beforeTime: z
        .number()
        .int()
        .optional()
        .describe("Unix ms; return groups created before this time (pagination)"),
    },
    handler: ({ limit, beforeTime }) =>
      httpGet(`${BASE}/groups`, { params: { limit, beforeTime } }),
  }),

  tool({
    name: "manifold_comments",
    title: "List Manifold market comments",
    description:
      "Comments on a single market — useful for crowd reasoning and sentiment behind " +
      "a forecast. " +
      "Example: { contractId: 'ZtAEnyhO29' }",
    inputSchema: {
      contractId: z.string().describe("Market (contract) id"),
    },
    handler: ({ contractId }) =>
      httpGet(`${BASE}/comments`, { params: { contractId } }),
  }),
];
