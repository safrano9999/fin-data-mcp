import { config } from "../config.js";

interface Entry<T> {
  value: T;
  expires: number;
}

const store = new Map<string, Entry<unknown>>();

/** Wrap an async fn with a simple in-memory TTL cache keyed by `key`. */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = config.cacheTtlMs,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as T;
  const value = await fn();
  store.set(key, { value, expires: now + ttlMs });
  return value;
}
