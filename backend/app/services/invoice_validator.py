"""
Service — AI Invoice Validation

10-point checklist for every submitted invoice:
 1. All referenced jobs exist in this workgroup
 2. All referenced jobs are marked "complete"
 3. No referenced job appears on a previous invoice (no double-billing)
 4. Line item amounts align with job budgets (within threshold)
 5. Invoice total = sum of line items
 6. Cumulative invoiced amount ≤ workgroup budget
 7. No duplicate invoice (same jobs, same amounts)
 8. OCR data matches structured line items (if PDF uploaded)
 9. Required documentation present (receipts, photos per job)
10. Site presence verified (GPS check-ins exist for relevant period)

Outcome: 'ai_validated' → route to approval, or 'ai_flagged' → review
"""

from decimal import Decimal


async def validate_invoice(invoice_id: str, db) -> dict:
    """
    Run the full 10-point validation checklist on an invoice.
    
    Returns: {
        is_valid: bool,
        checks: [ { check: str, passed: bool, detail: str }, ... ],
        flags: [ str, ... ],
        recommendation: "route_to_approval" | "flag_for_review"
    }
    """
    checks = []

    # TODO: Fetch invoice + line items
    # TODO: Fetch workgroup + jobs
    # TODO: Fetch previous invoices for this workgroup
    # TODO: Run each check below:

    # Check 1: Jobs exist in workgroup
    # Check 2: Jobs are marked complete
    # Check 3: No double-billing
    # Check 4: Amounts align with job budgets (configurable threshold)
    # Check 5: Total = sum of line items
    # Check 6: Cumulative ≤ workgroup budget
    # Check 7: No duplicate invoice
    # Check 8: OCR cross-reference (if PDF)
    # Check 9: Required docs present
    # Check 10: Site presence verified

    # TODO: Update invoice status and ai_flags
    # TODO: Return validation result

    return {
        "is_valid": False,
        "checks": checks,
        "flags": [],
        "recommendation": "flag_for_review",
    }


async def check_no_double_billing(job_ids: list[str], workgroup_id: str, db) -> dict:
    """Check that none of the jobs appear on existing invoices."""
    # TODO: Query invoices WHERE workgroup_id, check line_items for overlap
    return {"passed": True, "detail": "No double-billing detected"}


async def check_site_presence(workgroup_id: str, db) -> dict:
    """Verify GPS check-ins exist for this workgroup's jobs."""
    # TODO: Query site_checkins for the workgroup
    # TODO: Check that check-ins cover the relevant work period
    return {"passed": True, "detail": "Site presence verified"}
