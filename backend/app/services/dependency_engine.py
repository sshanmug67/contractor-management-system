"""
Service — Dependency Engine

Monitors and manages dependencies at two levels:
- Workgroup dependencies (within and cross-worksite)
- Job dependencies (within same workgroup)

When a workgroup/job completes → check if blocked items can now start.
"""


async def check_workgroup_dependencies(workgroup_id: str, db) -> dict:
    """
    Check if all dependencies for a workgroup are satisfied.
    
    Returns: { satisfied: bool, blocking: [ { id, title, status } ] }
    """
    # TODO: Query workgroup_dependencies WHERE workgroup_id
    # TODO: Check depends_on status = 'complete'
    return {"satisfied": True, "blocking": []}


async def check_job_dependencies(job_id: str, db) -> dict:
    """
    Check if all dependencies for a job are satisfied.
    
    Returns: { satisfied: bool, blocking: [ { id, title, status } ] }
    """
    # TODO: Query job_dependencies WHERE job_id
    # TODO: Check depends_on job status = 'complete'
    return {"satisfied": True, "blocking": []}


async def on_workgroup_complete(workgroup_id: str, db):
    """
    Called when a workgroup completes. Checks what it unblocks.
    
    - Find workgroups that depend on this one
    - If all their deps are now satisfied → notify + send QR links
    """
    # TODO: Query workgroup_dependencies WHERE depends_on_workgroup_id = workgroup_id
    # TODO: For each dependent, check_workgroup_dependencies()
    # TODO: If unblocked → trigger notification + QR token generation
    pass


async def on_job_complete(job_id: str, db):
    """
    Called when a job completes. Checks what it unblocks within the workgroup.
    """
    # TODO: Query job_dependencies WHERE depends_on_job_id = job_id
    # TODO: For each dependent, check_job_dependencies()
    pass


async def detect_circular_dependencies(entity_id: str, depends_on_id: str, table: str, db) -> bool:
    """Detect circular dependencies before adding a new one. Returns True if circular."""
    # TODO: BFS/DFS from depends_on_id to see if we reach entity_id
    return False
