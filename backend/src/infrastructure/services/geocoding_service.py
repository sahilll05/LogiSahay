"""
geocoding_service.py

Two-layer geocoding strategy — zero hardcoding:

Layer 1 (fast path): SQLite cache (built from IN.csv, keyed by pincode)
Layer 2 (fallback): OpenStreetMap Nominatim API (free, no key required)

On first miss → Nominatim is queried → result is written back to SQLite
so the next request for the same PIN is instant.

Nominatim ToS: max 1 req/sec, must send User-Agent header — both enforced here.
"""

import sqlite3
import os
import asyncio
import httpx
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Rate-limit state (Nominatim: 1 req/sec)
_last_nominatim_call: float = 0.0
_NOMINATIM_MIN_INTERVAL = 1.1  # seconds between calls

class GeocodingService:
    def __init__(self):
        # db_path works whether uvicorn is run from /backend or project root
        cwd = os.getcwd()
        if os.path.exists(os.path.join(cwd, "pincodes.db")):
            self.db_path = os.path.join(cwd, "pincodes.db")
        else:
            self.db_path = os.path.join(cwd, "backend", "pincodes.db")

    # ── Layer 1: SQLite cache ──────────────────────────────────────────────────

    def _db_lookup(self, pincode: str) -> Optional[dict]:
        """Returns cached coords from SQLite, or None if not found."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT city, state, latitude, longitude FROM pincodes WHERE pincode = ?",
                (pincode,)
            )
            row = cursor.fetchone()
            conn.close()

            if row:
                return {
                    "city": row[0] or "Unknown",
                    "state": row[1] or "India",
                    "lat": row[2],
                    "lng": row[3],
                }
        except Exception as e:
            logger.warning(f"SQLite lookup error for {pincode}: {e}")
        return None

    def _db_upsert(self, pincode: str, city: str, state: str, lat: float, lng: float):
        """Write or update a PIN's coordinates in SQLite (cache-back after Nominatim hit)."""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.execute(
                """
                INSERT INTO pincodes (pincode, city, state, latitude, longitude) VALUES (?,?,?,?,?)
                ON CONFLICT(pincode) DO UPDATE SET
                    city=excluded.city, state=excluded.state,
                    latitude=excluded.latitude, longitude=excluded.longitude
                """,
                (pincode, city, state, lat, lng),
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning(f"SQLite upsert error for {pincode}: {e}")

    # ── Layer 2: Nominatim API ─────────────────────────────────────────────────

    async def _nominatim_lookup(self, pincode: str) -> Optional[dict]:
        """
        Queries OpenStreetMap Nominatim for a PIN code.
        Respects 1 req/sec rate limit.
        """
        global _last_nominatim_call

        # Enforce rate limit
        wait = _NOMINATIM_MIN_INTERVAL - (time.monotonic() - _last_nominatim_call)
        if wait > 0:
            await asyncio.sleep(wait)

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={
                        "postalcode": pincode,
                        "country": "IN",
                        "format": "json",
                        "limit": 1,
                        "addressdetails": 1,
                    },
                    headers={"User-Agent": "LogiSahay/1.0 (+https://logisahay.com)"},
                    timeout=8.0,
                )
                _last_nominatim_call = time.monotonic()

                data = resp.json()
                if not data:
                    return None

                hit = data[0]
                lat = float(hit["lat"])
                lng = float(hit["lon"])
                addr = hit.get("address", {})
                city  = (
                    addr.get("city")
                    or addr.get("town")
                    or addr.get("village")
                    or addr.get("county")
                    or addr.get("state_district")
                    or "Unknown"
                )
                state = addr.get("state", "India")

                logger.info(f"Nominatim resolved {pincode} → {city}, {state} ({lat}, {lng})")
                return {"city": city, "state": state, "lat": lat, "lng": lng}

        except Exception as e:
            logger.warning(f"Nominatim error for {pincode}: {e}")
            return None

    # ── Public interface ───────────────────────────────────────────────────────

    async def get_coordinates(self, pincode: str) -> Optional[dict]:
        """
        Returns coordinates for a PIN code.

        1. Checks SQLite cache (fast, from CSV import).
        2. On miss → queries Nominatim → caches result in SQLite.
        3. Returns None if both sources fail.
        """
        # Fast path
        result = self._db_lookup(pincode)
        if result:
            return result

        # Slow path: Nominatim
        logger.info(f"PIN {pincode} not in cache, querying Nominatim...")
        nominatim = await self._nominatim_lookup(pincode)
        if nominatim:
            self._db_upsert(
                pincode,
                nominatim["city"],
                nominatim["state"],
                nominatim["lat"],
                nominatim["lng"],
            )
            return nominatim

        return None


# Global singleton
geocoding_service = GeocodingService()
