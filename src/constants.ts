/** Shared constants. */

/**
 * Max characters in a tool's text response before it is truncated. Keeps large
 * payloads (e.g. SEC companyfacts, full instrument lists) from flooding the
 * model's context. Handlers should still paginate/limit at the source.
 */
export const CHARACTER_LIMIT = 25_000;

/** Default page size for list-style tools. */
export const DEFAULT_PAGE_SIZE = 50;
