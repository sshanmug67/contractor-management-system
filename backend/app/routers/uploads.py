"""
Router — Uploads

Photo and document uploads (progress photos, receipts, contracts).
Upload triggers geo_worker for EXIF/GPS verification (Pattern 2 async).

Database access goes through ProviderRegistry.
TODO: Add IUploadRepository to app/db/interfaces/__init__.py
      and create get_upload_repo in dependencies.py,
      then update this router to use the typed dependency.
"""

from fastapi import APIRouter, Depends, Query, UploadFile, File
from typing import Optional

from app.dependencies import get_providers
from app.providers import ProviderRegistry

# Dev org_id from seed data — replace with auth when ready
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"

router = APIRouter()


@router.post("/", status_code=202)
async def upload_file(
    file: UploadFile = File(...),
    job_id: Optional[str] = Query(None),
    workgroup_id: Optional[str] = Query(None),
    upload_type: str = Query("progress_photo", description="Type: progress_photo, receipt, contract, before_after"),
    # worker=Depends(get_current_worker),  # or get_current_user
    providers: ProviderRegistry = Depends(get_providers),
):
    """
    Upload a photo or document.
    Pattern 2 (async): save metadata + fire geo_worker.delay().
    """
    # TODO: Upload file to StorageProvider (providers.storage)
    # TODO: Create upload record via providers.uploads.create(...)
    # TODO: geo_worker.delay(upload_id) for EXIF/GPS verification
    # return {'id': upload_id, 'status': 'processing'}
    pass


@router.get("/job/{job_id}")
async def list_job_uploads(
    job_id: str,
    # user=Depends(get_current_user),
    providers: ProviderRegistry = Depends(get_providers),
):
    """List all uploads for a specific job."""
    # TODO: providers.uploads.list_by_job(job_id)
    return []


@router.get("/workgroup/{workgroup_id}")
async def list_workgroup_uploads(
    workgroup_id: str,
    # user=Depends(get_current_user),
    providers: ProviderRegistry = Depends(get_providers),
):
    """List all uploads for a workgroup."""
    # TODO: providers.uploads.list_by_workgroup(workgroup_id)
    return []


@router.get("/{upload_id}")
async def get_upload(
    upload_id: str,
    # user=Depends(get_current_user),
    providers: ProviderRegistry = Depends(get_providers),
):
    """Get upload detail with geo-verification status and AI classification."""
    # TODO: providers.uploads.get_by_id(upload_id)
    pass
