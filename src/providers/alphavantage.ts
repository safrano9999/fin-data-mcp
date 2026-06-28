import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { tool } from "../lib/tool.js";
import { config } from "../config.js";

/**
 * Alpha Vantage — equities, FX, crypto, and notably COMMODITIES and economic
 * indicators. Free key required (set ALPHAVANTAGE_API_KEY); free tier is ~25
 * requests/day across all endpoints. https://www.alphavantage.co/documentation/
 */
const BASE = "https://www.alphavantage.co/query";

function requireKey(): string {
  if (!config.alphaVantageApiKey) {
    throw new Error("Alpha Vantage requires a free API key — set ALPHAVANTAGE_API_KEY (https://www.alphavantage.co/support/#api-key).");
  }
  return config.alphaVantageApiKey;
}

/** AV returns HTTP 200 even on errors/limits — surface them as real errors. */
async function avGet<T>(params: Record<string, unknown>): Promise<T> {
  const data = await httpGet<Record<string, unknown>>(BASE, {
    params: { ...params, apikey: requireKey() } as Record<
      string,
      string | number | boolean | undefined | null
    >,
  });
  if (data && typeof data === "object") {
    const msg =
      (data["Error Message"] as string) ??
      (data["Note"] as string) ??
      (data["Information"] as string);
    if (msg) {
      throw new Error(
        `Alpha Vantage: ${msg.slice(0, 200)}` +
          (data["Note"] || data["Information"] ? " (likely the 25/day free-tier limit)" : ""),
      );
    }
  }
  return data as T;
}

const COMMODITIES = [
  "WTI", "BRENT", "NATURAL_GAS", "COPPER", "ALUMINUM",
  "WHEAT", "CORN", "COTTON", "SUGAR", "COFFEE", "ALL_COMMODITIES",
] as const;

const ECON = [
  "REAL_GDP", "REAL_GDP_PER_CAPITA", "TREASURY_YIELD", "FEDERAL_FUNDS_RATE",
  "CPI", "INFLATION", "RETAIL_SALES", "DURABLES", "UNEMPLOYMENT", "NONFARM_PAYROLL",
] as const;

export const alphaVantageTools = [
  tool({
    name: "av_commodity",
    title: "Alpha Vantage commodity prices",
    description:
      "Global commodity price series (crude oil WTI/BRENT, natural gas, metals, " +
      "grains, softs, or an all-commodities index). Requires ALPHAVANTAGE_API_KEY.\n" +
      "Example: { commodity: 'WTI', interval: 'monthly' }",
    inputSchema: {
      commodity: z.enum(COMMODITIES).describe("Which commodity"),
      interval: z.enum(["daily", "weekly", "monthly", "quarterly", "annual"]).default("monthly"),
    },
    handler: ({ commodity, interval }) => avGet({ function: commodity, interval }),
  }),

  tool({
    name: "av_economic_indicator",
    title: "Alpha Vantage US economic indicators",
    description:
      "US macro indicators (GDP, CPI, inflation, unemployment, Treasury yields, " +
      "fed funds rate, payrolls, retail sales). Requires ALPHAVANTAGE_API_KEY.\n" +
      "Example: { indicator: 'CPI', interval: 'monthly' }",
    inputSchema: {
      indicator: z.enum(ECON).describe("Which indicator"),
      interval: z
        .enum(["daily", "weekly", "monthly", "quarterly", "annual", "semiannual"])
        .optional()
        .describe("Supported intervals vary by indicator"),
      maturity: z
        .enum(["3month", "2year", "5year", "7year", "10year", "30year"])
        .optional()
        .describe("Only for TREASURY_YIELD"),
    },
    handler: ({ indicator, interval, maturity }) =>
      avGet({ function: indicator, interval, maturity }),
  }),

  tool({
    name: "av_time_series_daily",
    title: "Alpha Vantage daily equity prices",
    description:
      "Daily OHLCV for a global equity/ETF. Requires ALPHAVANTAGE_API_KEY.\n" +
      "Example: { symbol: 'IBM', outputsize: 'compact' }",
    inputSchema: {
      symbol: z.string().min(1).describe("Ticker, e.g. IBM"),
      outputsize: z.enum(["compact", "full"]).default("compact").describe("compact=100 rows, full=20+yr"),
    },
    handler: ({ symbol, outputsize }) =>
      avGet({ function: "TIME_SERIES_DAILY", symbol: symbol.toUpperCase(), outputsize }),
  }),

  tool({
    name: "av_global_quote",
    title: "Alpha Vantage global quote",
    description:
      "Latest price quote for a global equity. Requires ALPHAVANTAGE_API_KEY.\n" +
      "Example: { symbol: 'TSLA' }",
    inputSchema: { symbol: z.string().min(1).describe("Ticker") },
    handler: ({ symbol }) => avGet({ function: "GLOBAL_QUOTE", symbol: symbol.toUpperCase() }),
  }),

  tool({
    name: "av_fx_daily",
    title: "Alpha Vantage daily FX rates",
    description:
      "Daily exchange-rate series for a currency pair. Requires ALPHAVANTAGE_API_KEY.\n" +
      "Example: { from_symbol: 'EUR', to_symbol: 'USD' }",
    inputSchema: {
      from_symbol: z.string().length(3).describe("Base currency, e.g. EUR"),
      to_symbol: z.string().length(3).describe("Quote currency, e.g. USD"),
      outputsize: z.enum(["compact", "full"]).default("compact"),
    },
    handler: ({ from_symbol, to_symbol, outputsize }) =>
      avGet({
        function: "FX_DAILY",
        from_symbol: from_symbol.toUpperCase(),
        to_symbol: to_symbol.toUpperCase(),
        outputsize,
      }),
  }),
];
