import { z } from "zod";
import { httpGet } from "../lib/http.js";
import { tool } from "../lib/tool.js";
import { config } from "../config.js";

/**
 * OpenSky Network — live & historical flight/aircraft tracking. Works
 * anonymously (lower limits); optional OAuth2 client credentials raise limits.
 * https://openskynetwork.github.io/opensky-api/rest.html
 */
const BASE = "https://opensky-network.org/api";
const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

let tokenCache: { token: string; expires: number } | null = null;

/** Fetch an OAuth2 access token if client credentials are configured. */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { openSkyClientId, openSkyClientSecret } = config;
  if (!openSkyClientId || !openSkyClientSecret) return {};

  const now = Date.now();
  if (tokenCache && tokenCache.expires > now) {
    return { Authorization: `Bearer ${tokenCache.token}` };
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: openSkyClientId,
    client_secret: openSkyClientSecret,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return {}; // fall back to anonymous on auth failure
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    expires: now + (json.expires_in - 30) * 1000,
  };
  return { Authorization: `Bearer ${json.access_token}` };
}

export const openSkyTools = [
  tool({
    name: "flights_live_states",
    title: "Live aircraft states (OpenSky)",
    description:
      "Live state vectors (position, altitude, velocity, callsign) for aircraft. " +
      "Optionally bound to a lat/lon box. Useful for tracking corporate-jet and " +
      "supply-chain air activity.",
    inputSchema: {
      lamin: z.number().min(-90).max(90).optional().describe("Min latitude"),
      lomin: z.number().min(-180).max(180).optional().describe("Min longitude"),
      lamax: z.number().min(-90).max(90).optional().describe("Max latitude"),
      lomax: z.number().min(-180).max(180).optional().describe("Max longitude"),
      icao24: z.string().optional().describe("Filter by aircraft ICAO24 hex id"),
    },
    handler: async (args) =>
      httpGet(`${BASE}/states/all`, {
        headers: await getAuthHeaders(),
        params: args,
      }),
  }),

  tool({
    name: "flights_by_aircraft",
    title: "Flights by aircraft (OpenSky)",
    description:
      "Flights flown by a specific aircraft (ICAO24) within a time window. " +
      "Time window must be <= 30 days. Unix epoch seconds.",
    inputSchema: {
      icao24: z.string().describe("Aircraft ICAO24 hex id, lowercase"),
      begin: z.number().int().describe("Start time, Unix epoch seconds"),
      end: z.number().int().describe("End time, Unix epoch seconds"),
    },
    handler: async ({ icao24, begin, end }) =>
      httpGet(`${BASE}/flights/aircraft`, {
        headers: await getAuthHeaders(),
        params: { icao24: icao24.toLowerCase(), begin, end },
      }),
  }),

  tool({
    name: "flights_by_airport",
    title: "Arrivals/departures by airport (OpenSky)",
    description:
      "Flights arriving at or departing from an airport (ICAO code) within a time " +
      "window (<= 7 days). Unix epoch seconds.",
    inputSchema: {
      airport: z.string().describe("Airport ICAO code, e.g. KJFK, EGLL"),
      direction: z.enum(["arrival", "departure"]).default("departure"),
      begin: z.number().int().describe("Start time, Unix epoch seconds"),
      end: z.number().int().describe("End time, Unix epoch seconds"),
    },
    handler: async ({ airport, direction, begin, end }) =>
      httpGet(`${BASE}/flights/${direction}`, {
        headers: await getAuthHeaders(),
        params: { airport: airport.toUpperCase(), begin, end },
      }),
  }),

  tool({
    name: "flights_track",
    title: "Flight track / waypoints (OpenSky)",
    description:
      "Trajectory (waypoints: time, lat, lon, baro altitude, heading, on-ground) " +
      "for a single aircraft. Use time=0 for the live/most-recent track, or a Unix " +
      "epoch-seconds value within a flight to fetch that historical track (OpenSky " +
      "only retains historical tracks for a limited window). Verified to work " +
      "anonymously, but may require OpenSky credentials under heavy load. " +
      "Example: { icao24: '39de4f', time: 0 }",
    inputSchema: {
      icao24: z.string().describe("Aircraft ICAO24 hex id, lowercase"),
      time: z
        .number()
        .int()
        .default(0)
        .describe("Unix epoch seconds within the flight, or 0 for the live track"),
    },
    handler: async ({ icao24, time }) =>
      httpGet(`${BASE}/tracks/all`, {
        headers: await getAuthHeaders(),
        params: { icao24: icao24.toLowerCase(), time },
      }),
  }),
];
