"""
Router — Uploads

File and photo uploads per workgroup/job.
Photos include geo-tag verification (Layer 2 of double-proof system).
AI processes: classify, analyze, extract EXIF, verify geo-fence.
"""

from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from typing import Optional

from app.dependencies import get_db, get_current_user, get_current_worker
from app.models.message import UploadCreate, UploadResponse

router = APIRouter()


@router.get("/", response_model=list[UploadResponse])
async def list_uploads(
    workgroup_id: Optional[str] = Query(None),
    job_id: Optional[str] = Query(None),
    file_type: Optional[str] = Query(None),
    db=Depends(get_db),
):
    """List uploads with optional filters."""
    return []


@router.post("/", response_model=UploadResponse, status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    workgroup_id: str = Form(...),
    job_id: Optional[str] = Form(None),
    geo_latitude: Optional[float] = Form(None),
    geo_longitude: Optional[float] = Form(None),
    worker=Depends(get_current_worker),
    db=Depends(get_db),
):
    """
    Upload a file/photo for a workgroup or job.
    
    For photos:
    - Extract EXIF (GPS, timestamp, device)
    - Verify GPS within worksite geo-fence
    - Cross-reference with check-in location
    - AI classify: progress/completion/damage/before/after
    
    For receipts/invoices:
    - OCR → extract data
    - Match to job/workgroup budget
    
    Files stored in Supabase Storage.
    """
    # TODO: Upload file to Supabase Storage
    # TODO: Extract EXIF data from photos
    # TODO: Geo-verify if lat/lng provided
    # TODO: Create upload record
    # TODO: Trigger AI processing async
    pass


@router.get("/{upload_id}", response_model=UploadResponse)
async def get_upload(
    upload_id: str,
    db=Depends(get_db),
):
    """Get upload details including AI analysis."""
    pass


@router.delete("/{upload_id}", status_code=204)
async def delete_upload(
    upload_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Delete an upload (owner only)."""
    # TODO: Remove from Supabase Storage + DB record
    pass
