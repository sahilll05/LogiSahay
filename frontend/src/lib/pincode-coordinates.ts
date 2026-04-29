/**
 * pincode-coordinates.ts
 * DEPRECATED: Geocoding has moved to the Backend to handle the large 150k+ dataset.
 * Use api.getPinCoords() from @/lib/api instead.
 */

export interface PinCoord {
  lat: number
  lng: number
  city: string
  state: string
}

// This file is now just for type definitions.
// The actual data is served via the backend /shipments/geocoding/{pin} endpoint.
