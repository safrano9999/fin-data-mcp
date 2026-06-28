import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { cached } from "../lib/cache.js";
import { tool } from "../lib/tool.js";

/**
 * World Bank Open Data — no key. GDP, demographics, commodities (Pink Sheet),
 * development indicators. https://datahelpdesk.worldbank.org/
 */
const BASE = "https://api.worldbank.org/v2";
const DAY = 24 * 60 * 60 * 1000;

export const worldBankTools = [
  tool({
    name: "worldbank_indicator",
    title: "World Bank indicator time series",
    description:
      "Time series for a World Bank indicator and country. Example indicators: " +
      "NY.GDP.MKTP.CD (GDP, current US$), FP.CPI.TOTL.ZG (inflation %), " +
      "SP.POP.TOTL (population). Country as ISO code (US, CN) or 'all'/'WLD' for world.",
    inputSchema: {
      country: z.string().default("US").describe("ISO country code, 'WLD', or 'all'"),
      indicator: z.string().describe("World Bank indicator code, e.g. NY.GDP.MKTP.CD"),
      date: z
        .string()
        .optional()
        .describe("Year or range, e.g. '2020' or '2000:2023'"),
      perPage: z.number().int().min(1).max(1000).default(100),
    },
    handler: ({ country, indicator, date, perPage }) =>
      cached(`wb:ind:${country}:${indicator}:${date ?? ""}:${perPage}`, () =>
        httpGet(`${BASE}/country/${country}/indicator/${indicator}`, {
          params: { format: "json", per_page: perPage, date },
        }),
      ),
  }),

  tool({
    name: "worldbank_search_indicators",
    title: "Browse World Bank indicators",
    description:
      "List World Bank indicators (paginated). Use to discover indicator codes " +
      "before calling worldbank_indicator. There is no full-text search; page through.",
    inputSchema: {
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(1).max(1000).default(50),
    },
    handler: ({ page, perPage }) =>
      cached(
        `wb:indicators:${page}:${perPage}`,
        () =>
          httpGet(`${BASE}/indicator`, {
            params: { format: "json", page, per_page: perPage },
          }),
        DAY,
      ),
  }),

  tool({
    name: "worldbank_list_countries",
    title: "List World Bank countries & regions",
    description: "Country metadata: ISO codes, region, income level, capital.",
    inputSchema: {
      perPage: z.number().int().min(1).max(400).default(300),
    },
    handler: ({ perPage }) =>
      cached(
        `wb:countries:${perPage}`,
        () => httpGet(`${BASE}/country`, { params: { format: "json", per_page: perPage } }),
        DAY,
      ),
  }),

  tool({
    name: "worldbank_sources",
    title: "List World Bank data sources",
    description:
      "List the data sources (databases) behind World Bank indicators, e.g. World " +
      "Development Indicators, Doing Business. Use to discover a source id for filtering. " +
      "Example: { perPage: 100 }",
    inputSchema: {
      perPage: z.number().int().min(1).max(1000).default(100),
    },
    handler: ({ perPage }) =>
      cached(
        `wb:sources:${perPage}`,
        () => httpGet(`${BASE}/source`, { params: { format: "json", per_page: perPage } }),
        DAY,
      ),
  }),

  tool({
    name: "worldbank_topics",
    title: "List World Bank topics",
    description:
      "List the thematic topics (e.g. Agriculture, Economy & Growth, Health) used to " +
      "categorize World Bank indicators. Example: { perPage: 100 }",
    inputSchema: {
      perPage: z.number().int().min(1).max(1000).default(100),
    },
    handler: ({ perPage }) =>
      cached(
        `wb:topics:${perPage}`,
        () => httpGet(`${BASE}/topic`, { params: { format: "json", per_page: perPage } }),
        DAY,
      ),
  }),

  tool({
    name: "worldbank_indicator_metadata",
    title: "World Bank indicator metadata",
    description:
      "Metadata for a single indicator: name, source, topics, and a definition/notes " +
      "string. Use to confirm what an indicator code measures. " +
      "Example: { code: \"NY.GDP.MKTP.CD\" }",
    inputSchema: {
      code: z.string().describe("World Bank indicator code, e.g. NY.GDP.MKTP.CD"),
    },
    handler: ({ code }) =>
      cached(
        `wb:indmeta:${code}`,
        () => httpGet(`${BASE}/indicator/${code}`, { params: { format: "json" } }),
        DAY,
      ),
  }),

  tool({
    name: "worldbank_country",
    title: "World Bank country metadata",
    description:
      "Metadata for a single country/region: ISO codes, region, income level, lending " +
      "type, capital, coordinates. Example: { code: \"US\" }",
    inputSchema: {
      code: z.string().describe("ISO country/region code, e.g. US, CN, EUU"),
    },
    handler: ({ code }) =>
      cached(
        `wb:country:${code}`,
        () => httpGet(`${BASE}/country/${code}`, { params: { format: "json" } }),
        DAY,
      ),
  }),
];
