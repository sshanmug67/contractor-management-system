"""
Router — Messages

Chat messaging within workgroup context.
Business owner and contractor can exchange messages per workgroup.

Database access goes through ProviderRegistry.
TODO: Add IMessageRepository to app/db/interfaces/__init__.py
      and create get_message_repo in dependencies.py,
      then update this router to use the typed dependency.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_providers
from app.providers import ProviderRegistry

# Dev org_id from seed data — replace with auth when ready
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"

router = APIRouter()


@router.get("/workgroup/{workgroup_id}")
async def list_messages(
    workgroup_id: str,
    limit: int = Query(50, description="Number of messages to return"),
    # user=Depends(get_current_user),
    providers: ProviderRegistry = Depends(get_providers),
):
    """List messages for a workgroup thread."""
    # TODO: providers.messages.list_by_workgroup(workgroup_id, limit)
    return []


@router.post("/workgroup/{workgroup_id}", status_code=201)
async def send_message(
    workgroup_id: str,
    data: dict,
    # user=Depends(get_current_user),  # or get_current_worker for contractor
    providers: ProviderRegistry = Depends(get_providers),
):
    """
    Send a message in a workgroup thread.
    Pattern 1 (sync): create record, Realtime handles push to recipient.
    """
    # TODO: providers.messages.create(workgroup_id, sender_id, data)
    pass


@router.get("/unread")
async def get_unread_counts(
    # user=Depends(get_current_user),
    providers: ProviderRegistry = Depends(get_providers),
):
    """Get unread message counts per workgroup for the current user."""
    # TODO: providers.messages.get_unread_count(user_id)
    return {}
