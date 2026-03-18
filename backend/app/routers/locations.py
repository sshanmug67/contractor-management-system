"""
Router — Business Locations

REST API for org-level business location management.

Endpoints:
  GET    /                  — List locations (with search)
  POST   /                  — Create a location
  GET    /:id               — Get single location
  PUT    /:id               — Update a location
  DELETE /:id               — Soft-delete a location
  POST   /verify            — Verify a free-text address
  POST   /:id/worksite      — Auto-create worksite from location
  PUT    /:id/default       — Set as org default

All database access goes through ILocationRepository via ProviderRegistry.

File: app/routers/locations.py
"""

from typing import Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.dependencies import get_location_repo
from app.db.interfaces.location_repository import ILocationRepository
from app.services.geo_service import GeoService

logger = logging.getLogger(__name__)

# Dev org_id from seed data — replace with auth when ready
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"

router = APIRouter()


# ── Request / Response Models ─────────────────────────────


class LocationCreate(BaseModel):
    """Create a new business location."""
    name: str = Field(..., min_length=1, max_length=200)
    location_type: str = Field(default="other")
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    geo_latitude: Optional[float] = None
    geo_longitude: Optional[float] = None
    geo_fence_radius_m: int = Field(default=200, ge=50, le=5000)
    google_place_id: Optional[str] = None
    is_default: bool = False
    # If true, auto-verify the address on creation
    auto_verify: bool = True


class LocationUpdate(BaseModel):
    """Update an existing business location."""
    name: Optional[str] = None
    location_type: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    geo_latitude: Optional[float] = None
    geo_longitude: Optional[float] = None
    geo_fence_radius_m: Optional[int] = Field(default=None, ge=50, le=5000)
    is_default: Optional[bool] = None


class AddressVerifyRequest(BaseModel):
    """Verify a free-text address."""
    address: str = Field(..., min_length=5, max_length=500)


class WorksiteCreateRequest(BaseModel):
    """Auto-create a worksite from a business location."""
    project_id: str


# ── Endpoints ─────────────────────────────────────────────


