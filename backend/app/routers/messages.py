"""
Router — Messages

Per-workgroup messaging between contractor workers and business team.
AI processes every message for classification, sentiment, action items.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_db, get_current_user, get_current_worker
from app.models.message import MessageCreate, MessageResponse

router = APIRouter()


@router.get("/", response_model=list[MessageResponse])
async def list_messages(
    workgroup_id: str = Query(...),
    before: Optional[str] = Query(None, description="Cursor: messages before this timestamp"),
    limit: int = Query(50, ge=1, le=100),
    db=Depends(get_db),
):
    """List messages for a workgroup (paginated, newest first)."""
    # TODO: Query messages WHERE workgroup_id, ordered by created_at DESC
    # TODO: Join worker name for display
    return []


@router.post("/", response_model=MessageResponse, status_code=201)
async def send_message_owner(
    message: MessageCreate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Send a message as a business owner/employee."""
    # TODO: Insert message with sender_type = 'owner' or 'employee'
    # TODO: Trigger AI processing (classify, sentiment, action items)
    # TODO: Push via Supabase Realtime
    pass


@router.post("/contractor", response_model=MessageResponse, status_code=201)
async def send_message_worker(
    message: MessageCreate,
    worker=Depends(get_current_worker),
    db=Depends(get_db),
):
    """Send a message as a contractor worker."""
    # TODO: Insert message with sender_type = 'worker', worker_id
    # TODO: Trigger AI processing
    # TODO: Push via Supabase Realtime
    pass
