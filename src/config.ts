/**
 * Runtime configuration. Everything is optional — the server runs fully against
 * no-key public APIs out of the box. Keys/credentials here only unlock higher
 * rate limits or optional providers.
 */
export const config = {
  /** SEC EDGAR requires a descriptive User-Agent with a contact. */
  secUserAgent:
    process.env.SEC_USER_AGENT ?? "fin-data-mcp (contact: set SEC_USER_AGENT)",

  /** OpenSky OAuth2 client credentials (optional — raises rate limit). */
  openSkyClientId: process.env.OPENSKY_CLIENT_ID,
  openSkyClientSecret: process.env.OPENSKY_CLIENT_SECRET,

  /** Ember Energy free API key (required by Ember as of 2026). */
  emberApiKey: process.env.EMBER_API_KEY,

  /** Tiingo free API key — premium equities backup (EOD + IEX intraday). */
  tiingoApiKey: process.env.TIINGO_API_KEY,

  // --- Optional keyed providers (tools only register when the key is set) ---
  /** FRED (St. Louis Fed) — macro/economic series. */
  fredApiKey: process.env.FRED_API_KEY,
  /** Finnhub — real-time US stocks + fundamentals. */
  finnhubApiKey: process.env.FINNHUB_API_KEY,
  /** Alpha Vantage — commodities, equities, FX, macro. */
  alphaVantageApiKey: process.env.ALPHAVANTAGE_API_KEY,
  /** EIA — US Energy Information Administration. */
  eiaApiKey: process.env.EIA_API_KEY,
  /** Quiver Quantitative — congressional trades, lobbying, contracts. */
  quiverApiKey: process.env.QUIVER_API_KEY,

  /**
   * Stock Watcher source. The original S3 buckets went private; default to the
   * community GitHub mirror. Override if you host your own copy.
   */
  houseStockWatcherUrl:
    process.env.HOUSE_STOCK_WATCHER_URL ??
    "https://raw.githubusercontent.com/TattooedHead/house-stock-watcher-data/main/data/all_transactions.json",
  senateStockWatcherUrl:
    process.env.SENATE_STOCK_WATCHER_URL ??
    "https://raw.githubusercontent.com/timothycarambat/senate-stock-watcher-data/master/aggregate/all_transactions.json",

  httpTimeoutMs: Number(process.env.HTTP_TIMEOUT_MS ?? 15000),
  cacheTtlMs: Number(process.env.CACHE_TTL_MS ?? 60000),

  /** Browser-like UA used for endpoints that reject default fetch UAs (Yahoo). */
  browserUserAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
} as const;