@router.get("/")
async def list_locations(
    location_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True),
    search: Optional[str] = Query(None, min_length=2),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    # user=Depends(get_current_user),  # TODO: Re-enable when auth is ready
    repo: ILocationRepository = Depends(get_location_repo),
):
    """
    List business locations for the current org.

    Query params:
      - location_type: filter by type (office, warehouse, client_site, etc.)
      - is_active: filter by active status (default: true)
      - search: free-text search across name, address, city
      - skip/limit: pagination
    """
    org_id = DEV_ORG_ID  # TODO: Replace with user.org_id
    return await repo.list_locations(
        org_id=org_id,
        location_type=location_type,
        is_active=is_active,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.post("/", status_code=201)
async def create_location(
    body: LocationCreate,
    # user=Depends(get_current_user),  # TODO: Re-enable when auth is ready
    repo: ILocationRepository = Depends(get_location_repo),
):
    """
    Create a new business location.

    If google_place_id is provided, checks for duplicates first.
    If auto_verify is true and address fields are present, runs
    address verification via Google Geocoding API.
    """
    org_id = DEV_ORG_ID  # TODO: Replace with user.org_id

    # Dedup by Google Place ID
    if body.google_place_id:
        existing = await repo.find_by_place_id(org_id, body.google_place_id)
        if existing:
            logger.info("[locations] Duplicate place_id %s — returning existing", body.google_place_id)
            return existing

    data = {
        "org_id": org_id,
        **body.model_dump(exclude={"auto_verify"}),
    }

    # Auto-verify address if requested and address is present
    if body.auto_verify and body.address_line1:
        geo = GeoService()
        full_address = _build_full_address(body)

        if full_address:
            verification = await geo.verify_address(full_address)
            data["verification_status"] = verification.status

            # If verification returned better coordinates, use them
            if verification.geocode and not body.geo_latitude:
                data["geo_latitude"] = verification.geocode.lat
                data["geo_longitude"] = verification.geocode.lng

            # If verification returned a place_id and we didn't have one
            if verification.geocode and verification.geocode.place_id and not body.google_place_id:
                data["google_place_id"] = verification.geocode.place_id

                # Re-check dedup with the discovered place_id
                existing = await repo.find_by_place_id(org_id, verification.geocode.place_id)
                if existing:
                    logger.info("[locations] Geocode dedup — place_id %s already exists", verification.geocode.place_id)
                    return existing

    # Handle default — unset previous if setting new
    if body.is_default:
        current_default = await repo.get_default_location(org_id)
        if current_default:
            await repo.update_location(current_default["id"], {"is_default": False})

    location = await repo.create_location(data)
    return location


@router.get("/{location_id}")
async def get_location(
    location_id: str,
    # user=Depends(get_current_user),  # TODO: Re-enable when auth is ready
    repo: ILocationRepository = Depends(get_location_repo),
):
    """Get a single business location."""
    location = await repo.get_location(location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.put("/{location_id}")
async def update_location(
    location_id: str,
    body: LocationUpdate,
    # user=Depends(get_current_user),  # TODO: Re-enable when auth is ready
    repo: ILocationRepository = Depends(get_location_repo),
):
    """Update a business location."""
    existing = await repo.get_location(location_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Location not found")

    update_data = body.model_dump(exclude_none=True)

    # If address changed, re-verify
    address_fields = {"address_line1", "city", "state", "zip_code"}
    if address_fields & set(update_data.keys()):
        geo = GeoService()
        # Merge existing + updates for full address
        merged = {**existing, **update_data}
        full_address = _build_full_address_from_dict(merged)

        if full_address:
            verification = await geo.verify_address(full_address)
            update_data["verification_status"] = verification.status

            if verification.geocode:
                update_data["geo_latitude"] = verification.geocode.lat
                update_data["geo_longitude"] = verification.geocode.lng
                if verification.geocode.place_id:
                    update_data["google_place_id"] = verification.geocode.place_id

    # Handle default toggle
    org_id = DEV_ORG_ID  # TODO: Replace with user.org_id
    if update_data.get("is_default") is True:
        await repo.set_default_location(org_id, location_id)
        update_data.pop("is_default")  # Already handled

    return await repo.update_location(location_id, update_data)


@router.delete("/{location_id}")
async def delete_location(
    location_id: str,
    # user=Depends(get_current_user),  # TODO: Re-enable when auth is ready
    repo: ILocationRepository = Depends(get_location_repo),
):
    """
    Delete a business location.
    Soft-deletes if worksites reference it, hard-deletes otherwise.
    """
    existing = await repo.get_location(location_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Location not found")

    success = await repo.delete_location(location_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete location")

    return {"deleted": True, "id": location_id}


@router.post("/verify")
async def verify_address(
    body: AddressVerifyRequest,
    # user=Depends(get_current_user),  # TODO: Re-enable when auth is ready
):
    """
    Verify a free-text address without creating a location.

    Returns verification status, confidence, geocoded coordinates,
    and any issues found. Used by the LocationPicker to show a
    "Verified" badge before the user saves.
    """
    geo = GeoService()
    verification = await geo.verify_address(body.address)

    result = {
        "is_valid": verification.is_valid,
        "status": verification.status,
        "confidence": verification.confidence,
        "issues": verification.issues,
    }

    if verification.geocode:
        result["geocode"] = {
            "lat": verification.geocode.lat,
            "lng": verification.geocode.lng,
            "formatted_address": verification.geocode.formatted_address,
            "place_id": verification.geocode.place_id,
            "address_line1": verification.geocode.address_line1,
            "city": verification.geocode.city,
            "state": verification.geocode.state,
            "zip_code": verification.geocode.zip_code,
        }

    return result


@router.post("/{location_id}/worksite")
async def create_worksite_from_location(
    location_id: str,
    body: WorksiteCreateRequest,
    # user=Depends(get_current_user),  # TODO: Re-enable when auth is ready
    repo: ILocationRepository = Depends(get_location_repo),
):
    """
    Auto-create a worksite in a project from a business location.

    If a worksite already exists in this project for this location,
    returns the existing one (idempotent).

    This is the bridge between:
      - Business locations (org-level, reusable across projects)
      - Worksites (project-level, tied to one project)
    """
    existing = await repo.get_location(location_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Location not found")

    worksite = await repo.create_worksite_from_location(
        location_id=location_id,
        project_id=body.project_id,
    )

    return worksite


@router.put("/{location_id}/default")
async def set_default_location(
    location_id: str,
    # user=Depends(get_current_user),  # TODO: Re-enable when auth is ready
    repo: ILocationRepository = Depends(get_location_repo),
):
    """Set a location as the org's default."""
    existing = await repo.get_location(location_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Location not found")

    org_id = DEV_ORG_ID  # TODO: Replace with user.org_id
    return await repo.set_default_location(org_id, location_id)


# ── Helpers ───────────────────────────────────────────────


def _build_full_address(body: LocationCreate) -> Optional[str]:
    """Build a full address string from request body fields."""
    parts = [
        body.address_line1,
        body.address_line2,
        body.city,
        body.state,
        body.zip_code,
    ]
    filtered = [p for p in parts if p]
    return ", ".join(filtered) if filtered else None


def _build_full_address_from_dict(d: dict) -> Optional[str]:
    """Build a full address string from a dict."""
    parts = [
        d.get("address_line1"),
        d.get("address_line2"),
        d.get("city"),
        d.get("state"),
        d.get("zip_code"),
    ]
    filtered = [p for p in parts if p]
    return ", ".join(filtered) if filtered else None
