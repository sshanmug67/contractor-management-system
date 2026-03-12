"""
Router — Invoices

Contractor invoice submission, AI validation, owner approval.
Submit triggers invoice_worker (10-check pipeline) via Pattern 2 (async).

All database access goes through IInvoiceRepository via ProviderRegistry.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_invoice_repo
from app.db.interfaces import IInvoiceRepository

# Dev org_id from seed data — replace with auth when ready
DEV_ORG_ID = "a0000000-0000-0000-0000-000000000001"

router = APIRouter()


@router.get("/")
async def list_invoices(
    workgroup_id: Optional[str] = Query(None, description="Filter by workgroup"),
    status: Optional[str] = Query(None, description="Filter by status"),
    # user=Depends(get_current_user),
    repo: IInvoiceRepository = Depends(get_invoice_repo),
):
    """List invoices for the organization, with optional filters."""
    # TODO: repo.list_by_org(org_id) or repo.list_by_workgroup(workgroup_id)
    return []


@router.post("/", status_code=202)
async def submit_invoice(
    data: dict,
    # worker=Depends(get_current_worker),  # Contractor auth
    repo: IInvoiceRepository = Depends(get_invoice_repo),
):
    """
    Contractor submits an invoice.
    Pattern 2 (async): create record + fire invoice_worker.delay().
    Returns 202 Accepted — validation happens in background.
    """
    # TODO: invoice = await repo.create(data, status='submitted')
    # TODO: validate_invoice.delay(str(invoice['id']))
    # return {'id': invoice['id'], 'status': 'submitted'}
    pass


@router.get("/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    # user=Depends(get_current_user),
    repo: IInvoiceRepository = Depends(get_invoice_repo),
):
    """Get invoice detail with AI validation flags."""
    # TODO: repo.get_by_id(invoice_id)
    pass


@router.post("/{invoice_id}/approve")
async def approve_invoice(
    invoice_id: str,
    # user=Depends(get_current_user),
    repo: IInvoiceRepository = Depends(get_invoice_repo),
):
    """
    Owner approves an invoice.
    Pattern 2 (async): update status + fire notification_worker.delay().
    """
    # TODO: repo.update_status(invoice_id, 'approved')
    # TODO: notification_worker.delay('invoice_approved', invoice_id, {...})
    pass


@router.post("/{invoice_id}/reject")
async def reject_invoice(
    invoice_id: str,
    data: dict,
    # user=Depends(get_current_user),
    repo: IInvoiceRepository = Depends(get_invoice_repo),
):
    """Owner rejects an invoice with reason."""
    # TODO: repo.update_status(invoice_id, 'rejected', reason=data.get('reason'))
    # TODO: notification_worker.delay('invoice_rejected', invoice_id, {...})
    pass


@router.get("/workgroup/{workgroup_id}/summary")
async def get_workgroup_invoice_summary(
    workgroup_id: str,
    # user=Depends(get_current_user),
    repo: IInvoiceRepository = Depends(get_invoice_repo),
):
    """Get invoice summary for a workgroup: totals, pipeline counts."""
    # TODO: repo.get_cumulative_total(workgroup_id)
    return {}
