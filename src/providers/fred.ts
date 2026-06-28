import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { tool } from "../lib/tool.js";
import { config } from "../config.js";

/**
 * FRED — Federal Reserve Economic Data (St. Louis Fed). The definitive source
 * for US & global macro series and central-bank data. Free key required
 * (set FRED_API_KEY). https://fred.stlouisfed.org/docs/api/fred/
 */
const BASE = "https://api.stlouisfed.org/fred";

function requireKey(): string {
  if (!config.fredApiKey) {
    throw new Error("FRED requires a free API key — set FRED_API_KEY (https://fred.stlouisfed.org/docs/api/api_key.html).");
  }
  return config.fredApiKey;
}

/** All FRED calls need api_key + file_type=json. */
function fredGet<T>(path: string, params: Record<string, unknown>): Promise<T> {
  return httpGet<T>(`${BASE}${path}`, {
    params: { ...params, api_key: requireKey(), file_type: "json" } as Record<
      string,
      string | number | boolean | undefined | null
    >,
  });
}

export const fredTools = [
  tool({
    name: "fred_series_observations",
    title: "FRED series observations",
    description:
      "Observations (the data points) for a FRED series. Examples of series ids: " +
      "GDP, CPIAUCSL (CPI), UNRATE (unemployment), DGS10 (10y Treasury), " +
      "FEDFUNDS. Requires FRED_API_KEY.\n" +
      "Example: { series_id: 'UNRATE', observation_start: '2020-01-01' }",
    inputSchema: {
      series_id: z.string().min(1).describe("FRED series id, e.g. CPIAUCSL"),
      observation_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD"),
      observation_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD"),
      units: z
        .enum(["lin", "chg", "ch1", "pch", "pc1", "pca", "cch", "cca", "log"])
        .optional()
        .describe("Transformation: lin=levels, pch=% change, pc1=YoY %, etc."),
      frequency: z
        .enum(["d", "w", "bw", "m", "q", "sa", "a"])
        .optional()
        .describe("Resample frequency: d/w/m/q/a"),
      sort_order: z.enum(["asc", "desc"]).optional(),
      limit: z.number().int().min(1).max(100000).default(1000),
    },
    handler: ({ series_id, observation_start, observation_end, units, frequency, sort_order, limit }) =>
      fredGet("/series/observations", {
        series_id,
        observation_start,
        observation_end,
        units,
        frequency,
        sort_order,
        limit,
      }),
  }),

  tool({
    name: "fred_series_info",
    title: "FRED series metadata",
    description:
      "Metadata for a FRED series: title, units, frequency, seasonal adjustment, " +
      "and date range. Requires FRED_API_KEY.\nExample: { series_id: 'DGS10' }",
    inputSchema: {
      series_id: z.string().min(1).describe("FRED series id"),
    },
    handler: ({ series_id }) => fredGet("/series", { series_id }),
  }),

  tool({
    name: "fred_search_series",
    title: "Search FRED series",
    description:
      "Full-text search for FRED series by keywords — use to discover series ids. " +
      "Requires FRED_API_KEY.\nExample: { search_text: '10 year treasury' }",
    inputSchema: {
      search_text: z.string().min(1).describe("Search keywords"),
      limit: z.number().int().min(1).max(1000).default(25),
      order_by: z
        .enum(["search_rank", "popularity", "last_updated", "observation_end"])
        .optional(),
    },
    handler: ({ search_text, limit, order_by }) =>
      fredGet("/series/search", { search_text, limit, order_by }),
  }),

  tool({
    name: "fred_releases",
    title: "List FRED economic releases",
    description:
      "List economic data releases (e.g. Employment Situation, CPI). Useful for " +
      "tracking the macro calendar. Requires FRED_API_KEY.\nExample: { limit: 50 }",
    inputSchema: {
      limit: z.number().int().min(1).max(1000).default(50),
    },
    handler: ({ limit }) => fredGet("/releases", { limit }),
  }),
];
