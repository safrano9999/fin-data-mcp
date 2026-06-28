import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { cached } from "../lib/cache.js";
import { tool } from "../lib/tool.js";
import { config } from "../config.js";

/**
 * House & Senate Stock Watcher — US lawmaker stock transactions.
 *
 * NOTE: the original S3 buckets went private (403). This provider defaults to the
 * community GitHub mirror; override HOUSE_STOCK_WATCHER_URL / SENATE_STOCK_WATCHER_URL
 * if the mirror moves. Payloads are large, so results are filtered/limited here.
 */
const HOUR = 60 * 60 * 1000;

interface Transaction {
  representative?: string;
  senator?: string;
  ticker?: string;
  transaction_date?: string;
  type?: string;
  amount?: string;
  [k: string]: unknown;
}

async function loadAll(url: string, cacheKey: string): Promise<Transaction[]> {
  const data = await cached<Transaction[]>(
    cacheKey,
    () => httpGet<Transaction[]>(url, { timeoutMs: 30000 }),
    6 * HOUR,
  );
  if (!Array.isArray(data)) {
    throw new Error(
      `Unexpected response from ${url}. The Stock Watcher mirror may have moved — ` +
        `set HOUSE_STOCK_WATCHER_URL / SENATE_STOCK_WATCHER_URL.`,
    );
  }
  return data;
}

/**
 * Normalize a Stock Watcher transaction_date to YYYY-MM-DD for comparison.
 * The mirrors store dates as MM/DD/YYYY; some rows are blank or malformed.
 */
function isoDate(raw: unknown): string {
  const s = String(raw ?? "").trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, mm = "", dd = "", yyyy = ""] = m;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  // Already ISO-ish (YYYY-MM-DD) — keep as-is for direct comparison.
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return "";
}

function filterAndLimit(
  rows: Transaction[],
  opts: {
    ticker?: string;
    person?: string;
    startDate?: string;
    endDate?: string;
    limit: number;
  },
): Transaction[] {
  let out = rows;
  if (opts.ticker) {
    const t = opts.ticker.toUpperCase();
    out = out.filter((r) => (r.ticker ?? "").toUpperCase() === t);
  }
  if (opts.person) {
    const p = opts.person.toLowerCase();
    out = out.filter((r) =>
      `${r.representative ?? ""}${r.senator ?? ""}`.toLowerCase().includes(p),
    );
  }
  // Date-range filter on transaction_date (inclusive). Rows with no parseable
  // date are dropped only when a bound is supplied.
  if (opts.startDate || opts.endDate) {
    out = out.filter((r) => {
      const d = isoDate(r.transaction_date);
      if (!d) return false;
      if (opts.startDate && d < opts.startDate) return false;
      if (opts.endDate && d > opts.endDate) return false;
      return true;
    });
  }
  // Most recent first when a date is present.
  out = [...out].sort((a, b) =>
    isoDate(b.transaction_date).localeCompare(isoDate(a.transaction_date)),
  );
  return out.slice(0, opts.limit);
}

export const stockWatcherTools = [
  tool({
    name: "congress_house_trades",
    title: "US House stock trades",
    description:
      "US House of Representatives stock transactions (Stock Watcher). Filter by " +
      "ticker, representative name, and/or transaction-date range; returns the most " +
      "recent matches. Example: { ticker: 'NVDA', startDate: '2024-01-01' }",
    inputSchema: {
      ticker: z.string().optional().describe("Stock ticker, e.g. NVDA"),
      person: z.string().optional().describe("Representative name (substring match)"),
      startDate: z
        .string()
        .optional()
        .describe("Earliest transaction date, inclusive (YYYY-MM-DD)"),
      endDate: z
        .string()
        .optional()
        .describe("Latest transaction date, inclusive (YYYY-MM-DD)"),
      limit: z.number().int().min(1).max(500).default(50),
    },
    handler: async ({ ticker, person, startDate, endDate, limit }) => {
      const rows = await loadAll(config.houseStockWatcherUrl, "sw:house");
      return filterAndLimit(rows, { ticker, person, startDate, endDate, limit });
    },
  }),

  tool({
    name: "congress_senate_trades",
    title: "US Senate stock trades",
    description:
      "US Senate stock transactions (Stock Watcher). Filter by ticker, senator " +
      "name, and/or transaction-date range; returns the most recent matches. " +
      "Example: { person: 'Tuberville', startDate: '2023-01-01', endDate: '2023-12-31' }",
    inputSchema: {
      ticker: z.string().optional().describe("Stock ticker, e.g. NVDA"),
      person: z.string().optional().describe("Senator name (substring match)"),
      startDate: z
        .string()
        .optional()
        .describe("Earliest transaction date, inclusive (YYYY-MM-DD)"),
      endDate: z
        .string()
        .optional()
        .describe("Latest transaction date, inclusive (YYYY-MM-DD)"),
      limit: z.number().int().min(1).max(500).default(50),
    },
    handler: async ({ ticker, person, startDate, endDate, limit }) => {
      const rows = await loadAll(config.senateStockWatcherUrl, "sw:senate");
      return filterAndLimit(rows, { ticker, person, startDate, endDate, limit });
    },
  }),
];
