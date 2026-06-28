import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { tool } from "../lib/tool.js";
import { config } from "../config.js";

/**
 * EIA — US Energy Information Administration. The definitive source for US
 * energy data: petroleum, natural gas, electricity, coal, renewables. Free key
 * required (set EIA_API_KEY). https://www.eia.gov/opendata/documentation.php
 *
 * The API is faceted: pick a `route` (a data path like "petroleum/pri/spt"),
 * then filter with `facets`. Use eia_browse_route to discover routes/facets.
 */
const BASE = "https://api.eia.gov/v2";

function requireKey(): string {
  if (!config.eiaApiKey) {
    throw new Error("EIA requires a free API key — set EIA_API_KEY (https://www.eia.gov/opendata/register.php).");
  }
  return config.eiaApiKey;
}

export const eiaTools = [
  tool({
    name: "eia_browse_route",
    title: "Browse an EIA data route",
    description:
      "Explore the EIA data tree at a route: returns child routes, available " +
      "frequencies, data columns, and facet dimensions. Start with route '' (top " +
      "level) and drill down. Requires EIA_API_KEY.\n" +
      "Example: { route: 'petroleum/pri/spt' } or { route: '' }",
    inputSchema: {
      route: z.string().default("").describe("Data route, e.g. 'electricity/rto/region-data'. Empty = top level."),
    },
    handler: ({ route }) =>
      httpGet(`${BASE}/${route}`.replace(/\/+$/, "/") , {
        params: { api_key: requireKey() },
      }),
  }),

  tool({
    name: "eia_data",
    title: "Query EIA data series",
    description:
      "Fetch a data series from an EIA route with optional facet filters. Returns " +
      "period/value rows. Discover route + facet names/values with eia_browse_route " +
      "first. Requires EIA_API_KEY.\n" +
      "Example: { route: 'petroleum/pri/spt', frequency: 'monthly', " +
      "facets: { product: ['EPCWTI'] }, start: '2023-01', length: 50 }",
    inputSchema: {
      route: z.string().min(1).describe("Data route, e.g. petroleum/pri/spt"),
      frequency: z.string().optional().describe("e.g. daily, weekly, monthly, annual"),
      facets: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe("Map of facet name → allowed values, e.g. { product: ['EPCWTI'] }"),
      start: z.string().optional().describe("Start period, e.g. 2023 or 2023-01"),
      end: z.string().optional().describe("End period"),
      sort: z.enum(["asc", "desc"]).default("desc").describe("Sort by period"),
      length: z.number().int().min(1).max(5000).default(100),
      offset: z.number().int().min(0).default(0),
    },
    handler: ({ route, frequency, facets, start, end, sort, length, offset }) => {
      // Facets need repeated query params: facets[name][]=value.
      const sp = new URLSearchParams();
      for (const [name, values] of Object.entries(facets ?? {})) {
        for (const v of values) sp.append(`facets[${name}][]`, v);
      }
      const qs = sp.toString();
      const url = `${BASE}/${route}/data/${qs ? `?${qs}` : ""}`;
      return httpGet(url, {
        params: {
          api_key: requireKey(),
          frequency,
          "data[0]": "value",
          start,
          end,
          "sort[0][column]": "period",
          "sort[0][direction]": sort,
          length,
          offset,
        },
      });
    },
  }),
];
