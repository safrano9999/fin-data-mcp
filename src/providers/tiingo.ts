import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { tool } from "../lib/tool.js";
import { config } from "../config.js";

/**
 * Tiingo — high-quality equities data (clean EOD history, IEX intraday). Free
 * tier needs a key (set TIINGO_API_KEY). Acts as a premium, more reliable
 * backup to the unofficial Yahoo/Cboe sources. https://www.tiingo.com/documentation/
 */
const BASE = "https://api.tiingo.com";

function requireKey(): string {
  if (!config.tiingoApiKey) {
    throw new Error(
      "Tiingo requires a free API key. Sign up at https://www.tiingo.com/ and set " +
        "TIINGO_API_KEY. (No-key alternatives: yahoo_* or cboe_* tools.)",
    );
  }
  return config.tiingoApiKey;
}

export const tiingoTools = [
  tool({
    name: "tiingo_eod_prices",
    title: "Tiingo end-of-day prices",
    description:
      "Clean adjusted/unadjusted daily OHLCV history for a US equity/ETF from " +
      "Tiingo. Requires TIINGO_API_KEY. Omit dates for the latest bar.\n" +
      "Example: { ticker: 'AAPL', startDate: '2024-01-01', resampleFreq: 'daily' }.",
    inputSchema: {
      ticker: z.string().min(1).describe("US ticker, e.g. AAPL"),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD"),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD"),
      resampleFreq: z
        .enum(["daily", "weekly", "monthly", "annually"])
        .default("daily"),
    },
    handler: ({ ticker, startDate, endDate, resampleFreq }) => {
      const token = requireKey();
      return httpGet(`${BASE}/tiingo/daily/${ticker.toLowerCase()}/prices`, {
        params: { startDate, endDate, resampleFreq, token },
      });
    },
  }),

  tool({
    name: "tiingo_metadata",
    title: "Tiingo ticker metadata",
    description:
      "Company/ticker metadata from Tiingo: name, exchange, description, and the " +
      "available price-history date range. Requires TIINGO_API_KEY.\n" +
      "Example: { ticker: 'MSFT' }.",
    inputSchema: {
      ticker: z.string().min(1).describe("US ticker, e.g. MSFT"),
    },
    handler: ({ ticker }) => {
      const token = requireKey();
      return httpGet(`${BASE}/tiingo/daily/${ticker.toLowerCase()}`, {
        params: { token },
      });
    },
  }),

  tool({
    name: "tiingo_iex_intraday",
    title: "Tiingo IEX intraday prices",
    description:
      "Intraday IEX price bars for a US ticker from Tiingo. Requires " +
      "TIINGO_API_KEY. resampleFreq examples: '5min', '1hour'. Omit dates for the " +
      "latest top-of-book snapshot.\n" +
      "Example: { ticker: 'TSLA', resampleFreq: '5min', startDate: '2024-06-03' }.",
    inputSchema: {
      ticker: z.string().min(1).describe("US ticker, e.g. TSLA"),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      resampleFreq: z
        .string()
        .optional()
        .describe("e.g. '5min', '15min', '1hour'. Omit for latest snapshot."),
    },
    handler: ({ ticker, startDate, endDate, resampleFreq }) => {
      const token = requireKey();
      const path = startDate || endDate || resampleFreq
        ? `${BASE}/iex/${ticker.toLowerCase()}/prices`
        : `${BASE}/iex/${ticker.toLowerCase()}`;
      return httpGet(path, { params: { startDate, endDate, resampleFreq, token } });
    },
  }),
];
