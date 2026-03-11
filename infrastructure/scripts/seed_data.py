"""Seed DynamoDB with test data for local development."""

import boto3
from decimal import Decimal

ENDPOINT = "http://localhost:8000"
TABLE_NAME = "CMS_Main_dev"
REGION = "us-east-1"


def d(val):
    """Convert float to Decimal for DynamoDB."""
    return Decimal(str(val))


def seed():
    dynamodb = boto3.resource(
        "dynamodb",
        endpoint_url=ENDPOINT,
        region_name=REGION,
        aws_access_key_id="dummy",
        aws_secret_access_key="dummy",
    )
    table = dynamodb.Table(TABLE_NAME)

    items = [
        # ─── Organization ──────────────────────────
        {
            "PK": "ORG#org-dev",
            "SK": "PROFILE",
            "id": "org-dev",
            "name": "Acme Property Management",
            "template": "property_management",
            "settings": {"terminology": {"job": "Work Order", "contractor": "Vendor"}},
            "entity_type": "organization",
        },

        # ─── Users ─────────────────────────────────
        {
            "PK": "ORG#org-dev",
            "SK": "USER#user-dev-owner",
            "id": "user-dev-owner",
            "email": "owner@acmeprop.com",
            "name": "Sarah Johnson",
            "role": "owner",
            "entity_type": "user",
        },

        # ─── Contractors ───────────────────────────
        {
            "PK": "ORG#org-dev",
            "SK": "CONTRACTOR#con-001",
            "id": "con-001",
            "company_name": "John's Roofing LLC",
            "contact_name": "John Martinez",
            "email": "john@johnsroofing.com",
            "phone": "555-0101",
            "skills": ["roofing", "gutters", "flashing"],
            "certifications": ["Licensed Roofer", "Insured"],
            "rating": d(4.8),
            "entity_type": "contractor",
        },
        {
            "PK": "ORG#org-dev",
            "SK": "CONTRACTOR#con-002",
            "id": "con-002",
            "company_name": "Spark Electric Co",
            "contact_name": "Mike Chen",
            "email": "mike@sparkelectric.com",
            "phone": "555-0102",
            "skills": ["electrical", "wiring", "panel upgrades", "lighting"],
            "certifications": ["Master Electrician", "Insured", "Bonded"],
            "rating": d(4.6),
            "entity_type": "contractor",
        },
        {
            "PK": "ORG#org-dev",
            "SK": "CONTRACTOR#con-003",
            "id": "con-003",
            "company_name": "Quick Plumb Solutions",
            "contact_name": "Ana Rodriguez",
            "email": "ana@quickplumb.com",
            "phone": "555-0103",
            "skills": ["plumbing", "water heaters", "drain cleaning", "fixtures"],
            "certifications": ["Licensed Plumber", "Insured"],
            "rating": d(4.5),
            "entity_type": "contractor",
        },
        {
            "PK": "ORG#org-dev",
            "SK": "CONTRACTOR#con-004",
            "id": "con-004",
            "company_name": "Pro Painters Inc",
            "contact_name": "David Kim",
            "email": "david@propainters.com",
            "phone": "555-0104",
            "skills": ["interior painting", "exterior painting", "drywall repair"],
            "certifications": ["Insured", "EPA Lead-Safe Certified"],
            "rating": d(4.7),
            "entity_type": "contractor",
        },

        # ─── Contractor Profiles (GSI1) ────────────
        {
            "PK": "CONTRACTOR#con-001",
            "SK": "PROFILE",
            "GSI1PK": "CONTRACTOR#con-001",
            "GSI1SK": "PROFILE",
            "id": "con-001",
            "company_name": "John's Roofing LLC",
            "contact_name": "John Martinez",
            "skills": ["roofing", "gutters", "flashing"],
            "rating": d(4.8),
            "performance": {
                "total_workgroups": 23,
                "completed_workgroups": 21,
                "completion_rate": d(0.91),
                "on_time_rate": d(0.87),
                "avg_rating": d(4.8),
                "total_earned": d(187500),
            },
            "entity_type": "contractor_profile",
        },

        # ─── Project 1: 123 Main St Renovation ────
        {
            "PK": "ORG#org-dev",
            "SK": "PROJECT#proj-001",
            "id": "proj-001",
            "title": "123 Main St - Full Renovation",
            "budget": d(85000),
            "status": "active",
            "progress_pct": d(38),
            "deadline": "2026-06-30",
            "created_at": "2026-02-15T10:00:00Z",
            "entity_type": "project_ref",
        },
        {
            "PK": "PROJECT#proj-001",
            "SK": "DETAIL",
            "id": "proj-001",
            "org_id": "org-dev",
            "title": "123 Main St - Full Renovation",
            "description": "Complete renovation of 3-bedroom residential property.",
            "location": "123 Main St, Anytown, USA",
            "budget": d(85000),
            "start_date": "2026-03-01",
            "deadline": "2026-06-30",
            "status": "active",
            "progress_pct": d(38),
            "created_by": "user-dev-owner",
            "created_at": "2026-02-15T10:00:00Z",
            "updated_at": "2026-03-01T08:00:00Z",
            "entity_type": "project",
        },
        {
            "PK": "PROJECT#proj-001",
            "SK": "STATS",
            "total_workgroups": 4,
            "active_workgroups": 2,
            "completed_workgroups": 1,
            "total_budget": d(85000),
            "total_spent": d(15000),
            "total_invoiced": d(15000),
            "progress_pct": d(38),
            "entity_type": "project_stats",
        },

        # ─── Workgroups for Project 1 ──────────────

        # Roofing (Complete)
        {
            "PK": "PROJECT#proj-001",
            "SK": "WG#wg-001",
            "id": "wg-001",
            "title": "Roofing",
            "trade": "roofing",
            "contractor_id": "con-001",
            "budget": d(15000),
            "status": "complete",
            "progress_pct": d(100),
            "dependencies": [],
            "start_date": "2026-03-01",
            "end_date": "2026-03-15",
            "entity_type": "workgroup_ref",
        },
        {
            "PK": "WG#wg-001",
            "SK": "DETAIL",
            "id": "wg-001",
            "project_id": "proj-001",
            "title": "Roofing",
            "trade": "roofing",
            "contractor_id": "con-001",
            "budget": d(15000),
            "status": "complete",
            "progress_pct": d(100),
            "dependencies": [],
            "total_invoiced": d(15000),
            "total_paid": d(15000),
            "start_date": "2026-03-01",
            "end_date": "2026-03-15",
            "created_at": "2026-02-15T10:00:00Z",
            "updated_at": "2026-03-14T16:00:00Z",
            "entity_type": "workgroup",
        },

        # Roofing Jobs
        {
            "PK": "WG#wg-001",
            "SK": "JOB#job-001",
            "id": "job-001",
            "title": "Remove old shingles",
            "budget": d(2000),
            "sequence": 1,
            "status": "paid",
            "invoice_id": "inv-001",
            "entity_type": "job_ref",
        },
        {
            "PK": "WG#wg-001",
            "SK": "JOB#job-002",
            "id": "job-002",
            "title": "Repair roof deck",
            "budget": d(4000),
            "sequence": 2,
            "status": "paid",
            "invoice_id": "inv-001",
            "entity_type": "job_ref",
        },
        {
            "PK": "WG#wg-001",
            "SK": "JOB#job-003",
            "id": "job-003",
            "title": "Install new shingles",
            "budget": d(7000),
            "sequence": 3,
            "status": "paid",
            "invoice_id": "inv-002",
            "entity_type": "job_ref",
        },
        {
            "PK": "WG#wg-001",
            "SK": "JOB#job-004",
            "id": "job-004",
            "title": "Install gutters",
            "budget": d(2000),
            "sequence": 4,
            "status": "paid",
            "invoice_id": "inv-002",
            "entity_type": "job_ref",
        },

        # Roofing Invoices (2 invoices — partial payment model)
        {
            "PK": "WG#wg-001",
            "SK": "INVOICE#inv-001",
            "id": "inv-001",
            "workgroup_id": "wg-001",
            "contractor_id": "con-001",
            "invoice_number": "INV-001",
            "amount": d(6000),
            "line_items": [
                {"job_id": "job-001", "job_title": "Remove old shingles", "amount": d(2000), "job_budget": d(2000), "variance": d(0)},
                {"job_id": "job-002", "job_title": "Repair roof deck", "amount": d(4000), "job_budget": d(4000), "variance": d(0)},
            ],
            "status": "paid",
            "ai_validated": True,
            "ai_flags": [],
            "submitted_at": "2026-03-08T14:00:00Z",
            "paid_at": "2026-03-10T09:00:00Z",
            "created_at": "2026-03-08T14:00:00Z",
            "updated_at": "2026-03-10T09:00:00Z",
            "entity_type": "invoice",
        },
        {
            "PK": "WG#wg-001",
            "SK": "INVOICE#inv-002",
            "id": "inv-002",
            "workgroup_id": "wg-001",
            "contractor_id": "con-001",
            "invoice_number": "INV-002",
            "amount": d(9000),
            "line_items": [
                {"job_id": "job-003", "job_title": "Install new shingles", "amount": d(7000), "job_budget": d(7000), "variance": d(0)},
                {"job_id": "job-004", "job_title": "Install gutters", "amount": d(2000), "job_budget": d(2000), "variance": d(0)},
            ],
            "status": "paid",
            "ai_validated": True,
            "ai_flags": [],
            "submitted_at": "2026-03-14T16:00:00Z",
            "paid_at": "2026-03-16T09:00:00Z",
            "created_at": "2026-03-14T16:00:00Z",
            "updated_at": "2026-03-16T09:00:00Z",
            "entity_type": "invoice",
        },

        # Electrical (In Progress)
        {
            "PK": "PROJECT#proj-001",
            "SK": "WG#wg-002",
            "id": "wg-002",
            "title": "Electrical",
            "trade": "electrical",
            "contractor_id": "con-002",
            "budget": d(22000),
            "status": "in_progress",
            "progress_pct": d(33),
            "dependencies": ["wg-001"],
            "start_date": "2026-03-10",
            "end_date": "2026-04-05",
            "entity_type": "workgroup_ref",
        },
        {
            "PK": "WG#wg-002",
            "SK": "DETAIL",
            "id": "wg-002",
            "project_id": "proj-001",
            "title": "Electrical",
            "trade": "electrical",
            "contractor_id": "con-002",
            "budget": d(22000),
            "status": "in_progress",
            "progress_pct": d(33),
            "dependencies": ["wg-001"],
            "total_invoiced": d(0),
            "total_paid": d(0),
            "start_date": "2026-03-10",
            "end_date": "2026-04-05",
            "created_at": "2026-02-15T10:00:00Z",
            "updated_at": "2026-03-15T08:00:00Z",
            "entity_type": "workgroup",
        },
        {
            "PK": "WG#wg-002",
            "SK": "JOB#job-005",
            "id": "job-005",
            "title": "Rewire main panel",
            "budget": d(10000),
            "sequence": 1,
            "status": "complete",
            "invoice_id": None,
            "entity_type": "job_ref",
        },
        {
            "PK": "WG#wg-002",
            "SK": "JOB#job-006",
            "id": "job-006",
            "title": "Install new outlets (kitchen)",
            "budget": d(6000),
            "sequence": 2,
            "status": "in_progress",
            "invoice_id": None,
            "entity_type": "job_ref",
        },
        {
            "PK": "WG#wg-002",
            "SK": "JOB#job-007",
            "id": "job-007",
            "title": "Install lighting fixtures",
            "budget": d(6000),
            "sequence": 3,
            "status": "not_started",
            "invoice_id": None,
            "entity_type": "job_ref",
        },

        # Plumbing (Pending — waiting for contractor)
        {
            "PK": "PROJECT#proj-001",
            "SK": "WG#wg-003",
            "id": "wg-003",
            "title": "Plumbing",
            "trade": "plumbing",
            "contractor_id": "con-003",
            "budget": d(18000),
            "status": "pending",
            "progress_pct": d(0),
            "dependencies": ["wg-001"],
            "start_date": "2026-03-10",
            "end_date": "2026-03-30",
            "entity_type": "workgroup_ref",
        },

        # Painting (Not started — waiting on dependencies)
        {
            "PK": "PROJECT#proj-001",
            "SK": "WG#wg-004",
            "id": "wg-004",
            "title": "Painting",
            "trade": "painting",
            "contractor_id": None,
            "budget": d(12000),
            "status": "draft",
            "progress_pct": d(0),
            "dependencies": ["wg-002", "wg-003"],
            "start_date": "2026-04-10",
            "end_date": "2026-04-25",
            "entity_type": "workgroup_ref",
        },
    ]

    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)

    print(f"✅ Seeded {len(items)} items into '{TABLE_NAME}'.")
    print("   • 1 organization")
    print("   • 1 user (owner)")
    print("   • 4 contractors")
    print("   • 1 project (123 Main St Renovation)")
    print("   • 4 workgroups (Roofing✅, Electrical🟡, Plumbing⏳, Painting📝)")
    print("   • 7 jobs across workgroups")
    print("   • 2 invoices (partial payment model demo)")


if __name__ == "__main__":
    seed()