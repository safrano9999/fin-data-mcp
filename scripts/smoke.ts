/**
 * Live smoke test — exercises a handful of no-key providers against real
 * endpoints. Run with: npx tsx scripts/smoke.ts
 */
import { allTools } from "../src/providers/index.js";

const byName = new Map(allTools.map((t) => [t.name, t]));

const checks: Array<{ name: string; args: Record<string, unknown> }> = [
  { name: "fx_latest_rates", args: { base: "USD", symbols: "EUR,GBP" } },
  { name: "fx_open_rates", args: { base: "USD" } },
  { name: "worldbank_indicator", args: { country: "US", indicator: "NY.GDP.MKTP.CD", date: "2021:2022" } },
  { name: "crypto_ticker", args: { instId: "BTC-USDT-SWAP" } },
  { name: "crypto_funding_rate", args: { instId: "BTC-USDT-SWAP" } },
  { name: "crypto_fear_greed_index", args: { limit: 1 } },
  { name: "manifold_list_markets", args: { limit: 1 } },
  { name: "kalshi_list_markets", args: { limit: 1 } },
  { name: "polymarket_list_markets", args: { limit: 1 } },
  { name: "dbnomics_providers", args: {} },
  { name: "yahoo_chart", args: { symbol: "^GSPC", range: "5d", interval: "1d" } },
  { name: "flights_live_states", args: { lamin: 45, lomin: 5, lamax: 47, lomax: 8 } },
];

let pass = 0;
let fail = 0;

for (const { name, args } of checks) {
  const t = byName.get(name);
  if (!t) {
    console.log(`✗ ${name}: tool not registered`);
    fail++;
    continue;
  }
  try {
    const res = await t.handler(args);
    const preview = JSON.stringify(res).slice(0, 90);
    console.log(`✓ ${name}: ${preview}…`);
    pass++;
  } catch (err) {
    console.log(`✗ ${name}: ${err instanceof Error ? err.message : String(err)}`);
    fail++;
  }
}

console.log(`\n${pass}/${pass + fail} live checks passed (${allTools.length} tools registered).`);
process.exit(fail > 0 ? 1 : 0);
