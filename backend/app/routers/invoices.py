"""
Router — Invoices

Submit invoices per workgroup, AI validation, approval routing, payment.
Key rules: no double-billing, cumulative ≤ workgroup budget, site presence verified.
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.dependencies import get_db, get_current_user, get_current_worker
from app.models.invoice import (
    InvoiceCreate, InvoiceApproval,
    InvoiceResponse, InvoiceValidationResult,
)

router = APIRouter()


@router.get("/", response_model=list[InvoiceResponse])
async def list_invoices(
    workgroup_id: Optional[str] = Query(None),
    contractor_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List invoices with optional filters."""
    return []


@router.post("/", response_model=InvoiceResponse, status_code=201)
async def submit_invoice(
    invoice: InvoiceCreate,
    worker=Depends(get_current_worker),
    db=Depends(get_db),
):
    """
    Submit an invoice for a workgroup.
    
    Contractor selects completed jobs → bundles into invoice.
    Triggers AI validation pipeline (10-point checklist).
    """
    # TODO: Validate workgroup belongs to worker's contractor
    # TODO: Calculate amount from line items
    # TODO: Create invoice record (status: 'submitted')
    # TODO: Link submitted_by_worker
    # TODO: Trigger AI validation (Step Function or async)
    pass


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    db=Depends(get_db),
):
    """Get invoice details."""
    pass


@router.get("/{invoice_id}/validation", response_model=InvoiceValidationResult)
async def get_validation_result(
    invoice_id: str,
    db=Depends(get_db),
):
    """Get the AI validation result for an invoice."""
    # TODO: Return ai_flags and validation details
    pass


@router.post("/{invoice_id}/approve", response_model=InvoiceResponse)
async def approve_or_reject_invoice(
    invoice_id: str,
    decision: InvoiceApproval,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Approve, reject, or query an invoice.
    
    Approve → trigger payment (QuickBooks/Xero), update job statuses
    Reject → notify contractor with reason
    Query → send question to contractor via messaging
    """
    # TODO: Validate user is authorized approver
    # TODO: Handle approve/reject/query logic
    # TODO: If approved → trigger payment, update jobs to 'paid'
    # TODO: Check if all jobs invoiced+paid → workgroup complete
    # TODO: Cascade: worksite complete? → project complete?
    pass


# ── Workgroup Invoice Summary ─────────────────────────

@router.get("/workgroup/{workgroup_id}/summary")
async def workgroup_invoice_summary(
    workgroup_id: str,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Invoice summary for a workgroup: total invoiced, paid, remaining.
    Uses the workgroup_invoice_summary view.
    """
    # TODO: Query workgroup_invoice_summary view
    return {}
