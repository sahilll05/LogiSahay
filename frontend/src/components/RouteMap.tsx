'use client'

/**
 * RouteMap.tsx
 * Interactive Leaflet.js map showing a driving route between two PIN codes.
 *
 * Props:
 *   fromPin     — source 6-digit PIN
 *   toPin       — destination 6-digit PIN
 *   bestCourier — optional: name of best courier to show in the info panel
 *   onClose     — optional: callback to close/hide the map
 *
 * Uses:
 *   - react-leaflet for map rendering (Leaflet.js + OpenStreetMap)
 *   - OSRM public API for route geometry (via route-service.ts)
 *   - Local PIN dataset for geocoding (via pincode-coordinates.ts)
 */

import { useEffect, useState, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchRoute, RouteResult, RouteError } from '@/lib/route-service'
import {
  MapPin,
  Clock,
  Route,
  Loader2,
  AlertTriangle,
  RefreshCw,
  X,
  Truck,
  Navigation,
} from 'lucide-react'

// ─── Fix Leaflet default icon paths (Next.js / webpack issue) ──────────────────
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ─── Custom marker icons ───────────────────────────────────────────────────────
const greenIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50% 50% 50% 0;
    background:#22c55e;border:3px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
    transform:rotate(-45deg);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -30],
})

const redIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50% 50% 50% 0;
    background:#ef4444;border:3px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
    transform:rotate(-45deg);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -30],
})

// ─── FitBounds helper (must run inside MapContainer) ──────────────────────────
function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (!coords.length) return
    // Convert [lng, lat] → Leaflet LatLng [lat, lng]
    const latLngs = coords.map(([lng, lat]) => L.latLng(lat, lng))
    const bounds = L.latLngBounds(latLngs)
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 })
  }, [map, coords])
  return null
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface RouteMapProps {
  fromPin: string
  toPin: string
  bestCourier?: string
  bestCourierReliability?: number
  onClose?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function RouteMap({
  fromPin,
  toPin,
  bestCourier,
  bestCourierReliability,
  onClose,
}: RouteMapProps) {
  const [routeData, setRouteData] = useState<RouteResult | null>(null)
  const [routeError, setRouteError] = useState<RouteError | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  const loadRoute = async () => {
    setLoading(true)
    setRouteError(null)
    setRouteData(null)
    fetchedRef.current = true

    const result = await fetchRoute(fromPin, toPin)

    if (result.ok) {
      setRouteData(result.data)
    } else {
      setRouteError(result.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!fetchedRef.current) {
      loadRoute()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromPin, toPin])

  // Convert geometry from [lng, lat] to Leaflet [lat, lng]
  const polylinePositions: [number, number][] =
    routeData?.geometry.map(([lng, lat]) => [lat, lng]) ?? []

  // ─── Error state ─────────────────────────────────────────────────────────
  const getErrorMessage = (err: RouteError): string => {
    switch (err.code) {
      case 'INVALID_PIN':
        return `PIN code ${err.pin} is not in our local dataset. Try a major city PIN.`
      case 'SAME_LOCATION':
        return 'Source and destination PIN codes are the same.'
      case 'NO_ROUTE':
        return 'No driveable route found between these locations.'
      case 'API_ERROR':
        return `Routing service error: ${err.message}. Please retry.`
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-md">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/10 flex items-center justify-center">
            <Navigation className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-foreground">
              Route Map
            </div>
            <div className="text-[11px] text-muted-foreground">
              {fromPin} → {toPin} · OpenStreetMap + OSRM
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Loading state ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center h-[340px] gap-3 bg-muted/10">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-[13px] text-muted-foreground">
            Calculating route via OSRM…
          </p>
        </div>
      )}

      {/* ── Error state ── */}
      {!loading && routeError && (
        <div className="flex flex-col items-center justify-center h-[340px] gap-4 px-6">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div className="text-center">
            <p className="text-[13px] font-medium text-foreground mb-1">
              Route Unavailable
            </p>
            <p className="text-[12px] text-muted-foreground max-w-xs">
              {getErrorMessage(routeError)}
            </p>
          </div>
          {routeError.code === 'API_ERROR' && (
            <button
              onClick={loadRoute}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[12px] font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}
        </div>
      )}

      {/* ── Map ── */}
      {!loading && routeData && (
        <>
          {/* Leaflet map container */}
          <div className="relative" style={{ height: '380px' }}>
            <MapContainer
              center={[routeData.from.coord.lat, routeData.from.coord.lng]}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
              scrollWheelZoom={true}
            >
              {/* OpenStreetMap tiles */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Auto-fit to route bounds */}
              <FitBounds coords={routeData.geometry} />

              {/* Source marker (green) */}
              <Marker
                position={[routeData.from.coord.lat, routeData.from.coord.lng]}
                icon={greenIcon}
              >
                <Popup>
                  <div className="text-center py-0.5">
                    <div className="font-semibold text-[13px] text-green-700">
                      📦 Source
                    </div>
                    <div className="text-[12px] font-medium mt-0.5">
                      {routeData.from.coord.city}, {routeData.from.coord.state}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      PIN: {routeData.from.pin}
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Destination marker (red) */}
              <Marker
                position={[routeData.to.coord.lat, routeData.to.coord.lng]}
                icon={redIcon}
              >
                <Popup>
                  <div className="text-center py-0.5">
                    <div className="font-semibold text-[13px] text-red-600">
                      🎯 Destination
                    </div>
                    <div className="text-[12px] font-medium mt-0.5">
                      {routeData.to.coord.city}, {routeData.to.coord.state}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      PIN: {routeData.to.pin}
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Route polyline (blue) */}
              <Polyline
                positions={polylinePositions}
                pathOptions={{
                  color: '#4f46e5',
                  weight: 4,
                  opacity: 0.85,
                  dashArray: undefined,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </MapContainer>

            {/* ── Distance badge overlay ── */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-2 shadow-lg flex items-center gap-2">
              <Route className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-[13px] font-bold text-slate-900">
                {routeData.distanceKm} km
              </span>
            </div>
          </div>

          {/* ── Info Panel ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-t border-border">

            {/* Distance */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-r border-border">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Route className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Distance
                </div>
                <div className="text-[15px] font-bold text-foreground">
                  {routeData.distanceKm} km
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-r border-border">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Drive Time
                </div>
                <div className="text-[15px] font-bold text-foreground">
                  {routeData.durationLabel}
                </div>
              </div>
            </div>

            {/* From → To */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-r border-border">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-green-600" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Route
                </div>
                <div className="text-[12px] font-semibold text-foreground truncate">
                  {routeData.from.coord.city} → {routeData.to.coord.city}
                </div>
              </div>
            </div>

            {/* Best Courier */}
            <div className="flex items-center gap-2.5 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Best Courier
                </div>
                {bestCourier ? (
                  <div className="text-[12px] font-semibold text-foreground">
                    {bestCourier}
                    {bestCourierReliability != null && (
                      <span className="text-[10px] text-emerald-600 font-normal ml-1">
                        {Math.round(bestCourierReliability * 100)}% reliable
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-[12px] text-muted-foreground">—</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
