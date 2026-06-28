import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { cached } from "../lib/cache.js";
import { tool } from "../lib/tool.js";

/**
 * Frankfurter — ECB reference FX rates. No key, no limits. Updates ~16:00 CET
 * on TARGET working days. https://frankfurter.dev
 */
const BASE = "https://api.frankfurter.dev/v1";

export const frankfurterTools = [
  tool({
    name: "fx_latest_rates",
    title: "Latest FX rates (ECB / Frankfurter)",
    description:
      "Latest foreign-exchange reference rates from the European Central Bank. " +
      "Returns rates for `symbols` quoted against `base`.",
    inputSchema: {
      base: z.string().length(3).default("USD").describe("Base currency, e.g. USD"),
      symbols: z
        .string()
        .optional()
        .describe("Comma-separated target currencies, e.g. 'EUR,GBP,JPY'. Omit for all."),
    },
    handler: ({ base, symbols }) =>
      cached(`frank:latest:${base}:${symbols ?? "all"}`, () =>
        httpGet(`${BASE}/latest`, {
          params: { base: base.toUpperCase(), symbols: symbols?.toUpperCase() },
        }),
      ),
  }),

  tool({
    name: "fx_historical_rate",
    title: "Historical FX rate on a date",
    description:
      "FX reference rates for a specific past date (YYYY-MM-DD). Falls back to " +
      "the most recent prior working day if the date is a weekend/holiday.",
    inputSchema: {
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("YYYY-MM-DD"),
      base: z.string().length(3).default("USD"),
      symbols: z.string().optional().describe("Comma-separated target currencies"),
    },
    handler: ({ date, base, symbols }) =>
      cached(`frank:hist:${date}:${base}:${symbols ?? "all"}`, () =>
        httpGet(`${BASE}/${date}`, {
          params: { base: base.toUpperCase(), symbols: symbols?.toUpperCase() },
        }),
      ),
  }),

  tool({
    name: "fx_timeseries",
    title: "FX rate time series",
    description:
      "Daily FX rates across a date range. Use for currency charts and backtests.",
    inputSchema: {
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Start date YYYY-MM-DD"),
      end: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("End date YYYY-MM-DD. Omit for up-to-today."),
      base: z.string().length(3).default("USD"),
      symbols: z.string().optional(),
    },
    handler: ({ start, end, base, symbols }) =>
      cached(`frank:ts:${start}:${end ?? ""}:${base}:${symbols ?? "all"}`, () =>
        httpGet(`${BASE}/${start}..${end ?? ""}`, {
          params: { base: base.toUpperCase(), symbols: symbols?.toUpperCase() },
        }),
      ),
  }),

  tool({
    name: "fx_list_currencies",
    title: "List supported currencies",
    description: "Map of supported currency codes to full names.",
    inputSchema: {},
    handler: () =>
      cached("frank:currencies", () => httpGet(`${BASE}/currencies`), 24 * 60 * 60 * 1000),
  }),
];
