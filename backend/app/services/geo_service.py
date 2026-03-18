"""
Service — Geo Service (Unified)

Replaces: geo_verification.py (stubs only)

Four capabilities:
  1. Geocoding        — address → lat/lng coordinates
  2. Reverse geocoding — lat/lng → structured address
  3. Geofence verify  — is point within radius of site?
  4. Address verify   — is this a real deliverable address?

External dependencies:
  - Google Maps Geocoding API (geocode, reverse, verify)
  - geopy (distance calculation — no API key needed)
  - Pillow (EXIF extraction — no API key needed)

Configuration:
  - GOOGLE_MAPS_API_KEY in environment / .env
  - Falls back gracefully if key is missing (geofence still works)

File: app/services/geo_service.py
"""

from __future__ import annotations

import io
import logging
import math
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

# ── Data Classes ──────────────────────────────────────────


@dataclass
class GeoPoint:
    """A geographic coordinate."""
    lat: float
    lng: float


@dataclass
class GeoResult:
    """Result of a geocoding operation."""
    lat: float
    lng: float
    formatted_address: str
    place_id: Optional[str] = None
    # Components extracted from Google's response
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    # Quality indicator from Google
    location_type: Optional[str] = None  # ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE


@dataclass
class GeofenceResult:
    """Result of a geofence check."""
    within: bool
    distance_m: float
    radius_m: int
    worker_lat: float
    worker_lng: float
    site_lat: float
    site_lng: float


@dataclass
class AddressVerification:
    """Result of an address verification."""
    is_valid: bool
    status: str  # "verified", "unverified", "failed"
    confidence: str  # "high", "medium", "low"
    geocode: Optional[GeoResult] = None
    issues: list[str] = field(default_factory=list)


@dataclass
class PhotoGeoVerification:
    """Result of photo EXIF geo-verification."""
    has_exif_gps: bool
    exif_point: Optional[GeoPoint] = None
    photo_within_geofence: bool = False
    photo_to_site_m: float = 0.0
    photo_to_app_gps_m: float = 0.0
    fraud_flag: bool = False
    fraud_reason: Optional[str] = None


# ── Geo Service ───────────────────────────────────────────


