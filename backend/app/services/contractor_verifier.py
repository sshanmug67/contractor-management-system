"""
Service — Contractor Verification Pipeline

External verification of contractor standing:
- License verification
- Insurance validation
- BBB (Better Business Bureau) lookup
- Custom checks

Uses SerpAPI / Tavily for web-based research.
Periodic re-verification alerts.
"""


async def verify_contractor(
    contractor_id: str,
    verification_type: str,
    db,
) -> dict:
    """
    Run an external verification check for a contractor.
    
    Types: 'license', 'insurance', 'bbb', 'custom'
    
    Returns: { status: 'passed'|'failed'|'expired'|'pending', details: {...} }
    """
    # TODO: Fetch contractor details
    # TODO: Based on type, call appropriate verifier:
    #   - license → verify_license()
    #   - insurance → verify_insurance()
    #   - bbb → verify_bbb()
    # TODO: Create contractor_verifications record
    # TODO: Update contractor.verification_status
    return {"status": "pending", "details": {}}


async def verify_license(license_number: str, state: str) -> dict:
    """Verify a contractor's license via state database / SerpAPI."""
    # TODO: Use SerpAPI to search state licensing board
    # TODO: Parse results
    return {"status": "pending", "source_url": ""}


async def verify_insurance(contractor_id: str, db) -> dict:
    """Verify contractor insurance is current and valid."""
    # TODO: Check insurance_info JSONB for expiration
    # TODO: Optionally verify with insurer
    return {"status": "pending"}


async def verify_bbb(company_name: str, city: str, state: str) -> dict:
    """Look up contractor on Better Business Bureau."""
    # TODO: Use SerpAPI to search BBB
    return {"status": "pending", "rating": None}


async def check_expiring_verifications(db) -> list:
    """Find contractors with verifications expiring soon. For scheduled job."""
    # TODO: Query contractor_verifications WHERE expires_at < NOW() + interval
    return []
