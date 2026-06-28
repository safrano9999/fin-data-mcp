import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { tool } from "../lib/tool.js";
import { config } from "../config.js";

/**
 * Finnhub — real-time US stock quotes, fundamentals, news, recommendations and
 * insider transactions. Free key required (set FINNHUB_API_KEY); free tier is
 * non-commercial, ~60 calls/min. https://finnhub.io/docs/api
 */
const BASE = "https://finnhub.io/api/v1";

function requireKey(): string {
  if (!config.finnhubApiKey) {
    throw new Error("Finnhub requires a free API key — set FINNHUB_API_KEY (https://finnhub.io/register).");
  }
  return config.finnhubApiKey;
}

function finnhubGet<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
  return httpGet<T>(`${BASE}${path}`, {
    params: { ...params, token: requireKey() } as Record<
      string,
      string | number | boolean | undefined | null
    >,
  });
}

export const finnhubTools = [
  tool({
    name: "finnhub_quote",
    title: "Finnhub real-time quote",
    description:
      "Real-time quote for a US stock: current price, change, high/low/open, " +
      "previous close. Requires FINNHUB_API_KEY.\nExample: { symbol: 'AAPL' }",
    inputSchema: { symbol: z.string().min(1).describe("Ticker, e.g. AAPL") },
    handler: ({ symbol }) => finnhubGet("/quote", { symbol: symbol.toUpperCase() }),
  }),

  tool({
    name: "finnhub_company_profile",
    title: "Finnhub company profile",
    description:
      "Company profile: name, exchange, industry, market cap, shares outstanding, " +
      "IPO date, website. Requires FINNHUB_API_KEY.\nExample: { symbol: 'MSFT' }",
    inputSchema: { symbol: z.string().min(1).describe("Ticker") },
    handler: ({ symbol }) => finnhubGet("/stock/profile2", { symbol: symbol.toUpperCase() }),
  }),

  tool({
    name: "finnhub_company_news",
    title: "Finnhub company news",
    description:
      "Company news articles within a date window. Requires FINNHUB_API_KEY.\n" +
      "Example: { symbol: 'TSLA', from: '2024-06-01', to: '2024-06-07' }",
    inputSchema: {
      symbol: z.string().min(1).describe("Ticker"),
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("YYYY-MM-DD"),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("YYYY-MM-DD"),
    },
    handler: ({ symbol, from, to }) =>
      finnhubGet("/company-news", { symbol: symbol.toUpperCase(), from, to }),
  }),

  tool({
    name: "finnhub_basic_financials",
    title: "Finnhub basic financials & metrics",
    description:
      "Key financial metrics and ratios (margins, valuation multiples, 52w range, " +
      "beta, growth). Requires FINNHUB_API_KEY.\nExample: { symbol: 'AAPL' }",
    inputSchema: {
      symbol: z.string().min(1).describe("Ticker"),
      metric: z.string().default("all").describe("Metric group; 'all' for everything"),
    },
    handler: ({ symbol, metric }) =>
      finnhubGet("/stock/metric", { symbol: symbol.toUpperCase(), metric }),
  }),

  tool({
    name: "finnhub_recommendation_trends",
    title: "Finnhub analyst recommendations",
    description:
      "Analyst recommendation trends over time (strong buy → strong sell counts). " +
      "Requires FINNHUB_API_KEY.\nExample: { symbol: 'NVDA' }",
    inputSchema: { symbol: z.string().min(1).describe("Ticker") },
    handler: ({ symbol }) => finnhubGet("/stock/recommendation", { symbol: symbol.toUpperCase() }),
  }),

  tool({
    name: "finnhub_insider_transactions",
    title: "Finnhub insider transactions",
    description:
      "Company insider (Form 4) transactions, optionally within a date window. " +
      "Requires FINNHUB_API_KEY.\nExample: { symbol: 'AAPL', from: '2024-01-01', to: '2024-06-30' }",
    inputSchema: {
      symbol: z.string().min(1).describe("Ticker"),
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    },
    handler: ({ symbol, from, to }) =>
      finnhubGet("/stock/insider-transactions", { symbol: symbol.toUpperCase(), from, to }),
  }),

  tool({
    name: "finnhub_earnings_surprises",
    title: "Finnhub earnings surprises",
    description:
      "Historical quarterly EPS actual vs. estimate (earnings surprises). Requires " +
      "FINNHUB_API_KEY.\nExample: { symbol: 'AMZN' }",
    inputSchema: {
      symbol: z.string().min(1).describe("Ticker"),
      limit: z.number().int().min(1).max(40).optional().describe("Number of quarters"),
    },
    handler: ({ symbol, limit }) =>
      finnhubGet("/stock/earnings", { symbol: symbol.toUpperCase(), limit }),
  }),

  tool({
    name: "finnhub_symbol_search",
    title: "Finnhub symbol search",
    description:
      "Search for symbols by name or ticker fragment. Requires FINNHUB_API_KEY.\n" +
      "Example: { query: 'apple' }",
    inputSchema: { query: z.string().min(1).describe("Name or ticker fragment") },
    handler: ({ query }) => finnhubGet("/search", { q: query }),
  }),
];
