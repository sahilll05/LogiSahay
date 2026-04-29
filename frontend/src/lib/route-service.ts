/**
 * route-service.ts
 * Fetches driving routes from the OSRM public API.
 * Caches results in-memory keyed by "fromPIN-toPIN" to avoid repeat calls.
 *
 * OSRM API:
 *   https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}
 *   ?overview=full&geometries=geojson
 */

import { api, PinCoords } from './api'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RoutePoint {
  pin: string
  coord: PinCoords
}


export interface RouteResult {
  from: RoutePoint
  to: RoutePoint
  /** GeoJSON coordinate array [[lng, lat], ...] */
  geometry: [number, number][]
  /** Distance in kilometres, rounded to 1 decimal */
  distanceKm: number
  /** Duration in seconds (raw) */
  durationSec: number
  /** Human-readable duration string e.g. "3 hrs 20 min" */
  durationLabel: string
}

export type RouteError =
  | { code: 'INVALID_PIN'; pin: string }
  | { code: 'SAME_LOCATION' }
  | { code: 'API_ERROR'; message: string }
  | { code: 'NO_ROUTE' }

export type RouteResponse =
  | { ok: true; data: RouteResult }
  | { ok: false; error: RouteError }

// ─── In-memory route cache ─────────────────────────────────────────────────────
const _routeCache = new Map<string, RouteResponse>()

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const totalMin = Math.round(seconds / 60)
  if (totalMin < 60) return `${totalMin} min`
  const hrs = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`
}

function cacheKey(fromPin: string, toPin: string) {
  return `${fromPin}-${toPin}`
}

// ─── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetches a driving route between two Indian PIN codes.
 * Uses OSRM public API for routing, local dataset for geocoding.
 * Results are cached for the session to avoid redundant network calls.
 */
export async function fetchRoute(
  fromPin: string,
  toPin: string
): Promise<RouteResponse> {
  const key = cacheKey(fromPin, toPin)

  // Return cached result if available
  if (_routeCache.has(key)) {
    return _routeCache.get(key)!
  }

  // Fetch coordinates from Backend (which uses the local 150k dataset)
  let fromCoord: PinCoords
  let toCoord: PinCoords

  try {
    const [fromRes, toRes] = await Promise.all([
      api.getPinCoords(fromPin),
      api.getPinCoords(toPin)
    ])
    fromCoord = fromRes
    toCoord = toRes
  } catch (err: any) {
    // If 404, it means the PIN isn't in the dataset
    return {
      ok: false,
      error: { code: 'INVALID_PIN', pin: fromPin } // Simplification: just saying invalid
    }
  }


  // Check same-location edge case
  if (fromPin === toPin) {
    const resp: RouteResponse = { ok: false, error: { code: 'SAME_LOCATION' } }
    _routeCache.set(key, resp)
    return resp
  }

  // Build OSRM URL — coordinate order is lng,lat for OSRM
  const osrmUrl =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${fromCoord.lng},${fromCoord.lat};${toCoord.lng},${toCoord.lat}` +
    `?overview=full&geometries=geojson`

  try {
    const res = await fetch(osrmUrl, {
      // 10-second timeout via AbortController
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      const resp: RouteResponse = {
        ok: false,
        error: { code: 'API_ERROR', message: `OSRM HTTP ${res.status}` },
      }
      _routeCache.set(key, resp)
      return resp
    }

    const json = await res.json()

    // OSRM returns code "Ok" on success
    if (json.code !== 'Ok' || !json.routes?.length) {
      const resp: RouteResponse = { ok: false, error: { code: 'NO_ROUTE' } }
      _routeCache.set(key, resp)
      return resp
    }

    const route = json.routes[0]
    const geometry: [number, number][] =
      route.geometry?.coordinates ?? []
    const distanceKm = Math.round((route.distance / 1000) * 10) / 10
    const durationSec: number = route.duration

    const result: RouteResponse = {
      ok: true,
      data: {
        from: { pin: fromPin, coord: fromCoord },
        to: { pin: toPin, coord: toCoord },
        geometry,
        distanceKm,
        durationSec,
        durationLabel: formatDuration(durationSec),
      },
    }

    _routeCache.set(key, result)
    return result
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Network error contacting OSRM'
    const resp: RouteResponse = {
      ok: false,
      error: { code: 'API_ERROR', message },
    }
    // Don't cache network errors — allow retry
    return resp
  }
}

/** Clears the entire route cache (useful for testing) */
export function clearRouteCache() {
  _routeCache.clear()
}