class GeoService:
    """
    Unified geo service — one class, one API key, all location intelligence.

    Usage:
        geo = GeoService()

        # Geocode an address
        result = await geo.geocode("123 Main St, Springfield, IL")

        # Check if worker is on site
        fence = geo.verify_geofence(38.7, -89.6, 38.7001, -89.5999, 200)

        # Verify a free-text address is real
        verification = await geo.verify_address("123 Main St, Springfield, IL")

        # Verify photo was taken on site
        photo = await geo.verify_photo(exif_bytes, app_lat, app_lng, site_lat, site_lng, 200)
    """

    GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
    PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places"

    def __init__(self):
        settings = get_settings()
        self.api_key = getattr(settings, "google_maps_api_key", None) or ""
        if not self.api_key:
            logger.warning(
                "[GeoService] GOOGLE_MAPS_API_KEY not set — geocoding/verification disabled. "
                "Geofence distance checks still work (no API needed)."
            )

    @property
    def has_api_key(self) -> bool:
        return bool(self.api_key)

    # ══════════════════════════════════════════════════════
    # 1. GEOCODING — Address → Coordinates
    # ══════════════════════════════════════════════════════

    async def geocode(self, address: str) -> Optional[GeoResult]:
        """
        Convert an address string to coordinates + structured components.

        Uses Google Geocoding API.
        Returns None if address cannot be resolved or API key is missing.
        """
        if not self.has_api_key:
            logger.warning("[GeoService.geocode] No API key — cannot geocode")
            return None

        params = {
            "address": address,
            "key": self.api_key,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(self.GEOCODE_URL, params=params)

            data = response.json()

            if data.get("status") != "OK" or not data.get("results"):
                logger.warning("[GeoService.geocode] No results for '%s': %s", address, data.get("status"))
                return None

            result = data["results"][0]
            location = result["geometry"]["location"]
            components = self._parse_address_components(result.get("address_components", []))

            return GeoResult(
                lat=location["lat"],
                lng=location["lng"],
                formatted_address=result.get("formatted_address", address),
                place_id=result.get("place_id"),
                address_line1=components.get("address_line1"),
                city=components.get("city"),
                state=components.get("state"),
                zip_code=components.get("zip_code"),
                country=components.get("country"),
                location_type=result.get("geometry", {}).get("location_type"),
            )

        except httpx.TimeoutException:
            logger.error("[GeoService.geocode] Timeout geocoding '%s'", address)
            return None
        except Exception as e:
            logger.error("[GeoService.geocode] Error: %s", e, exc_info=True)
            return None

    async def batch_geocode(self, addresses: list[str]) -> list[Optional[GeoResult]]:
        """
        Geocode multiple addresses. Returns results in same order as input.
        None for any address that failed.

        Note: Google Geocoding API doesn't have a batch endpoint,
        so this runs sequentially with a small delay to respect rate limits.
        For >50 addresses, consider using Google's batch geocoding or
        running in parallel with rate limiting.
        """
        import asyncio
        results: list[Optional[GeoResult]] = []
        for i, addr in enumerate(addresses):
            result = await self.geocode(addr)
            results.append(result)
            # Small delay to stay under rate limits (50 QPS)
            if i < len(addresses) - 1:
                await asyncio.sleep(0.05)
        return results

    # ══════════════════════════════════════════════════════
    # 2. REVERSE GEOCODING — Coordinates → Address
    # ══════════════════════════════════════════════════════

    async def reverse_geocode(self, lat: float, lng: float) -> Optional[GeoResult]:
        """
        Convert coordinates to a structured address.

        Useful for displaying human-readable location on check-in:
        "You checked in at 123 Main St, Springfield"
        """
        if not self.has_api_key:
            logger.warning("[GeoService.reverse_geocode] No API key")
            return None

        params = {
            "latlng": f"{lat},{lng}",
            "key": self.api_key,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(self.GEOCODE_URL, params=params)

            data = response.json()

            if data.get("status") != "OK" or not data.get("results"):
                logger.warning("[GeoService.reverse_geocode] No results for (%s, %s)", lat, lng)
                return None

            result = data["results"][0]
            components = self._parse_address_components(result.get("address_components", []))

            return GeoResult(
                lat=lat,
                lng=lng,
                formatted_address=result.get("formatted_address", ""),
                place_id=result.get("place_id"),
                address_line1=components.get("address_line1"),
                city=components.get("city"),
                state=components.get("state"),
                zip_code=components.get("zip_code"),
                country=components.get("country"),
                location_type=result.get("geometry", {}).get("location_type"),
            )

        except Exception as e:
            logger.error("[GeoService.reverse_geocode] Error: %s", e, exc_info=True)
            return None

    # ══════════════════════════════════════════════════════
    # 3. GEOFENCE VERIFICATION — Distance Check
    # ══════════════════════════════════════════════════════
    # No API key needed — pure math using Haversine formula.

    @staticmethod
    def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        Calculate distance in meters between two GPS coordinates.
        Uses the Haversine formula — accurate to ~0.3% for distances under 100km.

        For production with geopy installed, you can swap to:
            from geopy.distance import geodesic
            return geodesic((lat1, lng1), (lat2, lng2)).meters
        """
        R = 6_371_000  # Earth radius in meters

        lat1_r = math.radians(lat1)
        lat2_r = math.radians(lat2)
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)

        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlng / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    @classmethod
    def verify_geofence(
        cls,
        worker_lat: float,
        worker_lng: float,
        site_lat: float,
        site_lng: float,
        radius_m: int,
    ) -> GeofenceResult:
        """
        Check if a worker's GPS position is within the worksite's geo-fence.

        This is the core check for site_checkins.within_geo_fence.
        No API key needed — runs on any server.

        Args:
            worker_lat/lng: Worker's reported GPS position
            site_lat/lng: Worksite's stored coordinates
            radius_m: Geofence radius in meters (default 200 in DB)

        Returns:
            GeofenceResult with within (bool), distance_m, and all coordinates
        """
        distance = cls.calculate_distance(worker_lat, worker_lng, site_lat, site_lng)

        return GeofenceResult(
            within=distance <= radius_m,
            distance_m=round(distance, 2),
            radius_m=radius_m,
            worker_lat=worker_lat,
            worker_lng=worker_lng,
            site_lat=site_lat,
            site_lng=site_lng,
        )

    # ══════════════════════════════════════════════════════
    # 4. ADDRESS VERIFICATION
    # ══════════════════════════════════════════════════════

    async def verify_address(self, address: str) -> AddressVerification:
        """
        Verify whether a free-text address is a real, deliverable location.

        Strategy:
        1. Geocode the address via Google
        2. Check location_type (ROOFTOP = high confidence, APPROXIMATE = low)
        3. Return verification status + geocoded coordinates

        If Google API key is missing, returns "unverified" with no geocode.
        The address is still saved — verification can be retried later.
        """
        if not self.has_api_key:
            return AddressVerification(
                is_valid=False,
                status="unverified",
                confidence="low",
                issues=["Google Maps API key not configured — cannot verify"],
            )

        geocode_result = await self.geocode(address)

        if not geocode_result:
            return AddressVerification(
                is_valid=False,
                status="failed",
                confidence="low",
                issues=["Address could not be geocoded — not found by Google"],
            )

        # Assess quality based on Google's location_type
        location_type = geocode_result.location_type or "APPROXIMATE"
        issues: list[str] = []

        if location_type == "ROOFTOP":
            confidence = "high"
            status = "verified"
            is_valid = True
        elif location_type == "RANGE_INTERPOLATED":
            confidence = "medium"
            status = "verified"
            is_valid = True
            issues.append("Address was interpolated — exact building not confirmed")
        elif location_type == "GEOMETRIC_CENTER":
            confidence = "low"
            status = "unverified"
            is_valid = False
            issues.append("Only resolved to area center — not a specific address")
        else:  # APPROXIMATE
            confidence = "low"
            status = "unverified"
            is_valid = False
            issues.append("Address resolution is approximate — verify manually")

        return AddressVerification(
            is_valid=is_valid,
            status=status,
            confidence=confidence,
            geocode=geocode_result,
            issues=issues,
        )

    # ══════════════════════════════════════════════════════
    # PHOTO EXIF VERIFICATION
    # ══════════════════════════════════════════════════════

    async def extract_photo_gps(self, file_bytes: bytes) -> Optional[GeoPoint]:
        """
        Extract GPS coordinates from a photo's EXIF data.

        Uses Pillow to read EXIF tags. Returns None if no GPS data found.
        This is Layer 2 of the double-proof verification:
          Layer 1: App-reported GPS vs geofence (verify_geofence)
          Layer 2: Photo EXIF GPS vs geofence (this + verify_geofence)
          Cross-check: App GPS vs EXIF GPS (fraud detection)
        """
        try:
            from PIL import Image
            from PIL.ExifTags import TAGS, GPSTAGS

            image = Image.open(io.BytesIO(file_bytes))
            exif_data = image._getexif()

            if not exif_data:
                return None

            # Find GPSInfo tag
            gps_info = {}
            for tag_id, value in exif_data.items():
                tag = TAGS.get(tag_id, tag_id)
                if tag == "GPSInfo":
                    for gps_tag_id, gps_value in value.items():
                        gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                        gps_info[gps_tag] = gps_value

            if not gps_info:
                return None

            # Parse latitude
            lat = self._dms_to_decimal(
                gps_info.get("GPSLatitude"),
                gps_info.get("GPSLatitudeRef", "N"),
            )
            # Parse longitude
            lng = self._dms_to_decimal(
                gps_info.get("GPSLongitude"),
                gps_info.get("GPSLongitudeRef", "E"),
            )

            if lat is not None and lng is not None:
                return GeoPoint(lat=lat, lng=lng)

            return None

        except ImportError:
            logger.warning("[GeoService] Pillow not installed — EXIF extraction unavailable")
            return None
        except Exception as e:
            logger.error("[GeoService.extract_photo_gps] Error: %s", e, exc_info=True)
            return None

    async def verify_photo_location(
        self,
        file_bytes: bytes,
        app_lat: float,
        app_lng: float,
        site_lat: float,
        site_lng: float,
        radius_m: int,
    ) -> PhotoGeoVerification:
        """
        Full photo geo-verification — double-proof + fraud detection.

        Checks:
        1. Extract EXIF GPS from photo
        2. Check EXIF GPS against worksite geofence
        3. Cross-check EXIF GPS vs app-reported GPS
        4. Flag fraud if EXIF and app GPS diverge significantly

        Fraud indicators:
        - EXIF GPS >500m from app GPS (GPS spoofing likely)
        - Photo taken far from site but app claims on-site
        - No EXIF GPS at all (stripped metadata — suspicious but not conclusive)
        """
        FRAUD_THRESHOLD_M = 500  # Flag if EXIF vs app GPS differ by more than this

        exif_point = await self.extract_photo_gps(file_bytes)

        if not exif_point:
            return PhotoGeoVerification(
                has_exif_gps=False,
                fraud_flag=False,
                fraud_reason=None,  # No EXIF is common (not conclusive fraud)
            )

        # Check photo GPS against worksite geofence
        photo_fence = self.verify_geofence(
            exif_point.lat, exif_point.lng,
            site_lat, site_lng,
            radius_m,
        )

        # Cross-check photo GPS vs app-reported GPS
        photo_to_app = self.calculate_distance(
            exif_point.lat, exif_point.lng,
            app_lat, app_lng,
        )

        # Fraud detection
        fraud_flag = False
        fraud_reason = None

        if photo_to_app > FRAUD_THRESHOLD_M:
            fraud_flag = True
            fraud_reason = (
                f"Photo EXIF GPS is {round(photo_to_app)}m from app-reported GPS "
                f"(threshold: {FRAUD_THRESHOLD_M}m) — possible GPS spoofing"
            )
        elif not photo_fence.within and photo_fence.distance_m > radius_m * 2:
            fraud_flag = True
            fraud_reason = (
                f"Photo taken {round(photo_fence.distance_m)}m from site "
                f"(geofence: {radius_m}m) — photo not taken on site"
            )

        return PhotoGeoVerification(
            has_exif_gps=True,
            exif_point=exif_point,
            photo_within_geofence=photo_fence.within,
            photo_to_site_m=round(photo_fence.distance_m, 2),
            photo_to_app_gps_m=round(photo_to_app, 2),
            fraud_flag=fraud_flag,
            fraud_reason=fraud_reason,
        )

    # ══════════════════════════════════════════════════════
    # HELPER: Parse Google address components
    # ══════════════════════════════════════════════════════

    @staticmethod
    def _parse_address_components(components: list[dict]) -> dict:
        """
        Extract structured address fields from Google's address_components.

        Google returns components like:
          { "long_name": "123", "types": ["street_number"] }
          { "long_name": "Main St", "types": ["route"] }
          { "long_name": "Springfield", "types": ["locality"] }
          etc.

        We flatten this into our schema fields.
        """
        parsed: dict[str, str] = {}
        street_number = ""
        route = ""

        for comp in components:
            types = comp.get("types", [])
            long_name = comp.get("long_name", "")

            if "street_number" in types:
                street_number = long_name
            elif "route" in types:
                route = long_name
            elif "locality" in types:
                parsed["city"] = long_name
            elif "administrative_area_level_1" in types:
                parsed["state"] = comp.get("short_name", long_name)
            elif "postal_code" in types:
                parsed["zip_code"] = long_name
            elif "country" in types:
                parsed["country"] = comp.get("short_name", long_name)

        # Build address_line1 from street_number + route
        if street_number and route:
            parsed["address_line1"] = f"{street_number} {route}"
        elif route:
            parsed["address_line1"] = route
        elif street_number:
            parsed["address_line1"] = street_number

        return parsed

    @staticmethod
    def _dms_to_decimal(dms_tuple, ref: str) -> Optional[float]:
        """Convert EXIF DMS (degrees, minutes, seconds) to decimal degrees."""
        if not dms_tuple or len(dms_tuple) < 3:
            return None

        try:
            degrees = float(dms_tuple[0])
            minutes = float(dms_tuple[1])
            seconds = float(dms_tuple[2])

            decimal = degrees + minutes / 60 + seconds / 3600

            if ref in ("S", "W"):
                decimal = -decimal

            return round(decimal, 7)
        except (TypeError, ValueError, ZeroDivisionError):
            return None
