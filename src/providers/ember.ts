import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { cached } from "../lib/cache.js";
import { tool } from "../lib/tool.js";
import { config } from "../config.js";

/**
 * Ember Energy — global electricity generation, demand, emissions and capacity.
 *
 * As of 2026 Ember requires a FREE API key (set EMBER_API_KEY). Get one at
 * https://api.ember-energy.org/signup. If no key is set these tools return a
 * helpful error rather than failing opaquely.
 */
const BASE = "https://api.ember-energy.org/v1";
const HOUR = 60 * 60 * 1000;

function requireKey(): string {
  if (!config.emberApiKey) {
    throw new Error(
      "Ember requires a free API key. Get one at https://api.ember-energy.org/signup " +
        "and set EMBER_API_KEY.",
    );
  }
  return config.emberApiKey;
}

const datasetEnum = z.enum([
  "electricity-generation",
  "electricity-demand",
  "power-sector-emissions",
  "carbon-intensity",
  "installed-capacity",
]);

export const emberTools = [
  tool({
    name: "energy_ember_series",
    title: "Ember electricity/energy series",
    description:
      "Global electricity data from Ember: generation, demand, power-sector " +
      "emissions, carbon intensity, or installed-capacity, at monthly or yearly " +
      "resolution. Filter by entity (ISO3 country code like DEU/USA/IND, or a " +
      "region) and date range. Note: installed-capacity is monthly-only — the " +
      "resolution is forced to monthly for that dataset. Requires EMBER_API_KEY. " +
      "Example: { dataset: 'installed-capacity', entity_code: 'DEU', start_date: '2024-01' }",
    inputSchema: {
      dataset: datasetEnum.describe("Which Ember dataset to query"),
      resolution: z
        .enum(["monthly", "yearly"])
        .default("yearly")
        .describe("Ignored for installed-capacity, which is monthly-only"),
      entity_code: z
        .string()
        .optional()
        .describe("ISO3 entity code, e.g. DEU, USA, IND. Omit for all."),
      start_date: z
        .string()
        .optional()
        .describe("Start: YYYY for yearly, YYYY-MM for monthly"),
      end_date: z.string().optional().describe("End: YYYY or YYYY-MM"),
      series: z.string().optional().describe("Series/fuel filter, e.g. 'Solar', 'Coal'"),
    },
    handler: ({ dataset, resolution, entity_code, start_date, end_date, series }) => {
      const api_key = requireKey();
      // Ember only publishes installed-capacity at monthly resolution.
      const res = dataset === "installed-capacity" ? "monthly" : resolution;
      return cached(
        `ember:${dataset}:${res}:${entity_code ?? ""}:${start_date ?? ""}:${end_date ?? ""}:${series ?? ""}`,
        () =>
          httpGet(`${BASE}/${dataset}/${res}`, {
            params: { entity_code, start_date, end_date, series, api_key },
          }),
        HOUR,
      );
    },
  }),
];
