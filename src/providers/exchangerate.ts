import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { cached } from "../lib/cache.js";
import { tool } from "../lib/tool.js";

/**
 * ExchangeRate-API open endpoint — no key. 160+ currencies, daily updates.
 * https://www.exchangerate-api.com/docs/free
 */
const BASE = "https://open.er-api.com/v6";

export const exchangeRateTools = [
  tool({
    name: "fx_open_rates",
    title: "FX rates (ExchangeRate-API, open)",
    description:
      "All exchange rates for a base currency from the ExchangeRate-API open " +
      "endpoint (no key). Independent second source to cross-check Frankfurter.",
    inputSchema: {
      base: z.string().length(3).default("USD").describe("Base currency code"),
    },
    handler: ({ base }) =>
      cached(`erapi:${base}`, () => httpGet(`${BASE}/latest/${base.toUpperCase()}`)),
  }),
];
