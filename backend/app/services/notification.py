"""
Service — Notifications

Sends notifications via SMS (Twilio/SNS), Email (SES), and Push (Pinpoint).
Follows the notification matrix from Part 8 of the spec.

All preferences configurable per user and per organization.
"""

from typing import Optional


# ── Core Senders ──────────────────────────────────────

async def send_sms(phone: str, message: str) -> bool:
    """Send SMS via Twilio or Amazon SNS."""
    # TODO: Use Twilio client or boto3 SNS
    return False


async def send_email(
    to_email: str,
    subject: str,
    body_html: str,
    body_text: Optional[str] = None,
    attachments: Optional[list] = None,
) -> bool:
    """Send email via Amazon SES."""
    # TODO: Use boto3 SES
    return False


async def send_push(user_id: str, title: str, body: str, data: Optional[dict] = None) -> bool:
    """Send push notification via Amazon Pinpoint."""
    # TODO: Use boto3 Pinpoint
    return False


# ── Event-Based Notifications ─────────────────────────

async def notify_workgroup_allocated(workgroup_id: str, db):
    """Contractor allocated → SMS + Email with QR code to contractor."""
    # TODO: Fetch workgroup + contractor + QR token
    # TODO: Send SMS with link to contractor phone
    # TODO: Send Email with QR image to contractor email
    pass


async def notify_contractor_response(workgroup_id: str, action: str, db):
    """Contractor accepted/rejected → Push + Email to owner + contacts."""
    # TODO: Fetch relevant parties
    # TODO: Send notifications per matrix
    pass


async def notify_invoice_submitted(invoice_id: str, db):
    """Invoice submitted → Push + Email to owner + contacts."""
    pass


async def notify_invoice_decision(invoice_id: str, decision: str, db):
    """Invoice approved/rejected → SMS + Push to contractor."""
    pass


async def notify_payment_processed(invoice_id: str, db):
    """Payment processed → SMS + Email to contractor."""
    pass


async def notify_deadline_approaching(workgroup_id: str, db):
    """Deadline approaching → Push to owner + contacts, SMS to contractor."""
    pass


async def notify_no_response(workgroup_id: str, hours_elapsed: int, db):
    """No contractor response → reminder at 24h, escalation at 48h."""
    pass


async def notify_dependency_unblocked(workgroup_id: str, db):
    """Dependency unblocked → Push + Email + new QR link to contractor."""
    pass


async def notify_anomaly(anomaly_type: str, entity_id: str, details: str, db):
    """AI anomaly detected → Push + Email to owner + contacts."""
    pass
