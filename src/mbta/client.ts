import { politeFetch } from '../net/politeFetch'
import { readDocument, type Document } from './jsonApi'

const API_BASE = 'https://api-v3.mbta.com'
/** Keyless limit is 20 requests/minute; this caps us at 15. */
const MIN_INTERVAL_MS = 4_000

/** All subway routes: Red, Mattapan, Orange, Green B–E, Blue. */
export const SUBWAY_ROUTE_IDS = ['Red', 'Mattapan', 'Orange', 'Green-B', 'Green-C', 'Green-D', 'Green-E', 'Blue']

/** GET a JSON:API path from the MBTA v3 API (no key: 20 requests/minute). */
export async function fetchMbta(path: string, params: Record<string, string>): Promise<Document> {
  const url = new URL(path, API_BASE)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))

  const response = await politeFetch('mbta', url.toString(), MIN_INTERVAL_MS)
  return readDocument(await response.json())
}
