"""
Interface — Location Repository

Abstract interface for business location CRUD operations.
Business locations are org-level saved addresses (offices, warehouses,
client sites) that can be linked to worksites and jobs.

File: app/db/interfaces/location_repository.py
"""

from abc import ABC, abstractmethod
from typing import Optional


class ILocationRepository(ABC):
    """Interface for business location data operations."""

    @abstractmethod
    async def list_locations(
        self,
        org_id: str,
        location_type: Optional[str] = None,
        is_active: Optional[bool] = True,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[dict]:
        """
        List business locations for an organization.

        Args:
            org_id: Organization ID (from auth)
            location_type: Filter by type (office, warehouse, client_site, etc.)
            is_active: Filter by active status (default: active only)
            search: Free-text search across name, address, city
            skip/limit: Pagination
        """
        ...

    @abstractmethod
    async def create_location(self, data: dict) -> dict:
        """
        Create a new business location.

        Required in data: org_id, name
        Optional: address_line1, address_line2, city, state, zip_code,
                  phone, geo_latitude, geo_longitude, geo_fence_radius_m,
                  location_type, google_place_id, verification_status
        """
        ...

    @abstractmethod
    async def get_location(self, location_id: str) -> Optional[dict]:
        """Get a single business location by ID."""
        ...

    @abstractmethod
    async def update_location(self, location_id: str, data: dict) -> dict:
        """Update a business location."""
        ...

    @abstractmethod
    async def delete_location(self, location_id: str) -> bool:
        """
        Soft-delete a business location (set is_active = false).
        Hard delete only if no worksites reference it.
        """
        ...

    @abstractmethod
    async def find_by_place_id(self, org_id: str, google_place_id: str) -> Optional[dict]:
        """
        Find an existing location by Google Place ID.
        Used to prevent duplicates when user picks from Google Places.
        """
        ...

    @abstractmethod
    async def find_by_coordinates(
        self,
        org_id: str,
        lat: float,
        lng: float,
        tolerance_m: float = 50.0,
    ) -> Optional[dict]:
        """
        Find an existing location near given coordinates.
        Used to prevent duplicates when geocoding returns a nearby match.
        """
        ...

    @abstractmethod
    async def get_default_location(self, org_id: str) -> Optional[dict]:
        """Get the org's default business location (if set)."""
        ...

    @abstractmethod
    async def set_default_location(self, org_id: str, location_id: str) -> dict:
        """Set a location as the org's default (unsets previous default)."""
        ...
