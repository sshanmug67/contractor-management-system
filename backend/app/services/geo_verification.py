"""
Service — Geo Verification

Double-proof location verification:
  Layer 1: GPS check-in against worksite geo-fence
  Layer 2: Photo EXIF geo-tags against worksite geo-fence

Uses geopy for distance calculation.
"""

from decimal import Decimal
from typing import Optional


async def calculate_distance(
    lat1: float, lng1: float,
    lat2: float, lng2: float,
) -> float:
    """Calculate distance in meters between two GPS coordinates."""
    # TODO: Use geopy.distance.geodesic()
    # from geopy.distance import geodesic
    # return geodesic((lat1, lng1), (lat2, lng2)).meters
    return 0.0


async def verify_within_geofence(
    worker_lat: float, worker_lng: float,
    worksite_lat: float, worksite_lng: float,
    radius_m: int,
) -> dict:
    """
    Check if a GPS position is within the worksite's geo-fence.
    
    Returns: { within: bool, distance_m: float, radius_m: int }
    """
    distance = await calculate_distance(worker_lat, worker_lng, worksite_lat, worksite_lng)
    return {
        "within": distance <= radius_m,
        "distance_m": round(distance, 2),
        "radius_m": radius_m,
    }


async def extract_photo_exif(file_bytes: bytes) -> Optional[dict]:
    """
    Extract EXIF data from a photo.
    
    Returns: { gps_lat, gps_lng, timestamp, device } or None
    """
    # TODO: Use Pillow to extract EXIF
    # TODO: Parse GPS coordinates from EXIF tags
    # TODO: Parse timestamp and device info
    return None


async def verify_photo_geotag(
    photo_lat: float, photo_lng: float,
    app_lat: float, app_lng: float,
    worksite_lat: float, worksite_lng: float,
    radius_m: int,
) -> dict:
    """
    Verify a photo's geo-tag against worksite and app-reported GPS.
    
    Cross-references:
    - Photo EXIF GPS vs worksite geo-fence
    - Photo EXIF GPS vs app-captured GPS (fraud detection)
    """
    # TODO: Check photo GPS within geo-fence
    # TODO: Compare EXIF GPS vs app GPS (flag large discrepancy)
    return {
        "photo_within_geofence": False,
        "photo_to_worksite_m": 0.0,
        "photo_to_app_gps_m": 0.0,
        "fraud_flag": False,
    }
