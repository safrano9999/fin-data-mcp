/**
 * Comprehensive live smoke test — exercises a broad sample of handlers including
 * the expanded coverage. Chains discovery calls for tools that need live ids.
 * Run: npx tsx scripts/smoke-full.ts
 */
import { allTools } from "../src/providers/index.js";

const m = new Map(allTools.map((t) => [t.name, t]));
let pass = 0;
let fail = 0;
const skips: string[] = [];

async function check(name: string, args: Record<string, unknown>): Promise<unknown> {
  const t = m.get(name);
  if (!t) {
    console.log(`✗ ${name}: NOT REGISTERED`);
    fail++;
    return undefined;
  }
  try {
    const r = await t.handler(args);
    console.log(`✓ ${name}: ${JSON.stringify(r).slice(0, 70)}`);
    pass++;
    return r;
  } catch (e) {
    console.log(`✗ ${name}: ${e instanceof Error ? e.message : String(e)}`);
    fail++;
    return undefined;
  }
}

// --- Static no-key checks across categories ---
await check("yahoo_chart", { symbol: "^GSPC", range: "5d", interval: "1d" });
await check("yahoo_quote_summary", { symbol: "AAPL", modules: "price,summaryDetail" });
await check("yahoo_recommendations", { symbol: "AAPL" });
await check("yahoo_spark", { symbols: "AAPL,MSFT", range: "5d", interval: "1d" });
await check("cboe_quote", { symbol: "AAPL" });
await check("cboe_options_chain", { symbol: "MSFT" });
await check("fx_latest_rates", { base: "USD", symbols: "EUR,JPY" });
await check("crypto_recent_trades", { instId: "BTC-USDT", limit: 5 });
await check("crypto_index_candles", { instId: "BTC-USD", bar: "1H", limit: 5 });
await check("crypto_price_limit", { instId: "BTC-USDT-SWAP" });
await check("crypto_long_short_ratio", { ccy: "BTC", period: "5m" });
await check("worldbank_sources", {});
await check("worldbank_topics", {});
await check("worldbank_country", { code: "US" });
await check("worldbank_indicator_metadata", { code: "NY.GDP.MKTP.CD" });
await check("oecd_data", { dataflow: "OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0", key: "USA.M.N.CPI.IX._T.N.GY", lastNObservations: 6 });
await check("oecd_data_structure", { agency: "OECD.SDD.TPS", dataflowId: "DSD_PRICES@DF_PRICES_ALL" });
await check("dbnomics_provider_datasets", { provider: "IMF" });
await check("dbnomics_dataset", { provider: "IMF", dataset: "AFRREO" });
await check("kalshi_exchange_status", {});
await check("kalshi_trades", { limit: 3 });
await check("manifold_groups", {});
await check("crypto_fear_greed_index", { limit: 1 });
await check("sec_xbrl_frames", { taxonomy: "us-gaap", tag: "AccountsPayableCurrent", unit: "USD", period: "CY2023Q1I" });

// --- Chained discovery checks ---
// Polymarket: list -> get_market -> midpoint via a clobTokenId
const pm = (await check("polymarket_list_markets", { limit: 1, active: true, closed: false })) as
  | Array<{ id?: string; clobTokenIds?: string }>
  | undefined;
const market = Array.isArray(pm) ? pm[0] : undefined;
if (market?.id) {
  await check("polymarket_get_market", { id: String(market.id) });
} else skips.push("polymarket_get_market (no id discovered)");
let tokenId: string | undefined;
try {
  tokenId = market?.clobTokenIds ? (JSON.parse(market.clobTokenIds)[0] as string) : undefined;
} catch { /* ignore */ }
if (tokenId) await check("polymarket_midpoint", { token_id: tokenId });
else skips.push("polymarket_midpoint (no clob token discovered)");

// Manifold: list -> get_user
const mm = (await check("manifold_list_markets", { limit: 1 })) as
  | Array<{ creatorUsername?: string }>
  | undefined;
const username = Array.isArray(mm) ? mm[0]?.creatorUsername : undefined;
if (username) await check("manifold_get_user", { username });
else skips.push("manifold_get_user (no username discovered)");

// OpenSky: states -> track
const states = (await check("flights_live_states", { lamin: 45, lomin: 5, lamax: 47, lomax: 8 })) as
  | { states?: unknown[][] }
  | undefined;
const icao = states?.states?.[0]?.[0] as string | undefined;
if (icao) await check("flights_track", { icao24: icao });
else skips.push("flights_track (no aircraft discovered)");

console.log(`\n${pass}/${pass + fail} checks passed.`);
if (skips.length) console.log(`Skipped (no live id): ${skips.join("; ")}`);
console.log(`Total registered tools: ${allTools.length}`);
process.exit(fail > 0 ? 1 : 0);
