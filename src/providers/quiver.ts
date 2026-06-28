import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { tool } from "../lib/tool.js";
import { config } from "../config.js";

/**
 * Quiver Quantitative — alternative/political-signal data: congressional trades,
 * lobbying, government contracts, and corporate insiders. Free key required
 * (set QUIVER_API_KEY); free tier ~1,000 req/mo. https://api.quiverquant.com/
 */
const BASE = "https://api.quiverquant.com/beta";

function requireKey(): string {
  if (!config.quiverApiKey) {
    throw new Error("Quiver requires a free API key — set QUIVER_API_KEY (https://www.quiverquant.com/).");
  }
  return config.quiverApiKey;
}

function quiverGet<T>(path: string): Promise<T> {
  return httpGet<T>(`${BASE}${path}`, {
    headers: { Authorization: `Token ${requireKey()}` },
  });
}

export const quiverTools = [
  tool({
    name: "quiver_congress_trading",
    title: "Quiver congressional stock trades",
    description:
      "US congressional stock transactions. Omit `ticker` for the latest trades " +
      "across all members; pass a `ticker` for that company's full history. " +
      "Requires QUIVER_API_KEY.\nExample: { ticker: 'NVDA' }",
    inputSchema: {
      ticker: z.string().optional().describe("Ticker for historical view; omit for latest cross-member feed"),
    },
    handler: ({ ticker }) =>
      quiverGet(ticker ? `/historical/congresstrading/${ticker.toUpperCase()}` : `/live/congresstrading`),
  }),

  tool({
    name: "quiver_lobbying",
    title: "Quiver corporate lobbying",
    description:
      "Corporate lobbying disclosures. Omit `ticker` for the latest feed; pass a " +
      "`ticker` for one company's history. Requires QUIVER_API_KEY.\n" +
      "Example: { ticker: 'GOOGL' }",
    inputSchema: {
      ticker: z.string().optional().describe("Ticker for historical view; omit for latest feed"),
    },
    handler: ({ ticker }) =>
      quiverGet(ticker ? `/historical/lobbying/${ticker.toUpperCase()}` : `/live/lobbying`),
  }),

  tool({
    name: "quiver_gov_contracts",
    title: "Quiver government contracts",
    description:
      "US federal government contract awards. Omit `ticker` for the latest feed; " +
      "pass a `ticker` for one company's awarded contracts. Requires QUIVER_API_KEY.\n" +
      "Example: { ticker: 'LMT' }",
    inputSchema: {
      ticker: z.string().optional().describe("Ticker for historical view; omit for latest feed"),
    },
    handler: ({ ticker }) =>
      quiverGet(ticker ? `/historical/govcontracts/${ticker.toUpperCase()}` : `/live/govcontractsall`),
  }),

  tool({
    name: "quiver_insider_trading",
    title: "Quiver corporate insider trades",
    description:
      "Latest corporate insider (Form 4) transactions across companies. Requires " +
      "QUIVER_API_KEY.\nExample: {}",
    inputSchema: {},
    handler: () => quiverGet(`/live/insiders`),
  }),
];
