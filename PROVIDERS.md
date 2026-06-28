# Provider inventory & roadmap

Status of every source across the 13 categories. ✅ = implemented (live in this
server). 🔑 = key-required, scaffolding-ready (see "Adding a keyed provider").
⛔ = currently unavailable / broken.

Legend for "Key": **No** = works with zero config; **Free key** = free signup;
**Account** = free brokerage/demo account.

## 1. Stocks
| API | Key | Status | Notes |
| --- | --- | --- | --- |
| Yahoo Finance | No | ✅ `yahoo_chart` / `yahoo_quote` / `yahoo_search` / `yahoo_quote_summary` (fundamentals) / `yahoo_recommendations` / `yahoo_spark` | Primary; unofficial, IP rate-limited |
| Cboe | No | ✅ `cboe_quote` / `cboe_history` | Independent no-key backend (delayed) |
| Tiingo | Free key | ✅ `tiingo_eod_prices` / `tiingo_metadata` / `tiingo_iex_intraday` | Premium backup |
| Finnhub | Free key | ✅ `finnhub_*` (8 tools) | Key-gated; 60/min; real-time + fundamentals |
| Alpaca | Free key | 🔑 | IEX real-time + historical; 5 req/s |

## 2. Indices
| API | Key | Status | Notes |
| --- | --- | --- | --- |
| Yahoo Finance | No | ✅ via `yahoo_chart` (`^GSPC`, `^DJI`, `^IXIC`, `^VIX`) | |
| Cboe | No | ✅ `cboe_quote` / `cboe_history` (`_SPX`, `_VIX`, `_DJI`, `_NDX`) | No-key backup |
| Twelve Data | Free key | 🔑 | 8 req/s, 800/day |
| Financial Modeling Prep | Free key | 🔑 | 250/day |

## 3. Options
| API | Key | Status | Notes |
| --- | --- | --- | --- |
| Cboe | No | ✅ `cboe_options_chain` | No-key, no-crumb full chain + greeks/IV |
| Yahoo Finance | No | ✅ `yahoo_options_chain` | Auto cookie+crumb handshake |
| Tradier | Account | 🔑 | Free sandbox brokerage account |
| ThetaData | Free key | 🔑 | EOD + limited real-time |

## 4. Forex / Currency
| API | Key | Status | Notes |
| --- | --- | --- | --- |
| Frankfurter (ECB) | No | ✅ `fx_latest_rates` / `fx_historical_rate` / `fx_timeseries` / `fx_list_currencies` | |
| ExchangeRate-API | No | ✅ `fx_open_rates` | Open endpoint; second source |
| OANDA Practice | Account | 🔑 | Streaming FX/CFD; demo account |

## 5. Commodities
| API | Key | Status | Notes |
| --- | --- | --- | --- |
| World Bank | No | ✅ `worldbank_indicator` (Pink Sheet codes) | Historical/macro |
| Alpha Vantage | Free key | ✅ `av_commodity` / `av_economic_indicator` / `av_time_series_daily` / `av_global_quote` / `av_fx_daily` | Key-gated; 25/day; oil, gas, metals, grains |
| EIA | Free key | ✅ `eia_data` / `eia_browse_route` | Key-gated; energy commodities |

## 6. Futures (crypto perps)
| API | Key | Status | Notes |
| --- | --- | --- | --- |
| OKX | No | ✅ `crypto_*` (7 tools) | Perpetual swaps + spot; US-accessible |
| Binance USDⓈ-M | No | ⛔ dropped | `fapi` returns HTTP 451 to US IPs → replaced by OKX |
| Databento | Free key | 🔑 | 250k msgs/mo; CME futures |
| Tradovate | Account | 🔑 | Streaming US futures; demo account |

## 7. Energy
| API | Key | Status | Notes |
| --- | --- | --- | --- |
| Ember | Free key | ✅ `energy_ember_series` (gated on `EMBER_API_KEY`) | Became key-required in 2026 |
| EIA | Free key | ✅ `eia_data` / `eia_browse_route` | Key-gated; definitive US energy data |
| ENTSO-E | Free key | 🔑 | European grid; registration required |

## 8. Prediction Markets
| API | Key | Status | Notes |
| --- | --- | --- | --- |
| Polymarket | No | ✅ `polymarket_*` (4 tools) | Gamma + CLOB |
| Kalshi | No | ✅ `kalshi_*` (6 tools) | Read endpoints public |
| Manifold | No | ✅ `manifold_*` (3 tools) | Play-money sentiment |

