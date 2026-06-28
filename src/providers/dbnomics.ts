import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { cached } from "../lib/cache.js";
import { tool } from "../lib/tool.js";

/**
 * DBnomics — aggregator of 100+ macro providers (IMF, Eurostat, BIS, ECB, etc.).
 * No key, fully open. https://db.nomics.world/docs/api/
 */
const BASE = "https://api.db.nomics.world/v22";
const HOUR = 60 * 60 * 1000;

export const dbnomicsTools = [
  tool({
    name: "dbnomics_search",
    title: "Search DBnomics datasets",
    description:
      "Full-text search across all DBnomics providers/datasets. Use to discover " +
      "the provider_code / dataset_code needed for dbnomics_series.",
    inputSchema: {
      query: z.string().describe("Search terms, e.g. 'unemployment rate germany'"),
      limit: z.number().int().min(1).max(100).default(20),
    },
    handler: ({ query, limit }) =>
      httpGet(`${BASE}/search`, { params: { q: query, limit } }),
  }),

  tool({
    name: "dbnomics_series",
    title: "Get a DBnomics series (with observations)",
    description:
      "Fetch one or more series with their observations. Identify a series by " +
      "provider/dataset/series codes (e.g. provider=IMF, dataset=WEO:latest, " +
      "series='USA.NGDPD.us_dollars'). Returns periods + values.",
    inputSchema: {
      provider: z.string().describe("Provider code, e.g. IMF, Eurostat, ECB"),
      dataset: z.string().describe("Dataset code"),
      series: z
        .string()
        .describe("Series code, or a mask with '+' / '.' wildcards for multiple"),
    },
    handler: ({ provider, dataset, series }) =>
      cached(
        `dbn:${provider}:${dataset}:${series}`,
        () =>
          httpGet(`${BASE}/series/${provider}/${dataset}/${series}`, {
            params: { observations: 1 },
          }),
        HOUR,
      ),
  }),

  tool({
    name: "dbnomics_providers",
    title: "List DBnomics providers",
    description: "List all source providers aggregated by DBnomics.",
    inputSchema: {},
    handler: () =>
      cached("dbn:providers", () => httpGet(`${BASE}/providers`), 24 * HOUR),
  }),

  tool({
    name: "dbnomics_provider_datasets",
    title: "List a DBnomics provider's datasets",
    description:
      "List the datasets published by one provider, with their codes and names. Use to " +
      "discover a dataset_code (paired with the provider) for dbnomics_dataset or " +
      "dbnomics_series. Example: { provider: \"IMF\" }",
    inputSchema: {
      provider: z.string().describe("Provider code, e.g. IMF, Eurostat, ECB, BIS"),
    },
    handler: ({ provider }) =>
      cached(
        `dbn:provdatasets:${provider}`,
        () => httpGet(`${BASE}/datasets/${provider}`),
        24 * HOUR,
      ),
  }),

  tool({
    name: "dbnomics_dataset",
    title: "Get DBnomics dataset metadata",
    description:
      "Fetch metadata for one dataset: its name, dimensions, and the codes/labels for " +
      "each dimension. Use to learn how to build a series mask for dbnomics_series. " +
      "Example: { provider: \"IMF\", dataset: \"AFRREO\" }",
    inputSchema: {
      provider: z.string().describe("Provider code, e.g. IMF, Eurostat, ECB"),
      dataset: z.string().describe("Dataset code, e.g. AFRREO"),
    },
    handler: ({ provider, dataset }) =>
      cached(
        `dbn:dataset:${provider}:${dataset}`,
        () => httpGet(`${BASE}/datasets/${provider}/${dataset}`),
        HOUR,
      ),
  }),
];
