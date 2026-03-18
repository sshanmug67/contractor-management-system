"""
Location Queries — Supabase Provider

Handles:
- Business location CRUD
- Search (name, address, city)
- Deduplication by google_place_id and coordinates
- Default location management
- Worksite auto-creation from business location

File: app/db/providers/supabase/location_queries.py
"""

from typing import Optional
import logging

from app.db.providers.supabase.base_repository import SupabaseBaseRepository
from app.db.interfaces.location_repository import ILocationRepository

logger = logging.getLogger(__name__)


class LocationRepository(SupabaseBaseRepository, ILocationRepository):
    """Supabase queries for business location operations."""

    TABLE = "business_locations"

    async def list_locations(
        self,
        org_id: str,
        location_type: Optional[str] = None,
        is_active: Optional[bool] = True,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[dict]:
        """List business locations with optional filters and search."""
        query = (
            self.client.table(self.TABLE)
            .select("*")
            .eq("org_id", org_id)
        )

        if location_type:
            query = query.eq("location_type", location_type)

        if is_active is not None:
            query = query.eq("is_active", is_active)

        if search:
            # Supabase text search across multiple columns
            # Uses ilike for case-insensitive partial match
            query = query.or_(
                f"name.ilike.%{search}%,"
                f"address_line1.ilike.%{search}%,"
                f"city.ilike.%{search}%,"
                f"zip_code.ilike.%{search}%"
            )

        query = query.order("is_default", desc=True).order("name").range(skip, skip + limit - 1)
        result = query.execute()
        return result.data or []

    async def create_location(self, data: dict) -> dict:
        """Create a new business location."""
        return await self.insert_one(self.TABLE, data)

    async def get_location(self, location_id: str) -> Optional[dict]:
        """Get a single business location by ID."""
        try:
            return await self.fetch_one(self.TABLE, location_id)
        except Exception:
            return None

    async def update_location(self, location_id: str, data: dict) -> dict:
        """Update a business location."""
        return await self.update_one(self.TABLE, location_id, data)

    async def delete_location(self, location_id: str) -> bool:
        """
        Soft-delete: set is_active = false.
        Check if any worksites reference this location first.
        """
        # Check for linked worksites
        worksites = (
            self.client.table("worksites")
            .select("id")
            .eq("business_location_id", location_id)
            .limit(1)
            .execute()
        )

        if worksites.data:
            # Soft delete — worksites still reference this
            await self.update_one(self.TABLE, location_id, {"is_active": False})
            logger.info(
                "[LocationRepo] Soft-deleted location %s (has linked worksites)", location_id
            )
            return True

        # Hard delete — no worksites reference it
        return await self.delete_one(self.TABLE, location_id)

    async def find_by_place_id(self, org_id: str, google_place_id: str) -> Optional[dict]:
        """Find an existing location by Google Place ID to prevent duplicates."""
        result = (
            self.client.table(self.TABLE)
            .select("*")
            .eq("org_id", org_id)
            .eq("google_place_id", google_place_id)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    async def find_by_coordinates(
        self,
        org_id: str,
        lat: float,
        lng: float,
        tolerance_m: float = 50.0,
    ) -> Optional[dict]:
        """
        Find a location near given coordinates.

        Since Supabase doesn't have native PostGIS distance queries,
        we use a bounding box filter and then check exact distance.
        ~50m ≈ 0.00045° latitude, ~0.00056° longitude at 38°N.
        """
        # Rough bounding box (generous — filter precisely in Python)
        lat_delta = 0.001  # ~111m
        lng_delta = 0.001  # ~85m at mid-latitudes

        result = (
            self.client.table(self.TABLE)
            .select("*")
            .eq("org_id", org_id)
            .eq("is_active", True)
            .gte("geo_latitude", lat - lat_delta)
            .lte("geo_latitude", lat + lat_delta)
            .gte("geo_longitude", lng - lng_delta)
            .lte("geo_longitude", lng + lng_delta)
            .execute()
        )

        if not result.data:
            return None

        # Check exact distance for each candidate
        from app.services.geo_service import GeoService

        for loc in result.data:
            loc_lat = float(loc.get("geo_latitude", 0))
            loc_lng = float(loc.get("geo_longitude", 0))
            distance = GeoService.calculate_distance(lat, lng, loc_lat, loc_lng)
            if distance <= tolerance_m:
                return loc

        return None

    async def get_default_location(self, org_id: str) -> Optional[dict]:
        """Get the org's default business location."""
        result = (
            self.client.table(self.TABLE)
            .select("*")
            .eq("org_id", org_id)
            .eq("is_default", True)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    async def set_default_location(self, org_id: str, location_id: str) -> dict:
        """Set a location as default (unset previous default first)."""
        # Unset current default
        current = await self.get_default_location(org_id)
        if current and current["id"] != location_id:
            await self.update_one(self.TABLE, current["id"], {"is_default": False})

        # Set new default
        return await self.update_one(self.TABLE, location_id, {"is_default": True})

    # ══════════════════════════════════════════════════════
    # WORKSITE AUTO-CREATION
    # ══════════════════════════════════════════════════════

    async def create_worksite_from_location(
        self,
        location_id: str,
        project_id: str,
    ) -> dict:
        """
        Auto-create a worksite from a business location.

        This is the key bridge between business locations (org-level)
        and worksites (project-level). When a user picks a location in
        the LocationPicker for a workgroup or job, we:
          1. Look up the business location
          2. Check if a worksite already exists in this project for this location
          3. If not, create one with the same address/coords
          4. Return the worksite (new or existing)

        The worksite gets a back-link via business_location_id so we can
        track "which projects use this client site?"
        """
        # Get the business location
        location = await self.fetch_one(self.TABLE, location_id)
        if not location:
            raise ValueError(f"Business location {location_id} not found")

        # Check if worksite already exists for this location in this project
        existing = (
            self.client.table("worksites")
            .select("*")
            .eq("project_id", project_id)
            .eq("business_location_id", location_id)
            .limit(1)
            .execute()
        )

        if existing.data:
            logger.info(
                "[LocationRepo] Worksite already exists for location %s in project %s",
                location_id, project_id,
            )
            return existing.data[0]

        # Create new worksite from location data
        worksite_data = {
            "project_id": project_id,
            "business_location_id": location_id,
            "name": location.get("name", "Unnamed Site"),
            "address_line1": location.get("address_line1", ""),
            "address_line2": location.get("address_line2"),
            "city": location.get("city", ""),
            "state": location.get("state", ""),
            "zip_code": location.get("zip_code", ""),
            "phone": location.get("phone"),
            "geo_latitude": location.get("geo_latitude"),
            "geo_longitude": location.get("geo_longitude"),
            "geo_fence_radius_m": location.get("geo_fence_radius_m", 200),
            "status": "active",
        }

        # Remove None values to let DB defaults apply
        worksite_data = {k: v for k, v in worksite_data.items() if v is not None}

        result = await self.insert_one("worksites", worksite_data)
        logger.info(
            "[LocationRepo] Created worksite %s from location %s in project %s",
            result.get("id"), location_id, project_id,
        )
        return result
