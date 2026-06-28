import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { cached } from "../lib/cache.js";
import { tool } from "../lib/tool.js";
import { config } from "../config.js";

/**
 * SEC EDGAR — US corporate filings & XBRL financial facts. No key, but a
 * descriptive User-Agent with a contact is REQUIRED (set SEC_USER_AGENT).
 * 10 req/s limit. https://www.sec.gov/search-filings/edgar-application-programming-interfaces
 */
const DATA = "https://data.sec.gov";
const WWW = "https://www.sec.gov";
const EFTS = "https://efts.sec.gov/LATEST/search-index";
const DAY = 24 * 60 * 60 * 1000;

const headers = () => ({ "User-Agent": config.secUserAgent });

/** SEC CIK endpoints want a zero-padded 10-digit CIK. */
function padCik(cik: string | number): string {
  return String(cik).replace(/\D/g, "").padStart(10, "0");
}

/** Resolve a ticker (e.g. AAPL) to its zero-padded CIK via SEC's ticker map. */
async function tickerToCik(ticker: string): Promise<string> {
  const map = await cached(
    "sec:tickermap",
    () =>
      httpGet<Record<string, { cik_str: number; ticker: string; title: string }>>(
        `${WWW}/files/company_tickers.json`,
        { headers: headers() },
      ),
    DAY,
  );
  const upper = ticker.toUpperCase();
  for (const entry of Object.values(map)) {
    if (entry.ticker?.toUpperCase() === upper) return padCik(entry.cik_str);
  }
  throw new Error(`No CIK found for ticker '${ticker}'.`);
}

async function resolveCik(args: { cik?: string; ticker?: string }): Promise<string> {
  if (args.cik) return padCik(args.cik);
  if (args.ticker) return tickerToCik(args.ticker);
  throw new Error("Provide either `ticker` or `cik`.");
}

export const secEdgarTools = [
  tool({
    name: "sec_company_filings",
    title: "SEC EDGAR company filings",
    description:
      "Recent filings metadata for a company (10-K, 10-Q, 8-K, Form 4 insider, " +
      "etc.) including accession numbers, form types and dates. Identify by ticker or CIK.",
    inputSchema: {
      ticker: z.string().optional().describe("Ticker symbol, e.g. AAPL"),
      cik: z.string().optional().describe("CIK number (with or without leading zeros)"),
    },
    handler: async (args) => {
      const cik = await resolveCik(args);
      return httpGet(`${DATA}/submissions/CIK${cik}.json`, { headers: headers() });
    },
  }),

  tool({
    name: "sec_company_facts",
    title: "SEC EDGAR XBRL company facts",
    description:
      "All standardized XBRL financial facts for a company (revenue, assets, EPS, " +
      "etc.) across all filings. Large payload. Identify by ticker or CIK.",
    inputSchema: {
      ticker: z.string().optional(),
      cik: z.string().optional(),
    },
    handler: async (args) => {
      const cik = await resolveCik(args);
      return httpGet(`${DATA}/api/xbrl/companyfacts/CIK${cik}.json`, {
        headers: headers(),
      });
    },
  }),

  tool({
    name: "sec_company_concept",
    title: "SEC EDGAR single XBRL concept",
    description:
      "Time series for one XBRL concept for a company, e.g. taxonomy 'us-gaap' + " +
      "tag 'Revenues' or 'NetIncomeLoss'. Lighter than company_facts.",
    inputSchema: {
      ticker: z.string().optional(),
      cik: z.string().optional(),
      taxonomy: z.string().default("us-gaap").describe("e.g. us-gaap, dei"),
      tag: z.string().describe("XBRL tag, e.g. Revenues, Assets, NetIncomeLoss"),
    },
    handler: async ({ ticker, cik, taxonomy, tag }) => {
      const resolved = await resolveCik({ ticker, cik });
      return httpGet(
        `${DATA}/api/xbrl/companyconcept/CIK${resolved}/${taxonomy}/${tag}.json`,
        { headers: headers() },
      );
    },
  }),

  tool({
    name: "sec_full_text_search",
    title: "SEC EDGAR full-text filing search",
    description:
      "Search the full text of EDGAR filings (last ~10 years). Filter by form type " +
      "and date. Great for corporate-action and disclosure monitoring.",
    inputSchema: {
      query: z.string().describe("Search phrase; wrap in quotes for exact match"),
      forms: z.string().optional().describe("Form filter, e.g. '8-K' or '10-K,10-Q'"),
      startDate: z.string().optional().describe("YYYY-MM-DD"),
      endDate: z.string().optional().describe("YYYY-MM-DD"),
    },
    handler: ({ query, forms, startDate, endDate }) =>
      httpGet(EFTS, {
        headers: headers(),
        params: { q: query, forms, dateRange: startDate || endDate ? "custom" : undefined, startdt: startDate, enddt: endDate },
      }),
  }),

  tool({
    name: "sec_ticker_to_cik",
    title: "Resolve ticker → CIK",
    description: "Look up the SEC Central Index Key (CIK) for a ticker symbol.",
    inputSchema: {
      ticker: z.string().describe("Ticker symbol, e.g. MSFT"),
    },
    handler: async ({ ticker }) => ({ ticker: ticker.toUpperCase(), cik: await tickerToCik(ticker) }),
  }),

  tool({
    name: "sec_xbrl_frames",
    title: "SEC EDGAR XBRL frames (one fact across all companies)",
    description:
      "Aggregates one XBRL fact, for one period, across ALL reporting companies — " +
      "the cross-sectional complement to company_concept. Period is a calendar frame: " +
      "annual durations 'CYyyyy' (e.g. CY2023), quarterly durations 'CYyyyyQn' (e.g. " +
      "CY2023Q1), or instantaneous 'CYyyyyQnI' (e.g. CY2023Q1I, balance-sheet items). " +
      "Example: { taxonomy: 'us-gaap', tag: 'AccountsPayableCurrent', unit: 'USD', period: 'CY2023Q1I' }",
    inputSchema: {
      taxonomy: z.string().default("us-gaap").describe("e.g. us-gaap, dei, ifrs-full"),
      tag: z.string().describe("XBRL tag, e.g. AccountsPayableCurrent, Revenues, Assets"),
      unit: z.string().default("USD").describe("Unit of measure, e.g. USD, shares, USD-per-shares"),
      period: z
        .string()
        .describe("Calendar frame: CY2023 (annual), CY2023Q1 (quarterly), CY2023Q1I (instantaneous)"),
    },
    handler: ({ taxonomy, tag, unit, period }) =>
      httpGet(`${DATA}/api/xbrl/frames/${taxonomy}/${tag}/${unit}/${period}.json`, {
        headers: headers(),
      }),
  }),
];
