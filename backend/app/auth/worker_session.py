"""
Worker Session — Self-Identification + Session Management

Handles the one-time self-identification flow for contractor workers.
After first ID, the worker is recognized on subsequent access.

Rules:
- First access: worker must provide name + phone (email optional)
- System creates contractor_worker record
- Returning workers are auto-recognized (no repeat self-ID)
- Session persists for the life of the workgroup
"""

from typing import Optional


async def check_existing_worker(
    contractor_id: str,
    phone: str,
    db,
) -> Optional[dict]:
    """
    Check if a worker has already self-identified for this contractor.
    Matches by contractor_id + phone number.
    
    Returns: worker dict if found, None if new worker
    """
    # TODO: Query contractor_workers WHERE contractor_id AND phone
    # TODO: Return worker record or None
    return None


async def create_worker(
    contractor_id: str,
    first_name: str,
    last_name: str,
    phone: str,
    email: Optional[str],
    db,
) -> dict:
    """
    Create a new contractor_worker record (first-time self-identification).
    
    Returns: the created worker record
    """
    # TODO: Insert into contractor_workers
    # TODO: Return created record with id
    return {}


async def update_worker_activity(worker_id: str, db):
    """Update last_active_at timestamp for a worker."""
    # TODO: UPDATE contractor_workers SET last_active_at = NOW() WHERE id = worker_id
    pass


async def get_worker_workgroups(worker_id: str, contractor_id: str, db) -> list:
    """
    Get all workgroups accessible to a worker (via their contractor company).
    Used to build the worker's dashboard showing all their workgroups.
    """
    # TODO: Query workgroups WHERE contractor_id AND status IN (active states)
    # TODO: Return list of workgroup summaries
    return []
