import type { ToolDef } from "../lib/tool.js";
import { config } from "../config.js";

import { yahooTools } from "./yahoo.js";
import { cboeTools } from "./cboe.js";
import { tiingoTools } from "./tiingo.js";
import { frankfurterTools } from "./frankfurter.js";
import { exchangeRateTools } from "./exchangerate.js";
import { worldBankTools } from "./worldbank.js";
import { okxTools } from "./okx.js";
import { emberTools } from "./ember.js";
import { polymarketTools } from "./polymarket.js";
import { kalshiTools } from "./kalshi.js";
import { manifoldTools } from "./manifold.js";
import { secEdgarTools } from "./secEdgar.js";
import { oecdTools } from "./oecd.js";
import { dbnomicsTools } from "./dbnomics.js";
import { openSkyTools } from "./opensky.js";
import { alternativeMeTools } from "./alternativeme.js";
import { stockWatcherTools } from "./stockwatcher.js";
import { fredTools } from "./fred.js";
import { finnhubTools } from "./finnhub.js";
import { alphaVantageTools } from "./alphavantage.js";
import { eiaTools } from "./eia.js";
import { quiverTools } from "./quiver.js";

type KeyRequirement = "none" | "free-key" | "optional-key" | "account";

interface ProviderEntry {
  provider: string;
  category: string;
  key: KeyRequirement;
  /** Env var that unlocks this provider (for keyed providers). */
  keyEnv?: string;
  /**
   * Whether this provider's tools are registered. No-key and optional-key
   * providers are always enabled; strictly keyed providers are enabled only when
   * their key is present, so they never appear in tools/list without a key.
   */
  enabled: boolean;
  tools: ToolDef[];
}

/** Single source of truth for what this server exposes. */
const PROVIDERS: ProviderEntry[] = [
  // --- No-key (always on) ---
  { provider: "Yahoo Finance", category: "Stocks · Indices · Options · FX · Crypto", key: "none", enabled: true, tools: yahooTools },
  { provider: "Cboe", category: "Stocks · Indices · Options (no-key backup)", key: "none", enabled: true, tools: cboeTools },
  { provider: "Frankfurter (ECB)", category: "Forex", key: "none", enabled: true, tools: frankfurterTools },
  { provider: "ExchangeRate-API", category: "Forex", key: "none", enabled: true, tools: exchangeRateTools },
  { provider: "World Bank", category: "Commodities · Macro · Demographics", key: "none", enabled: true, tools: worldBankTools },
  { provider: "OKX", category: "Crypto spot + perpetual futures", key: "none", enabled: true, tools: okxTools },
  { provider: "Polymarket", category: "Prediction markets", key: "none", enabled: true, tools: polymarketTools },
  { provider: "Kalshi", category: "Prediction markets", key: "none", enabled: true, tools: kalshiTools },
  { provider: "Manifold", category: "Prediction markets", key: "none", enabled: true, tools: manifoldTools },
  { provider: "SEC EDGAR", category: "Market-moving news · Filings", key: "none", enabled: true, tools: secEdgarTools },
  { provider: "OECD", category: "Macroeconomic", key: "none", enabled: true, tools: oecdTools },
  { provider: "DBnomics", category: "Macroeconomic (100+ sources)", key: "none", enabled: true, tools: dbnomicsTools },
  { provider: "Alternative.me", category: "Sentiment", key: "none", enabled: true, tools: alternativeMeTools },
  { provider: "Stock Watcher", category: "Congressional trading", key: "none", enabled: true, tools: stockWatcherTools },

  // --- Optional key (works without; key only raises limits → always on) ---
  { provider: "OpenSky", category: "Alternative data (flights)", key: "optional-key", keyEnv: "OPENSKY_CLIENT_ID", enabled: true, tools: openSkyTools },

  // --- Strictly keyed (registered ONLY when the key is set) ---
  { provider: "Tiingo", category: "Stocks (premium backup)", key: "free-key", keyEnv: "TIINGO_API_KEY", enabled: !!config.tiingoApiKey, tools: tiingoTools },
  { provider: "Ember", category: "Energy", key: "free-key", keyEnv: "EMBER_API_KEY", enabled: !!config.emberApiKey, tools: emberTools },
  { provider: "FRED", category: "Macro · central-bank data", key: "free-key", keyEnv: "FRED_API_KEY", enabled: !!config.fredApiKey, tools: fredTools },
  { provider: "Finnhub", category: "Stocks (real-time + fundamentals)", key: "free-key", keyEnv: "FINNHUB_API_KEY", enabled: !!config.finnhubApiKey, tools: finnhubTools },
  { provider: "Alpha Vantage", category: "Commodities · Stocks · FX · Macro", key: "free-key", keyEnv: "ALPHAVANTAGE_API_KEY", enabled: !!config.alphaVantageApiKey, tools: alphaVantageTools },
  { provider: "EIA", category: "Energy · Commodities", key: "free-key", keyEnv: "EIA_API_KEY", enabled: !!config.eiaApiKey, tools: eiaTools },
  { provider: "Quiver Quantitative", category: "Congressional · lobbying · contracts · insiders", key: "free-key", keyEnv: "QUIVER_API_KEY", enabled: !!config.quiverApiKey, tools: quiverTools },
];

/** Tools that are actually registered (enabled providers only). */
export const allTools: ToolDef[] = PROVIDERS.filter((p) => p.enabled).flatMap((p) => p.tools);

// Tool names must be globally unique (check across ALL providers, even disabled,
// so a collision is caught regardless of which keys happen to be set).
const seen = new Set<string>();
for (const t of PROVIDERS.flatMap((p) => p.tools)) {
  if (seen.has(t.name)) throw new Error(`Duplicate tool name: ${t.name}`);
  seen.add(t.name);
}

/**
 * Machine-readable inventory, exposed as the `fin-data://catalog` resource.
 * Lists ALL providers (including disabled ones) so callers can discover what a
 * key would unlock, while only `enabled` providers' tools are registered.
 */
export const catalog = {
  server: "fin-data-mcp-server",
  providerCount: PROVIDERS.length,
  enabledProviderCount: PROVIDERS.filter((p) => p.enabled).length,
  registeredToolCount: allTools.length,
  providers: PROVIDERS.map((p) => ({
    provider: p.provider,
    category: p.category,
    key: p.key,
    keyEnv: p.keyEnv,
    enabled: p.enabled,
    note: p.enabled ? undefined : `Disabled — set ${p.keyEnv} to enable.`,
    tools: p.tools.map((t) => t.name),
  })),
};