## 9. Market-Moving News
| API | Key | Status | Notes |
| --- | --- | --- | --- |
| SEC EDGAR | No | ✅ `sec_*` (5 tools) | Needs `SEC_USER_AGENT` |
| FRED | Free key | ✅ `fred_series_observations` / `fred_series_info` / `fred_search_series` / `fred_releases` | Key-gated; macro + central-bank data |
| NewsData.io | Free key | 🔑 | 200/day; geopolitics |

## 10. Macroeconomic & Demographic
| API | Key | Status | Notes |
| --- | --- | --- | --- |
| World Bank | No | ✅ (see Commodities) | GDP, demographics, trade |
| OECD | No | ✅ `oecd_data` / `oecd_dataflows` | SDMX-JSON |
| DBnomics | No | ✅ `dbnomics_*` (3 tools) | Aggregates IMF, Eurostat, BIS, ECB… |

## 11. Alternative Data (Flight & Shipping)
| API | Key | Status | Notes |
| --- | --- | --- | --- |
| OpenSky | No (key optional) | ✅ `flights_*` (3 tools) | OAuth2 for higher limits |
| AISStream.io | Free key | 🔑 | WebSocket maritime AIS |
| AirLabs | Free key | 🔑 | 1,000/mo aviation |

## 12. Sentiment & Social
| API | Key | Status | Notes |
| --- | --- | --- | --- |
| Alternative.me | No | ✅ `crypto_fear_greed_index` | |
| Reddit | Free key | 🔑 | OAuth; r/wallstreetbets activity |
| StockTwits | Free key | 🔑 | Ticker sentiment feeds |

## 13. Insider & Congressional Trading
| API | Key | Status | Notes |
| --- | --- | --- | --- |
| House Stock Watcher | No | ✅ `congress_house_trades` | S3 dead, 1st mirror dead → `TattooedHead` mirror; +date filters |
| Senate Stock Watcher | No | ✅ `congress_senate_trades` | GitHub mirror; +date filters |
| Quiver Quantitative | Free key | ✅ `quiver_congress_trading` / `quiver_lobbying` / `quiver_gov_contracts` / `quiver_insider_trading` | Key-gated; ~1,000/mo |
| OpenSecrets | Free key | 🔑 | 200/day; campaign finance |

---

## Coverage summary

- **83 no-key tools (15 providers) always on**; with optional free keys, **up to
  110 tools across 22 providers**. All endpoints verified returning 200 from a US
  IP (2026-06-28).
- **Conditional registration**: strictly-keyed providers (FRED, Finnhub, Alpha
  Vantage, EIA, Quiver, Tiingo, Ember) register their tools ONLY when their key is
  set — with no keys, they never appear in `tools/list`, so nothing broken/unusable
  is exposed. They remain visible in `fin-data://catalog` as "set `X` to enable".
  OpenSky is optional-key (works anonymously) so it always registers.
- Equities are triple-sourced: `yahoo_*` (primary, no-key), `cboe_*` (independent
  no-key backup incl. options + 20yr history), `tiingo_*` (premium, free key).
- Substitutions made after live verification: **OKX** replaces Binance (US 451);
  **Ember** moved to free-key after it changed its policy; **Stock Watcher** House
  feed re-pointed twice as mirrors died (now `TattooedHead/house-stock-watcher-data`).
- Built to MCP best practices: read-only annotations on every tool, Zod input
  validation, structuredContent, ~25k-char truncation, actionable error mapping,
  server instructions, and a `fin-data://catalog` discovery resource.

## Adding a keyed provider

The architecture makes keyed providers drop-in (the 🔑 rows above are candidates):

1. Add the key to `src/config.ts` (read from `process.env`), and document it in
   `.env.example`.
2. Create `src/providers/<name>.ts` exporting `<name>Tools` — an array of
   `tool({...})`. Use `httpGet` from `lib/http.ts` and inject the key via `params`
   or `headers`. Throw a clear `requireKey()` error if the key is missing (see
   `fred.ts` / `quiver.ts` for the pattern).
3. Register it in `src/providers/index.ts` with `enabled: !!config.<name>Key` and
   a `keyEnv` so it only appears when configured.

Remaining 🔑 candidates: **Twelve Data**, **Databento** (CME futures),
**NewsData.io** (geopolitics), **ENTSO-E** (EU grid), **OpenSecrets** (campaign
finance), **Reddit**/**StockTwits** (social sentiment).
