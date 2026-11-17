"""
Dependency Worker — Event-Driven Unblock Checker

Triggered when a workgroup completes.
Checks dependency graph for newly unblocked workgroups
and initiates contractor allocation for them.

Trigger: dependency_worker.check_unblocked.delay(workgroup_id)
Queue: default
"""

import asyncio
from app.workers.celery_app import app
from app.workers.worker_logging import worker_log
from app.cache.redis_client import get_redis_client

TAG = "DEPENDENCY"


@app.task(
    name="app.workers.dependency_worker.check_unblocked",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    acks_late=True,
)
def check_unblocked(self, workgroup_id: str):
    """
    Check for workgroups unblocked by completion of a predecessor.

    Flow:
        1. Query workgroup_dependencies where predecessor = workgroup_id
        2. For each dependent, check if ALL predecessors are now complete
        3. If fully unblocked, update status to 'ready'
        4. Generate QR tokens for allocated contractors
        5. Trigger notifications

    TODO: Implement dependency resolution via ProviderRegistry.
    """
    try:
        worker_log(TAG, f"Checking unblocked dependencies for workgroup {workgroup_id}")

        redis = get_redis_client()

        # TODO: Implement dependency check
        # 1. Query workgroup_dependencies where predecessor_id = workgroup_id
        # 2. For each successor, check all predecessors
        # 3. If all complete → update successor status
        # 4. Fire qr_worker.generate_tokens.delay(successor_id)
        # 5. Fire notification_worker for 'dependency_unblocked'

        unblocked = 0

        # ── Write heartbeat ───────────────────────────────
        redis.write_heartbeat("dependency_worker")

        worker_log(TAG, f"Dependency check complete — {unblocked} workgroups unblocked")
        return {"status": "success", "workgroup_id": workgroup_id, "unblocked": unblocked}

    except Exception as exc:
        worker_log(TAG, f"FAILED for workgroup {workgroup_id}: {exc}")
        raise self.retry(exc=exc)
