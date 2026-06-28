import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { cached } from "../lib/cache.js";
import { tool } from "../lib/tool.js";

/**
 * OECD SDMX-JSON API — deep macro/structural indicators for developed nations.
 * No key. https://gitlab.algobank.oecd.org/public-documentation/dotstat-migration
 */
const BASE = "https://sdmx.oecd.org/public/rest";
const HOUR = 60 * 60 * 1000;

export const oecdTools = [
  tool({
    name: "oecd_data",
    title: "OECD SDMX data query",
    description:
      "Query OECD data via SDMX. `dataflow` is 'AGENCY,DATAFLOW_ID,VERSION' (e.g. " +
      "'OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0'). `key` is dot-delimited " +
      "dimension values; leave a position empty for a wildcard " +
      "(e.g. 'USA.M.N.CPI.IX._T.N.GY'). Returns SDMX-JSON. For big series, bound " +
      "with startPeriod+endPeriod or cap with lastNObservations to keep responses small.",
    inputSchema: {
      dataflow: z.string().describe("AGENCY,DATAFLOW_ID,VERSION"),
      key: z.string().default("all").describe("Dot-delimited dimension key, or 'all'"),
      startPeriod: z.string().optional().describe("e.g. 2020 or 2020-01"),
      endPeriod: z.string().optional().describe("e.g. 2024 or 2024-12"),
      lastNObservations: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe("Return only the most recent N observations per series (caps size)"),
      firstNObservations: z.number().int().min(1).optional(),
    },
    handler: ({ dataflow, key, startPeriod, endPeriod, lastNObservations, firstNObservations }) =>
      cached(
        `oecd:${dataflow}:${key}:${startPeriod ?? ""}:${endPeriod ?? ""}:${lastNObservations ?? ""}:${firstNObservations ?? ""}`,
        () =>
          httpGet(`${BASE}/data/${dataflow}/${key}`, {
            // OECD rejects a generic Accept: application/json (500). Use the
            // SDMX-JSON media type for content negotiation instead.
            headers: { Accept: "application/vnd.sdmx.data+json" },
            params: { startPeriod, endPeriod, lastNObservations, firstNObservations },
          }),
        HOUR,
      ),
  }),

  tool({
    name: "oecd_dataflows",
    title: "List OECD dataflows",
    description:
      "List available OECD dataflows (datasets) as SDMX structure JSON. Use to " +
      "discover the dataflow id + agency needed for oecd_data.",
    inputSchema: {
      agency: z.string().default("all").describe("Agency id filter, or 'all'"),
    },
    handler: ({ agency }) =>
      cached(
        `oecd:dataflows:${agency}`,
        () =>
          httpGet(`${BASE}/dataflow/${agency}`, {
            headers: { Accept: "application/vnd.sdmx.structure+json" },
          }),
        24 * HOUR,
      ),
  }),

  tool({
    name: "oecd_data_structure",
    title: "OECD dataflow structure (dimensions & codes)",
    description:
      "Discover a dataflow's full structure — its dimensions, the order they appear in " +
      "the `key`, and the allowed codes for each — by pulling the dataflow plus all " +
      "referenced structures (DSD, codelists, concepts) as SDMX-JSON. Use this before " +
      "oecd_data to build a valid dot-delimited key. `dataflowId` may include or omit " +
      "the trailing version (e.g. 'DSD_PRICES@DF_PRICES_ALL' or '.../1.0'). " +
      "Example: { agency: \"OECD.SDD.TPS\", dataflowId: \"DSD_PRICES@DF_PRICES_ALL\" }",
    inputSchema: {
      agency: z.string().describe("Agency id, e.g. OECD.SDD.TPS"),
      dataflowId: z
        .string()
        .describe("Dataflow id, optionally with version, e.g. DSD_PRICES@DF_PRICES_ALL"),
    },
    handler: ({ agency, dataflowId }) =>
      cached(
        `oecd:structure:${agency}:${dataflowId}`,
        () =>
          httpGet(`${BASE}/dataflow/${agency}/${dataflowId}`, {
            headers: { Accept: "application/vnd.sdmx.structure+json" },
            params: { references: "all" },
          }),
        24 * HOUR,
      ),
  }),
];
