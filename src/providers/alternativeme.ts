import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { cached } from "../lib/cache.js";
import { tool } from "../lib/tool.js";

/**
 * Alternative.me — Crypto Fear & Greed Index. No key, no hard limits.
 * https://alternative.me/crypto/fear-and-greed-index/
 */
const BASE = "https://api.alternative.me";

export const alternativeMeTools = [
  tool({
    name: "crypto_fear_greed_index",
    title: "Crypto Fear & Greed Index",
    description:
      "Crypto market sentiment index (0 = extreme fear, 100 = extreme greed). " +
      "Returns the latest value plus history for the requested number of days.",
    inputSchema: {
      limit: z
        .number()
        .int()
        .min(1)
        .max(2000)
        .default(30)
        .describe("Number of days of history (1 = today only)"),
    },
    handler: ({ limit }) =>
      cached(`fng:${limit}`, () =>
        httpGet(`${BASE}/fng/`, { params: { limit, format: "json" } }),
      ),
  }),
];
