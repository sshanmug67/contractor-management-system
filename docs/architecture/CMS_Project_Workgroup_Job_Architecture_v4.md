# Contractor Management System — Project, Worksite, Workgroup & Job Architecture

## Executive Summary

The Contractor Management System operates on a four-level hierarchy: **Project → Worksite → Workgroup → Job**. A Business Owner creates a Project with one or more Worksites (physical locations), each Worksite contains Workgroups (each assigned to a Contractor), and each Workgroup contains one or more Jobs. Business Employees serve as contact persons for each Worksite. An AI Agent orchestrates the entire lifecycle — from smart allocation to dependency monitoring to completion validation.

**Architecture:** Container-based Python (FastAPI) backend, Supabase (PostgreSQL) database, deployed to AWS Fargate for serverless container execution.

---

## Data Hierarchy

```
PROJECT (The overall engagement)
│
│   Example: "ABC Properties — Multi-Site Renovation"
│   Owner: Business Owner (Organization)
│   Total Budget: $185,000
│   Start: March 1, 2026
│   Deadline: September 30, 2026
│
├── WORKSITE 1: "123 Main St, Austin TX"
│   │   Address: 123 Main St, Austin, TX 78701
│   │   Phone: (512) 555-0101
│   │   Primary Contact: Sarah Johnson (Business Employee)
│   │   Secondary Contact: Mike Chen (Business Employee)
│   │   Budget: $85,000
│   │
│   ├── WORKGROUP 1.1 (Assigned to Contractor A — Roofing Company)
│   │   ├── Job 1.1.1: Remove old shingles
│   │   ├── Job 1.1.2: Repair roof deck
│   │   ├── Job 1.1.3: Install new shingles
│   │   └── Job 1.1.4: Install gutters
│   │
│   ├── WORKGROUP 1.2 (Assigned to Contractor B — Electrician)
│   │   ├── Job 1.2.1: Rewire main panel
│   │   ├── Job 1.2.2: Install new outlets (kitchen)
│   │   └── Job 1.2.3: Install lighting fixtures
│   │
│   ├── WORKGROUP 1.3 (Assigned to Contractor C — Plumber)
│   │   ├── Job 1.3.1: Replace main water line
│   │   ├── Job 1.3.2: Install new bathroom fixtures
│   │   └── Job 1.3.3: Install kitchen plumbing
│   │
│   └── WORKGROUP 1.4 (Assigned to Contractor D — Painter)
│       ├── Job 1.4.1: Interior painting (bedrooms)
│       ├── Job 1.4.2: Interior painting (kitchen/living)
│       └── Job 1.4.3: Exterior painting
│
├── WORKSITE 2: "456 Oak Ave, Austin TX"
│   │   Address: 456 Oak Ave, Austin, TX 78702
│   │   Phone: (512) 555-0202
│   │   Primary Contact: Mike Chen (Business Employee)
│   │   Secondary Contact: Lisa Park (Business Employee)
│   │   Budget: $55,000
│   │
│   ├── WORKGROUP 2.1 (Assigned to Contractor E — HVAC)
│   │   ├── Job 2.1.1: Remove old HVAC system
│   │   ├── Job 2.1.2: Install new ductwork
│   │   └── Job 2.1.3: Install new AC unit
│   │
│   └── WORKGROUP 2.2 (Assigned to Contractor B — Electrician)
│       ├── Job 2.2.1: Upgrade electrical panel
│       └── Job 2.2.2: Install EV charger
│
└── WORKSITE 3: "789 Elm St, Round Rock TX"
    │   Address: 789 Elm St, Round Rock, TX 78664
    │   Phone: (512) 555-0303
    │   Primary Contact: Sarah Johnson (Business Employee)
    │   Budget: $45,000
    │
    ├── WORKGROUP 3.1 (Assigned to Contractor F — Flooring)
    │   ├── Job 3.1.1: Remove carpet
    │   ├── Job 3.1.2: Prepare subfloor
    │   └── Job 3.1.3: Install hardwood
    │
    └── WORKGROUP 3.2 (Assigned to Contractor D — Painter)
        ├── Job 3.2.1: Interior painting
        └── Job 3.2.2: Exterior painting
```

### Key Relationships

| Entity | Contains | Assigned To | Scope |
|--------|----------|-------------|-------|
| **Project** | Multiple Worksites | Business Owner (creator) | The entire engagement / contract |
| **Worksite** | Multiple Workgroups | Business Employees (contact persons) | A physical work location |
| **Workgroup** | Multiple Jobs | One Contractor | A trade or skill area at a specific worksite |
| **Job** | Checklists, Uploads, Messages | Part of Workgroup | A single discrete task to complete |

### Key Rules

- One Project has many Worksites
- One Worksite has one address, phone, and site-specific details
- One or more Business Employees assigned per Worksite (primary + secondary contacts)
- One Worksite has many Workgroups
- One Workgroup belongs to exactly one Worksite
- One Workgroup is assigned to exactly one Contractor
- One Contractor can have multiple Workgroups (across different worksites and projects)
- One Workgroup has one or more Jobs
- Messages are per Workgroup (contractor ↔ business owner/employee conversation)
- Uploads (photos, files) can be per Job or per Workgroup
- **Invoices are per Workgroup — each invoice can cover one or more Jobs within the workgroup**
- **Multiple invoices per Workgroup are allowed (invoice as you go)**
- **Each Job can only appear on one invoice (no double-billing)**
- Workgroups can have dependencies on other Workgroups within the same Worksite
- Cross-worksite dependencies are also supported (but less common)
- Jobs can have dependencies on other Jobs within the same Workgroup

### Business Employee Model

```
ORGANIZATION: "ABC Properties LLC"
│
├── Business Owner: Tom Wilson (owner/admin)
│
├── Employee: Sarah Johnson
│   ├── Email: sarah@abcproperties.com
│   ├── Phone: (512) 555-1001
│   ├── Role: Project Manager
│   └── Assigned Worksites:
│       ├── 123 Main St — PRIMARY contact
│       └── 789 Elm St — PRIMARY contact
│
├── Employee: Mike Chen
│   ├── Email: mike@abcproperties.com
│   ├── Phone: (512) 555-1002
│   ├── Role: Site Supervisor
│   └── Assigned Worksites:
│       ├── 123 Main St — SECONDARY contact
│       └── 456 Oak Ave — PRIMARY contact
│
└── Employee: Lisa Park
    ├── Email: lisa@abcproperties.com
    ├── Phone: (512) 555-1003
    ├── Role: Operations Coordinator
    └── Assigned Worksites:
        └── 456 Oak Ave — SECONDARY contact

Contact Person Rules:
  • Each Worksite must have at least one PRIMARY contact
  • Secondary contacts are optional but recommended
  • A Business Employee can be a contact for multiple Worksites
  • Contact assignments include a role (primary/secondary)
  • Contractors see contact person details for their Worksite
  • Notifications route to the appropriate contact person(s) per Worksite
```

### Invoice Model

```
WORKGROUP: Roofing at 123 Main St ($15,000 total budget)
├── Job 1: Remove old shingles      $2,000   ✅ Complete
├── Job 2: Repair roof deck         $4,000   ✅ Complete
├── Job 3: Install new shingles     $7,000   ✅ Complete
└── Job 4: Install gutters          $2,000   ✅ Complete

Contractor submits invoices flexibly:

  Invoice #1: $6,000
  ├── Line item: Job 1 — Remove old shingles    $2,000
  └── Line item: Job 2 — Repair roof deck       $4,000

  Invoice #2: $9,000
  ├── Line item: Job 3 — Install new shingles   $7,000
  └── Line item: Job 4 — Install gutters         $2,000

Rules:
  • Each invoice references specific jobs via line items
  • A job can only appear on ONE invoice (AI enforces no double-billing)
  • Invoice total must align with sum of referenced job budgets
  • Contractor decides how to bundle jobs per invoice
  • Enables partial payment as work progresses
```

---

# PART 1: COMPLETE LIFECYCLE FLOW

## Stage 1: Project Creation, Worksite & Workgroup Setup

```
┌─────────────────────────────────────────────────────────────────────┐
│         STAGE 1: PROJECT CREATION, WORKSITE & WORKGROUP SETUP        │
│                                                                       │
│  BUSINESS OWNER                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Step 1: Create Project                                        │   │
│  │                                                                │   │
│  │  • Title: "ABC Properties — Multi-Site Renovation"            │   │
│  │  • Total budget: $185,000                                     │   │
│  │  • Start date: March 1, 2026                                  │   │
│  │  • Deadline: September 30, 2026                               │   │
│  │  • Description / Scope of work                                │   │
│  │  • Attachments (blueprints, plans, photos)                    │   │
│  │                                                                │   │
│  │  AI Agent assists:                                             │   │
│  │   • Suggests worksite breakdown based on description          │   │
│  │   • Estimates budget allocation per worksite                  │   │
│  │   • Identifies likely dependencies across worksites           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│         │                                                             │
│         ▼                                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Step 2: Create Worksites within Project                       │   │
│  │                                                                │   │
│  │  Worksite 1: "123 Main St"                                    │   │
│  │    Address: 123 Main St, Austin, TX 78701                     │   │
│  │    Phone: (512) 555-0101                                      │   │
│  │    Site Notes: "Two-story residential, built 1985"            │   │
│  │    Budget: $85,000                                             │   │
│  │    Start: Mar 1  |  End: Jun 30                               │   │
│  │    Primary Contact: Sarah Johnson                              │   │
│  │    Secondary Contact: Mike Chen                                │   │
│  │                                                                │   │
│  │  Worksite 2: "456 Oak Ave"                                    │   │
│  │    Address: 456 Oak Ave, Austin, TX 78702                     │   │
│  │    Phone: (512) 555-0202                                      │   │
│  │    Site Notes: "Commercial unit, ground floor"                │   │
│  │    Budget: $55,000                                             │   │
│  │    Start: Apr 1  |  End: Jul 15                               │   │
│  │    Primary Contact: Mike Chen                                  │   │
│  │    Secondary Contact: Lisa Park                                │   │
│  │                                                                │   │
│  │  Worksite 3: "789 Elm St"                                     │   │
│  │    Address: 789 Elm St, Round Rock, TX 78664                  │   │
│  │    Phone: (512) 555-0303                                      │   │
│  │    Budget: $45,000                                             │   │
│  │    Start: May 1  |  End: Sep 30                               │   │
│  │    Primary Contact: Sarah Johnson                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│         │                                                             │
│         ▼                                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Step 3: Create Workgroups within each Worksite                │   │
│  │                                                                │   │
│  │  Worksite: "123 Main St"                                      │   │
│  │                                                                │   │
│  │  Workgroup: "Roofing"                                         │   │
│  │    Trade: Roofing                                              │   │
│  │    Budget: $15,000                                             │   │
│  │    Start: Mar 1  |  End: Mar 15                               │   │
│  │    Dependencies: None (can start immediately)                 │   │
│  │                                                                │   │
│  │  Workgroup: "Electrical"                                      │   │
│  │    Trade: Electrical                                           │   │
│  │    Budget: $22,000                                             │   │
│  │    Start: Mar 10  |  End: Apr 5                               │   │
│  │    Dependencies: Roofing (must complete roof before wiring)   │   │
│  │                                                                │   │
│  │  Workgroup: "Plumbing"                                        │   │
│  │    Trade: Plumbing                                             │   │
│  │    Budget: $18,000                                             │   │
│  │    Start: Mar 10  |  End: Mar 30                              │   │
│  │    Dependencies: Roofing (partial)                             │   │
│  │                                                                │   │
│  │  Workgroup: "Painting"                                        │   │
│  │    Trade: Painting                                             │   │
│  │    Budget: $12,000                                             │   │
│  │    Start: Apr 10  |  End: Apr 25                              │   │
│  │    Dependencies: Electrical + Plumbing (walls must be closed) │   │
│  └──────────────────────────────────────────────────────────────┘   │
│         │                                                             │
│         ▼                                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Step 4: Define Jobs within each Workgroup                     │   │
│  │                                                                │   │
│  │  Worksite: "123 Main St" → Workgroup: "Roofing"              │   │
│  │    ├── Job: Remove old shingles       $2,000   2 days  Seq:1 │   │
│  │    ├── Job: Repair roof deck          $4,000   3 days  Seq:2 │   │
│  │    ├── Job: Install new shingles      $7,000   4 days  Seq:3 │   │
│  │    └── Job: Install gutters           $2,000   1 day   Seq:4 │   │
│  │                                                                │   │
│  │  AI Agent suggests:                                            │   │
│  │   • Job sequence / dependencies within workgroup              │   │
│  │   • Estimated duration based on similar past projects         │   │
│  │   • Budget allocation per job based on market rates           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│         │                                                             │
│         ▼                                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Step 5: Allocate Contractors to Workgroups                    │   │
│  │                                                                │   │
│  │  AI Agent scores and recommends contractors per workgroup:    │   │
│  │                                                                │   │
│  │  Roofing Workgroup @ 123 Main St:                             │   │
│  │    ★★★★★ John's Roofing   (Score: 95) — [Allocate]           │   │
│  │    ★★★★  ABC Roofing      (Score: 87) — [Allocate]           │   │
│  │    ★★★   Peak Roofing     (Score: 74) — [Skip]               │   │
│  │                                                                │   │
│  │  Proximity scoring now uses worksite address (not just        │   │
│  │  project-level), so contractor scores may vary per worksite.  │   │
│  │                                                                │   │
│  │  Each contractor receives notification about THEIR workgroup  │   │
│  │  including worksite address and contact person details.       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### AI Allocation Algorithm (Scoring Model)

```
Contractor Score = Weighted Sum of:

┌──────────────────────────┬────────┬──────────────────────────────────┐
│ Factor                   │ Weight │ How It's Calculated              │
├──────────────────────────┼────────┼──────────────────────────────────┤
│ Skill Match              │ 30%    │ Required trade/skills vs.        │
│                          │        │ contractor certifications        │
├──────────────────────────┼────────┼──────────────────────────────────┤
│ Past Performance         │ 25%    │ Avg rating + completion          │
│                          │        │ rate + on-time %                 │
├──────────────────────────┼────────┼──────────────────────────────────┤
│ Availability             │ 20%    │ Current workgroup count vs.      │
│                          │        │ capacity + calendar              │
├──────────────────────────┼────────┼──────────────────────────────────┤
│ Geographic Proximity     │ 15%    │ Distance from contractor         │
│                          │        │ base to WORKSITE address         │
├──────────────────────────┼────────┼──────────────────────────────────┤
│ Pricing History          │ 10%    │ Typical rate vs. workgroup       │
│                          │        │ budget (value for money)         │
└──────────────────────────┴────────┴──────────────────────────────────┘

Weights are configurable per organization.
AI learns and adjusts weights over time based on outcomes.
Proximity is calculated per WORKSITE (not project), so a contractor
may score differently for different worksites within the same project.
```

---

## Stage 2: Accept / Reject

```
┌─────────────────────────────────────────────────────────────────────┐
│                   STAGE 2: ACCEPT / REJECT                           │
│                                                                       │
│  Contractor sees new workgroup in app:                               │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ NEW WORKGROUP                                                  │   │
│  │                                                                │   │
│  │ Project: ABC Properties — Multi-Site Renovation               │   │
│  │ Worksite: 123 Main St, Austin, TX 78701                       │   │
│  │ Your Workgroup: Roofing                                       │   │
│  │ Budget: $15,000                                                │   │
│  │ Timeline: Mar 1 - Mar 15                                      │   │
│  │                                                                │   │
│  │ Site Contact: Sarah Johnson (Primary)                          │   │
│  │   📧 sarah@abcproperties.com  📞 (512) 555-1001              │   │
│  │                                                                │   │
│  │ Jobs:                                                          │   │
│  │  1. Remove old shingles         $2,000    2 days              │   │
│  │  2. Repair roof deck            $4,000    3 days              │   │
│  │  3. Install new shingles        $7,000    4 days              │   │
│  │  4. Install gutters             $2,000    1 day               │   │
│  │                                                                │   │
│  │  ┌──────────────────┐    ┌──────────────────┐                 │   │
│  │  │ ✓ ACCEPT          │    │ ✗ REJECT          │                 │   │
│  │  │   WORKGROUP       │    │                    │                 │   │
│  │  └──────────────────┘    └──────────────────┘                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  If ACCEPTED:                                                        │
│   → Workgroup status: "In Progress"                                  │
│   → Business Owner + Worksite Contact Person(s) notified             │
│   → Messaging thread opens                                           │
│   → AI Agent starts monitoring timeline and dependencies             │
│                                                                       │
│  If REJECTED:                                                        │
│   → Contractor provides reason (optional)                            │
│   → AI notifies Business Owner + Contact Person(s)                   │
│   → AI suggests next-best contractor                                 │
│   → If reason = "budget too low": AI suggests adjusted budget       │
│                                                                       │
│  If NO RESPONSE within 24 hours:                                     │
│   → AI sends reminder                                                │
│   → After 48 hours: auto-escalate, suggest alternatives             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Stage 3: In-Progress Communication & Work

```
┌─────────────────────────────────────────────────────────────────────┐
│                STAGE 3: COMMUNICATION & PROGRESS                     │
│                                                                       │
│  CONTRACTOR APP (Mobile)              BUSINESS OWNER DASHBOARD       │
│  ┌──────────────────────┐             ┌──────────────────────┐       │
│  │ WORKGROUP: Roofing    │             │ PROJECT: Multi-Site   │       │
│  │ Site: 123 Main St     │             │ Worksite: 123 Main St │       │
│  │ Progress: ████░░ 37%  │             │ Workgroup: Roofing    │       │
│  │                        │             │ Contractor: John's    │       │
│  │ Site Contact:          │             │ Progress: ████░░ 37%  │       │
│  │  Sarah J. (Primary)   │             │                        │       │
│  │                        │             │ AI Summary:            │       │
│  │ Jobs:                  │             │ "Tear-off complete.    │       │
│  │ ✅ Remove shingles     │             │  Deck repair started.  │       │
│  │ 🟡 Repair deck (now)  │             │  On track for Mar 15   │       │
│  │ ⬚ Install shingles    │             │  deadline."            │       │
│  │ ⬚ Install gutters     │             │                        │       │
│  │                        │             │ Contact: Sarah Johnson │       │
│  │ Chat + Upload actions  │             │ (Primary)              │       │
│  └──────────────────────┘             └──────────────────────┘       │
│                                                                       │
│  AI AGENT processes every message / upload:                          │
│   1. Classify content (text, photo, receipt, invoice, question)     │
│   2. If photo → Analyze (progress estimate)                         │
│   3. If receipt → OCR + Extract data + Match to job/workgroup budget│
│   4. If invoice → Validate against referenced job budgets           │
│   5. Update job/workgroup/worksite/project progress automatically   │
│   6. Generate AI summary for dashboard                               │
│   7. Flag anomalies (unusual expense, timeline risk)                │
│                                                                       │
│  Proactive monitoring:                                               │
│   • Deadline approaching + low progress → Alert owner + contact     │
│   • No communication for X days → Nudge contractor                  │
│   • Budget exceeded → Flag for review                                │
│   • Job completed → Check if dependent jobs can start               │
│   • Completed jobs not yet invoiced → Prompt contractor             │
│   • All jobs done → Prompt for final invoice submission             │
└─────────────────────────────────────────────────────────────────────┘
```

### Message Types & AI Processing

| Message Type | AI Processing |
|---|---|
| **Text message** | Sentiment analysis, extract action items, detect questions, flag urgent issues |
| **Photo upload** | Classify (progress/completion/damage/before/after), estimate % complete, extract EXIF (timestamp, GPS), auto-tag and file |
| **Receipt upload** | OCR → extract vendor, amount, items, date. Match to job/workgroup budget. Running expense total. Flag if over budget. |
| **Invoice upload** | OCR → extract all line items. Match line items to specific jobs. Validate amounts against job budgets. Check no job is double-billed. Check for duplicate invoices. Route to approval. |
| **Document upload** | Classify (permit, inspection, warranty, certificate). Extract key data. File to appropriate category. |

---

## Stage 4: Completion & Payment

```
┌─────────────────────────────────────────────────────────────────────┐
│                STAGE 4: COMPLETION & PAYMENT                         │
│                                                                       │
│  FLEXIBLE INVOICING — Contractor invoices as jobs complete:         │
│                                                                       │
│  ── PARTIAL INVOICE (mid-workgroup) ──────────────────────────────  │
│                                                                       │
│  Contractor completes Jobs 1 & 2, submits Invoice #1:               │
│         │                                                             │
│         ▼                                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ AI Invoice Validation (Invoice #1)                            │   │
│  │                                                                │   │
│  │ Invoice amount: $6,000                                        │   │
│  │ Line items:                                                    │   │
│  │   Job 1: Remove old shingles     $2,000  ✓ Job complete      │   │
│  │   Job 2: Repair roof deck        $4,000  ✓ Job complete      │   │
│  │                                                                │   │
│  │ Validation checks:                                             │   │
│  │   ✓ All referenced jobs are marked complete                   │   │
│  │   ✓ Line item amounts match job budgets                       │   │
│  │   ✓ No previously invoiced jobs included (no double-billing)  │   │
│  │   ✓ Invoice total = sum of line items                         │   │
│  │   ✓ Within workgroup budget ($6,000 of $15,000)              │   │
│  │   ✓ No duplicate invoice detected                             │   │
│  │                                                                │   │
│  │ Result: ✓ Valid — Route to approval                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│         │                                                             │
│         ▼                                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Approval Routing (Configurable)                               │   │
│  │                                                                │   │
│  │ $6,000 → Route to: Worksite Contact (Sarah Johnson)          │   │
│  │          + Business Owner (if amount > threshold)             │   │
│  │                                                                │   │
│  │ Business Owner / Contact Person sees:                         │   │
│  │ ┌────────────────────────────────────────────────────────┐   │   │
│  │ │ APPROVAL REQUEST                                        │   │   │
│  │ │                                                          │   │   │
│  │ │ Project: ABC Properties — Multi-Site Renovation         │   │   │
│  │ │ Worksite: 123 Main St, Austin TX                        │   │   │
│  │ │ Workgroup: Roofing (Contractor: John's Roofing LLC)    │   │   │
│  │ │ Invoice #1 of workgroup (partial)                       │   │   │
│  │ │                                                          │   │   │
│  │ │ Invoice amount: $6,000                                  │   │   │
│  │ │ Jobs covered:                                            │   │   │
│  │ │   • Remove old shingles     $2,000 (matches budget ✓)  │   │   │
│  │ │   • Repair roof deck        $4,000 (matches budget ✓)  │   │   │
│  │ │                                                          │   │   │
│  │ │ Workgroup invoiced so far: $6,000 / $15,000 (40%)      │   │   │
│  │ │ Remaining jobs not yet invoiced: 2 ($9,000)             │   │   │
│  │ │                                                          │   │   │
│  │ │ AI Summary: "Jobs 1 & 2 completed on time. Before/     │   │   │
│  │ │ after photos confirm tear-off and deck repair. Receipts │   │   │
│  │ │ total $850 in materials. No anomalies."                 │   │   │
│  │ │                                                          │   │   │
│  │ │ 📷 Before/After comparison per job                      │   │   │
│  │ │                                                          │   │   │
│  │ │  [✓ Approve]  [✗ Reject]  [? Query Contractor]         │   │   │
│  │ └────────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  After approval:                                                     │
│  → Payment triggered for $6,000 (QuickBooks / Xero)                 │
│  → Contractor notified: "Payment approved for Invoice #1 ($6,000)" │
│  → Jobs 1 & 2 status: Invoiced & Paid                               │
│  → Workgroup remains "In Progress" (Jobs 3 & 4 still pending)      │
│                                                                       │
│  ── FINAL INVOICE (workgroup completion) ─────────────────────────  │
│                                                                       │
│  Contractor completes Jobs 3 & 4, submits Invoice #2:               │
│         │                                                             │
│         ▼                                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ AI Invoice Validation (Invoice #2)                            │   │
│  │                                                                │   │
│  │ Invoice amount: $9,000                                        │   │
│  │ Line items:                                                    │   │
│  │   Job 3: Install new shingles    $7,000  ✓ Job complete      │   │
│  │   Job 4: Install gutters          $2,000  ✓ Job complete      │   │
│  │                                                                │   │
│  │ Validation checks:                                             │   │
│  │   ✓ All referenced jobs are marked complete                   │   │
│  │   ✓ No previously invoiced jobs (Jobs 1 & 2 on Invoice #1)  │   │
│  │   ✓ Amounts match job budgets                                 │   │
│  │   ✓ Total workgroup invoiced: $6,000 + $9,000 = $15,000     │   │
│  │   ✓ Matches workgroup budget exactly                          │   │
│  │                                                                │   │
│  │ Result: ✓ Valid — Route to approval                           │   │
│  │ Note: This is the FINAL invoice — all jobs now invoiced      │   │
│  └──────────────────────────────────────────────────────────────┘   │
│         │                                                             │
│         ▼ (after approval)                                           │
│  • Payment triggered for $9,000                                     │
│  • Contractor notified                                               │
│  • All jobs invoiced & paid → Workgroup status: Complete            │
│  • AI checks: Does this unblock dependent workgroups?               │
│    → Yes: Notify dependent contractors                               │
│  • Contractor performance profile updated                           │
│  • If ALL workgroups at worksite complete → Worksite: Complete      │
│  • If ALL worksites complete → Project status: Complete             │
│  • AI generates project summary report                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Invoice Tracking Per Workgroup

```
┌─────────────────────────────────────────────────────────────────────┐
│ WORKGROUP INVOICE SUMMARY (Dashboard View)                           │
│                                                                       │
│ Worksite: 123 Main St | Workgroup: Roofing | Contractor: John's    │
│ Budget: $15,000                                                      │
│                                                                       │
│ ┌─────────┬───────────────────────────────┬─────────┬────────────┐ │
│ │ Invoice │ Jobs Covered                  │ Amount  │ Status     │ │
│ ├─────────┼───────────────────────────────┼─────────┼────────────┤ │
│ │ INV-001 │ Job 1: Remove shingles        │ $6,000  │ ✅ Paid     │ │
│ │         │ Job 2: Repair roof deck       │         │            │ │
│ ├─────────┼───────────────────────────────┼─────────┼────────────┤ │
│ │ INV-002 │ Job 3: Install new shingles   │ $9,000  │ ⏳ Pending  │ │
│ │         │ Job 4: Install gutters        │         │ Approval   │ │
│ ├─────────┼───────────────────────────────┼─────────┼────────────┤ │
│ │         │                    TOTAL       │ $15,000 │            │ │
│ │         │                    BUDGET      │ $15,000 │ ✓ On track │ │
│ └─────────┴───────────────────────────────┴─────────┴────────────┘ │
│                                                                       │
│ Jobs NOT YET invoiced: None (all jobs covered)                       │
│                                                                       │
│ AI Note: "All jobs invoiced. Final invoice pending approval.        │
│ Total matches workgroup budget exactly."                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

# PART 2: STATUS CASCADE

## How Status Flows Upward (Four Levels)

```
JOB STATUS           WORKGROUP STATUS      WORKSITE STATUS       PROJECT STATUS
─────────────        ─────────────────     ──────────────────    ──────────────────

Job 1.1.1: Done ┐
Job 1.1.2: Done ├─► WG 1.1: Complete ┐
Job 1.1.3: Done │                     │
Job 1.1.4: Done ┘                     │
                                      ├─► Worksite 1: 58% ┐
Job 1.2.1: Done ┐                     │   In Progress      │
Job 1.2.2: Prog ├─► WG 1.2: 66%     │                     │
Job 1.2.3: Not  ┘   In Progress      │                     │
                                      │                     │
Job 1.3.1: Done ┐                     │                     │
Job 1.3.2: Done ├─► WG 1.3: Complete │                     │
Job 1.3.3: Done ┘                     │                     │
                                      │                     │
Job 1.4.1: Not  ┐                     │                     ├─► Project: 48%
Job 1.4.2: Not  ├─► WG 1.4: 0%      │                     │   In Progress
Job 1.4.3: Not  ┘   (Waiting)        ┘                     │
                                                             │
Job 2.1.1: Done ┐                                           │
Job 2.1.2: Prog ├─► WG 2.1: 50%  ┐                        │
Job 2.1.3: Not  ┘   In Progress   ├─► Worksite 2: 35%     │
                                   │   In Progress          │
Job 2.2.1: Not  ┐                  │                        │
Job 2.2.2: Not  ├─► WG 2.2: 0%   │                        │
                ┘   (Waiting)      ┘                        │
                                                             │
Job 3.1.1: Done ┐                                           │
Job 3.1.2: Done ├─► WG 3.1: 100% ┐                        │
Job 3.1.3: Done ┘   Complete      ├─► Worksite 3: 50%     │
                                   │   In Progress          │
Job 3.2.1: Not  ┐                  │                        │
Job 3.2.2: Not  ├─► WG 3.2: 0%   │                        │
                ┘   (Waiting)      ┘                        ┘
```

### Progress Calculation

| Level | Calculation |
|-------|-------------|
| **Job** | Not Started = 0%, In Progress = 50%, Complete = 100% (or granular from AI photo analysis) |
| **Workgroup** | Average of all job completion percentages |
| **Worksite** | Weighted average of workgroup completions (by budget or count, configurable) |
| **Project** | Weighted average of worksite completions (by budget or count, configurable) |

### Status Definitions

**Job Statuses:** `not_started` → `in_progress` → `complete` → `invoiced` → `paid`

**Workgroup Statuses:** `draft` → `pending` → `accepted` / `rejected` → `in_progress` → `review` → `approved` → `complete` / `disputed`

**Worksite Statuses:** `draft` → `active` → `in_progress` → `review` → `complete` / `on_hold`

**Invoice Statuses:** `draft` → `submitted` → `ai_validated` / `ai_flagged` → `pending_approval` → `approved` / `rejected` → `paid`

**Project Statuses:** `draft` → `planning` → `active` → `review` → `complete` / `on_hold` / `cancelled`

---

# PART 3: WORKGROUP DEPENDENCIES

## Dependency Visualization (Gantt-Style per Worksite)

```
Worksite: 123 Main St, Austin TX
Timeline: March 1 — June 30

         Mar 1    Mar 8    Mar 15   Mar 22   Mar 29   Apr 5    Apr 12   Apr 19   Apr 26
           │        │        │        │        │        │        │        │        │
Roofing    ████████████████░░ ✅
           [No deps — starts immediately]
                              │
Electrical          ░░░░░████████████████████████░░
                    [Depends on Roofing]
                              │
Plumbing            ░░████████████████████░░
                    [Partial dep on Roofing]
                                                               │
Painting                                              ░░░░████████████████░░
                                                      [Depends on Electrical + Plumbing]

████ = Active work       ░░░░ = Buffer / dependency wait


Worksite: 456 Oak Ave, Austin TX
Timeline: April 1 — July 15

         Apr 1    Apr 8    Apr 15   Apr 22   Apr 29   May 5    May 12
           │        │        │        │        │        │        │
HVAC       ████████████████████████████████░░
           [No deps — starts immediately]
                                                    │
Electrical                                 ░░░░████████████████░░
                                           [Depends on HVAC]

████ = Active work       ░░░░ = Buffer / dependency wait
```

## AI Dependency Intelligence

When a workgroup completes:
- Check which workgroups were waiting on it (same worksite and cross-worksite)
- Auto-notify dependent contractors: "Your workgroup is now unblocked"
- Notify worksite contact person(s)
- Update worksite and project timeline

When a workgroup is delayed:
- Recalculate ALL downstream timelines (within worksite and cross-worksite)
- Alert Business Owner + relevant Worksite Contact Person(s) with impact analysis
- Suggest mitigation strategies

Critical Path Analysis:
- AI identifies longest chain of dependent workgroups per worksite
- Cross-worksite dependencies also tracked for overall project critical path
- Any delay on critical path directly delays the project
- Non-critical workgroups have float (can absorb some delay)

---

# PART 4: DATA MODEL

## Entity Relationship Diagram (PostgreSQL / Supabase)

```
┌──────────────────┐
│ organizations     │
│ id (uuid, PK)    │
│ name              │
│ template          │
│ settings (jsonb)  │
│ created_at        │
│ updated_at        │
└────────┬─────────┘
         │ has many
         ▼
┌──────────────────┐     ┌──────────────────────┐
│ projects          │     │ business_employees    │
│ id (uuid, PK)    │     │ id (uuid, PK)         │
│ org_id (FK)       │     │ org_id (FK)           │
│ title             │     │ first_name            │
│ description       │     │ last_name             │
│ total_budget      │     │ email                 │
│ start_date        │     │ phone                 │
│ end_date          │     │ role                  │
│ status            │     │ is_active             │
│ progress_pct      │     │ created_at            │
│ created_at        │     │ updated_at            │
│ updated_at        │     └───────────┬──────────┘
└────────┬─────────┘                  │
         │ has many                   │
         ▼                            │
┌──────────────────────┐              │
│ worksites             │              │
│ id (uuid, PK)        │              │
│ project_id (FK)      │              │
│ name                  │              │
│ address_line1         │              │
│ address_line2         │              │
│ city                  │              │
│ state                 │              │
│ zip_code              │              │
│ phone                 │              │
│ site_notes (text)     │              │
│ budget                │              │
│ start_date            │              │
│ end_date              │              │
│ status                │              │
│ progress_pct          │              │
│ created_at            │              │
│ updated_at            │              │
└────────┬─────────────┘              │
         │ has many                   │
         ▼                            │
┌───────────────────────────┐         │
│ worksite_contacts          │◄────────┘
│ id (uuid, PK)             │  (junction table)
│ worksite_id (FK)          │
│ employee_id (FK)          │
│ contact_role              │  ← 'primary' | 'secondary'
│ created_at                │
│ UNIQUE(worksite_id,       │
│        employee_id)       │
└───────────────────────────┘

┌──────────────────────┐     ┌──────────────────┐
│ workgroups            │     │ contractors       │
│ id (uuid, PK)        │     │ id (uuid, PK)    │
│ worksite_id (FK)     │     │ org_id (FK)       │
│ contractor_id (FK)   │     │ company_name      │
│ title                 │     │ contact_first_name│
│ trade                 │     │ contact_last_name │
│ budget                │     │ email             │
│ start_date            │     │ phone             │
│ end_date              │     │ skills (text[])   │
│ status                │     │ rating (decimal)  │
│ progress_pct          │     │ performance (json)│
│ created_at            │     │ created_at        │
│ updated_at            │     │ updated_at        │
└────────┬─────────────┘     └──────────────────┘
         │ has many
         ▼
┌──────────────────────┐
│ jobs                  │
│ id (uuid, PK)        │
│ workgroup_id (FK)    │
│ title                 │
│ description           │
│ budget                │
│ est_duration_days     │
│ sequence              │
│ status                │
│ invoice_id (FK, null) │  ← which invoice covers this job
│ created_at            │
│ updated_at            │
└────────┬─────────────┘
         │ has many
         ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ messages      │  │ uploads       │  │ checklists    │
│ id (PK)       │  │ id (PK)       │  │ id (PK)       │
│ workgroup_id  │  │ job_id (null) │  │ job_id (FK)   │
│ sender_id     │  │ workgroup_id  │  │ items (jsonb) │
│ sender_type   │  │ file_url      │  └──────────────┘
│ content       │  │ file_type     │
│ ai_summary    │  │ ai_analysis   │
│ created_at    │  │ created_at    │
└──────────────┘  └──────────────┘

┌──────────────────────────┐
│ invoices                  │
│ id (uuid, PK)            │
│ workgroup_id (FK)        │
│ contractor_id (FK)       │
│ invoice_number           │  ← sequential per workgroup
│ amount (decimal)         │
│ line_items (jsonb)       │  ← [{job_id, job_title, amount, job_budget, variance}]
│ status                    │  ← draft/submitted/validated/flagged/approved/rejected/paid
│ ai_validated (bool)      │
│ ai_flags (jsonb)         │
│ approved_by (FK, null)   │
│ approved_at              │
│ file_url                  │
│ submitted_at             │
│ paid_at                   │
│ created_at                │
│ updated_at                │
└──────────────────────────┘

┌───────────────────────────┐     ┌──────────────────────────┐
│ workgroup_dependencies     │     │ job_dependencies          │
│ id (PK)                   │     │ id (PK)                   │
│ workgroup_id (FK)         │     │ job_id (FK)               │
│ depends_on_workgroup_id   │     │ depends_on_job_id (FK)   │
│ dependency_type            │     │ created_at                │
│ created_at                 │     └──────────────────────────┘
└───────────────────────────┘

┌──────────────────────────┐
│ audit_logs                │
│ id (uuid, PK)            │
│ entity_type               │
│ entity_id                 │
│ action                    │
│ actor_id                  │
│ actor_type                │
│ changes (jsonb)           │
│ created_at                │
└──────────────────────────┘
```

### AI Invoice Validation Rules

```
┌─────────────────────────────────────────────────────────────────────┐
│ AI INVOICE VALIDATION CHECKLIST                                      │
│                                                                       │
│ For each submitted invoice, AI checks:                               │
│                                                                       │
│  1. ✓ All referenced jobs exist in this workgroup                   │
│  2. ✓ All referenced jobs are marked "complete"                     │
│  3. ✓ No referenced job appears on a previous invoice               │
│       (prevents double-billing)                                      │
│  4. ✓ Line item amounts align with job budgets                      │
│       (flags variance > configurable threshold, e.g., 10%)          │
│  5. ✓ Invoice total = sum of line items                             │
│  6. ✓ Cumulative invoiced amount ≤ workgroup budget                 │
│  7. ✓ No duplicate invoice (same jobs, same amounts)                │
│  8. ✓ OCR data matches structured line items (if PDF uploaded)      │
│  9. ✓ Required documentation present (receipts, photos per job)     │
│                                                                       │
│ Outcome:                                                             │
│  • All checks pass → Status: "ai_validated" → Route to approval    │
│  • Any check fails → Status: "ai_flagged" → Flag for review        │
│    with specific reasons listed                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Supabase Schema (PostgreSQL)

```sql
-- ============================================================
-- CMS DATABASE SCHEMA — Supabase (PostgreSQL)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Organizations ──────────────────────────────────────────
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    template TEXT DEFAULT 'general_contracting',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Users (Supabase Auth + profile) ───────────────────────
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    org_id UUID REFERENCES organizations(id),
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Business Employees (Contact Persons) ──────────────────
CREATE TABLE business_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT,  -- 'Project Manager', 'Site Supervisor', etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Projects ──────────────────────────────────────────────
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    total_budget DECIMAL(12,2),
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'planning', 'active', 'review',
        'complete', 'on_hold', 'cancelled'
    )),
    progress_pct DECIMAL(5,2) DEFAULT 0,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Contractors ───────────────────────────────────────────
CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) NOT NULL,
    company_name TEXT NOT NULL,
    contact_first_name TEXT,
    contact_last_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    skills TEXT[] DEFAULT '{}',
    rating DECIMAL(3,2) DEFAULT 0,
    performance JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Worksites ─────────────────────────────────────────────
CREATE TABLE worksites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    phone TEXT,
    site_notes TEXT,
    budget DECIMAL(12,2),
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'active', 'in_progress', 'review',
        'complete', 'on_hold'
    )),
    progress_pct DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Worksite Contact Persons (Junction Table) ─────────────
CREATE TABLE worksite_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worksite_id UUID REFERENCES worksites(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES business_employees(id) NOT NULL,
    contact_role TEXT NOT NULL CHECK (contact_role IN ('primary', 'secondary')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(worksite_id, employee_id)
);

-- ── Workgroups ────────────────────────────────────────────
CREATE TABLE workgroups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worksite_id UUID REFERENCES worksites(id) ON DELETE CASCADE NOT NULL,
    contractor_id UUID REFERENCES contractors(id),
    title TEXT NOT NULL,
    trade TEXT,
    budget DECIMAL(12,2),
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending', 'accepted', 'rejected',
        'in_progress', 'review', 'approved',
        'complete', 'disputed'
    )),
    progress_pct DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Workgroup Dependencies ────────────────────────────────
CREATE TABLE workgroup_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE NOT NULL,
    depends_on_workgroup_id UUID REFERENCES workgroups(id) NOT NULL,
    dependency_type TEXT DEFAULT 'finish_to_start',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workgroup_id, depends_on_workgroup_id)
);

-- ── Jobs ──────────────────────────────────────────────────
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    budget DECIMAL(12,2),
    est_duration_days INTEGER,
    sequence INTEGER DEFAULT 1,
    status TEXT DEFAULT 'not_started' CHECK (status IN (
        'not_started', 'in_progress', 'complete',
        'invoiced', 'paid'
    )),
    invoice_id UUID,  -- FK added after invoices table
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Job Dependencies ──────────────────────────────────────
CREATE TABLE job_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    depends_on_job_id UUID REFERENCES jobs(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, depends_on_job_id)
);

-- ── Invoices ──────────────────────────────────────────────
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE NOT NULL,
    contractor_id UUID REFERENCES contractors(id) NOT NULL,
    invoice_number TEXT NOT NULL,  -- sequential per workgroup
    amount DECIMAL(12,2) NOT NULL,
    line_items JSONB NOT NULL DEFAULT '[]',
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'submitted', 'ai_validated', 'ai_flagged',
        'pending_approval', 'approved', 'rejected', 'paid'
    )),
    ai_validated BOOLEAN DEFAULT FALSE,
    ai_flags JSONB DEFAULT '[]',
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMPTZ,
    file_url TEXT,
    submitted_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from jobs to invoices
ALTER TABLE jobs ADD CONSTRAINT fk_jobs_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id);

-- ── Messages ──────────────────────────────────────────────
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('owner', 'employee', 'contractor', 'ai')),
    content TEXT,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN (
        'text', 'photo', 'file', 'invoice', 'system'
    )),
    ai_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Uploads ───────────────────────────────────────────────
CREATE TABLE uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES jobs(id),  -- nullable (workgroup-level upload)
    uploaded_by UUID NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,  -- 'photo', 'receipt', 'invoice', 'document'
    ai_analysis JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Checklists ────────────────────────────────────────────
CREATE TABLE checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    items JSONB DEFAULT '[]',  -- [{label, completed, completed_at}]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Audit Logs ────────────────────────────────────────────
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    actor_id UUID,
    actor_type TEXT,
    changes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Project lookups by org
CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_status ON projects(org_id, status);

-- Worksite lookups by project
CREATE INDEX idx_worksites_project ON worksites(project_id);

-- Worksite contacts
CREATE INDEX idx_worksite_contacts_worksite ON worksite_contacts(worksite_id);
CREATE INDEX idx_worksite_contacts_employee ON worksite_contacts(employee_id);

-- Workgroup lookups by worksite and contractor
CREATE INDEX idx_workgroups_worksite ON workgroups(worksite_id);
CREATE INDEX idx_workgroups_contractor ON workgroups(contractor_id);
CREATE INDEX idx_workgroups_status ON workgroups(worksite_id, status);

-- Job lookups by workgroup
CREATE INDEX idx_jobs_workgroup ON jobs(workgroup_id);
CREATE INDEX idx_jobs_status ON jobs(workgroup_id, status);

-- Invoice lookups
CREATE INDEX idx_invoices_workgroup ON invoices(workgroup_id);
CREATE INDEX idx_invoices_contractor ON invoices(contractor_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Messages by workgroup (recent first)
CREATE INDEX idx_messages_workgroup ON messages(workgroup_id, created_at DESC);

-- Uploads by workgroup and job
CREATE INDEX idx_uploads_workgroup ON uploads(workgroup_id);
CREATE INDEX idx_uploads_job ON uploads(job_id);

-- Audit trail
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_time ON audit_logs(created_at DESC);

-- Contractor lookups
CREATE INDEX idx_contractors_org ON contractors(org_id);
CREATE INDEX idx_contractors_skills ON contractors USING GIN(skills);

-- ============================================================
-- ROW LEVEL SECURITY (Supabase)
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksites ENABLE ROW LEVEL SECURITY;
ALTER TABLE workgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

-- Example RLS policy: Users see only their org's data
CREATE POLICY "Users see own org projects" ON projects
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- Contractors see only workgroups assigned to them
CREATE POLICY "Contractors see own workgroups" ON workgroups
    FOR SELECT USING (
        contractor_id IN (
            SELECT id FROM contractors WHERE id = auth.uid()
        )
    );

-- ============================================================
-- REALTIME (Supabase)
-- ============================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE workgroups;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;

-- ============================================================
-- HELPER VIEWS
-- ============================================================

-- Worksite with contact persons
CREATE VIEW worksite_with_contacts AS
SELECT
    ws.*,
    p.title AS project_title,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'employee_id', be.id,
                'first_name', be.first_name,
                'last_name', be.last_name,
                'email', be.email,
                'phone', be.phone,
                'role', be.role,
                'contact_role', wc.contact_role
            )
        ) FILTER (WHERE be.id IS NOT NULL),
        '[]'
    ) AS contacts
FROM worksites ws
JOIN projects p ON ws.project_id = p.id
LEFT JOIN worksite_contacts wc ON ws.id = wc.worksite_id
LEFT JOIN business_employees be ON wc.employee_id = be.id
GROUP BY ws.id, p.title;

-- Workgroup with invoice summary
CREATE VIEW workgroup_invoice_summary AS
SELECT
    wg.id AS workgroup_id,
    wg.title,
    wg.budget,
    wg.status,
    ws.name AS worksite_name,
    COUNT(DISTINCT i.id) AS invoice_count,
    COALESCE(SUM(i.amount) FILTER (WHERE i.status != 'rejected'), 0) AS total_invoiced,
    COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid'), 0) AS total_paid,
    wg.budget - COALESCE(SUM(i.amount) FILTER (WHERE i.status != 'rejected'), 0) AS remaining_budget
FROM workgroups wg
JOIN worksites ws ON wg.worksite_id = ws.id
LEFT JOIN invoices i ON wg.id = i.workgroup_id
GROUP BY wg.id, wg.title, wg.budget, wg.status, ws.name;
```

---

# PART 5: BUSINESS OWNER DASHBOARD

```
┌────────────────────────────────────────────────────────────────────────────┐
│  CMS Dashboard          [Search...]    🔔 (3)    👤 Profile               │
├──────────┬─────────────────────────────────────────────────────────────────┤
│          │                                                                  │
│ SIDEBAR  │  OVERVIEW                                                        │
│          │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐ │
│ Dashboard│  │ Active      │ │ Worksites   │ │ Pending     │ │ Total Spend   │ │
│ Projects │  │ Projects: 3 │ │ Active: 7   │ │ Approval: 5 │ │ This Month    │ │
│ Worksites│  │             │ │             │ │             │ │ $142,600      │ │
│ Contrac- │  └────────────┘ └────────────┘ └────────────┘ └──────────────┘ │
│  tors    │                                                                  │
│ Employees│  AI INSIGHTS                                                     │
│ Messages │  ┌───────────────────────────────────────────────────────────┐   │
│ Invoices │  │ 🤖 "Roofing at 123 Main St complete — Electrical can     │   │
│ Reports  │  │    proceed. Sarah Johnson (site contact) notified."       │   │
│ Settings │  │                                                            │   │
│          │  │ 🤖 "John's Roofing submitted Invoice #1 ($6,000) for     │   │
│          │  │    Jobs 1-2 at 123 Main St. AI validated ✓. Awaiting      │   │
│          │  │    approval."                                              │   │
│          │  │                                                            │   │
│          │  │ 🤖 "456 Oak Ave: HVAC workgroup 3 days behind.           │   │
│          │  │    This delays Electrical. Mike Chen alerted."            │   │
│          │  └───────────────────────────────────────────────────────────┘   │
│          │                                                                  │
│          │  ACTIVE PROJECTS                                                 │
│          │  ┌──────────────────────────────────────────────────────────┐    │
│          │  │ Project          │ Worksites │ Progress   │ Budget      │    │
│          │  ├──────────────────┼───────────┼────────────┼─────────────┤    │
│          │  │ Multi-Site Reno  │ 3 sites   │ ██████░░░░ │ $88K/$185K  │    │
│          │  │ Downtown Office  │ 1 site    │ ████░░░░░░ │ $22K/$55K   │    │
│          │  │ Warehouse Fix    │ 2 sites   │ ████████░░ │ $18K/$25K   │    │
│          │  └──────────────────────────────────────────────────────────┘    │
│          │                                                                  │
│          │  WORKSITES (for selected project)                                │
│          │  ┌──────────────────────────────────────────────────────────┐    │
│          │  │ Worksite        │ Contact    │ Workgroups │ Progress    │    │
│          │  ├─────────────────┼────────────┼────────────┼─────────────┤    │
│          │  │ 123 Main St     │ Sarah J.   │ 4 (3 actv) │ ██████░░░░ │    │
│          │  │ 456 Oak Ave     │ Mike C.    │ 2 (1 actv) │ ████░░░░░░ │    │
│          │  │ 789 Elm St      │ Sarah J.   │ 2 (1 actv) │ ██████████ │    │
│          │  └──────────────────────────────────────────────────────────┘    │
│          │                                                                  │
│          │  PENDING APPROVALS (Invoices)                                    │
│          │  ┌──────────────────────────────────────────────────────────┐    │
│          │  │ Contractor     │ Worksite   │ Invoice │ Amount │AI Check│    │
│          │  ├────────────────┼────────────┼─────────┼────────┼────────┤    │
│          │  │ John's Roofing │ 123 Main   │ #2 of 2 │ $9,000 │ ✓ Valid│    │
│          │  │ Spark Electric │ 456 Oak    │ #1 of ? │ $8,500 │ ⚠ Over │    │
│          │  │ Quick Plumb    │ 789 Elm    │ #1 of ? │ $5,200 │ ✓ Valid│    │
│          │  └──────────────────────────────────────────────────────────┘    │
│          │                                                                  │
└──────────┴─────────────────────────────────────────────────────────────────┘
```

### Dashboard Pages

| Page | Content |
|------|---------|
| **Overview** | Active projects, worksites, pending approvals, AI insights, key stats |
| **Projects** | All projects with status. Create new project. List + Kanban views. |
| **Project Detail** | Worksites list, overall Gantt timeline, total budget, AI insights |
| **Worksite Detail** | Address, contacts, workgroups, Gantt per site, budget, AI insights |
| **Workgroup Detail** | Jobs list, contractor, messages, uploads, invoice history |
| **Contractors** | Pool with AI scores, availability, skills, performance |
| **Employees** | Business employees, contact assignments per worksite |
| **Messages** | Conversations by project → worksite → workgroup |
| **Invoices** | All invoices with AI validation, job-level line items, bulk approve |
| **Reports** | Spend analysis per worksite, contractor leaderboard, timeline analysis |
| **Settings** | Org config, template, fields, approval chains, notifications |

---

# PART 6: CONTRACTOR WEB APP

```
┌──────────────────────┐     ┌──────────────────────────────┐
│ CONTRACTOR APP        │     │ WORKGROUP DETAIL               │
│                        │     │                                │
│ Welcome, John          │     │ Project: Multi-Site Reno       │
│                        │     │ Worksite: 123 Main St          │
│ MY WORKGROUPS          │     │   📍 Austin, TX 78701          │
│                        │     │ Your Workgroup: Roofing        │
│ ┌────────────────────┐│     │ Budget: $15,000                │
│ │ 🔴 NEW              ││     │ Timeline: Mar 1-15             │
│ │ Roofing             ││     │ Progress: ████░░░░ 37%         │
│ │ 123 Main St, Austin ││     │                                │
│ │ $15,000 | 4 jobs    ││     │ SITE CONTACT                   │
│ │ Contact: Sarah J.   ││     │ Sarah Johnson (Primary)        │
│ │ [View]              ││     │ 📧 sarah@abcproperties.com     │
│ └────────────────────┘│     │ 📞 (512) 555-1001              │
│                        │     │                                │
│ ┌────────────────────┐│     │ JOBS                            │
│ │ 🟡 IN PROGRESS      ││     │ ┌──────────────────────────┐   │
│ │ Electrical          ││     │ │ 1. Remove shingles  ✅ 💰 │   │
│ │ 456 Oak Ave, Austin ││     │ │ 2. Repair deck      ✅ 💰 │   │
│ │ 3 jobs (1/3 done)   ││     │ │ 3. Install shingles 🟡    │   │
│ │ Contact: Mike C.    ││     │ │ 4. Install gutters  ⬚     │   │
│ │ [View]              ││     │ └──────────────────────────┘   │
│ └────────────────────┘│     │ 💰 = Invoiced                  │
│                        │     │                                │
│ ┌────────────────────┐│     │ INVOICES                        │
│ │ 🟢 COMPLETE         ││     │ ┌──────────────────────────┐   │
│ │ Plumbing            ││     │ │ INV-001  $6,000  ✅ Paid   │   │
│ │ 789 Elm St          ││     │ │ (Job 1 + Job 2)           │   │
│ └────────────────────┘│     │ │                            │   │
│                        │     │ │ [+ Submit New Invoice]    │   │
│ [🏠 Work] [💬 Msgs]    │     │ └──────────────────────────┘   │
│ [📄 Invoices] [👤 Me]  │     │                                │
└──────────────────────┘     │ ┌──────────────────────────┐   │
                              │ │ 💬 Message  📷 Photo     │   │
                              │ │ 📎 File    📄 Invoice   │   │
                              │ └──────────────────────────┘   │
                              │                                │
                              │ MESSAGES                        │
                              │ ┌──────────────────────────┐   │
                              │ │ Chat thread here...       │   │
                              │ └──────────────────────────┘   │
                              └──────────────────────────────┘
```

### Contractor App Pages

| Page | Features |
|------|----------|
| **My Workgroups** | New (accept/reject), in-progress, completed — grouped by worksite |
| **Workgroup Detail** | Worksite info, contact person, jobs list, progress, messaging, upload, invoice history |
| **Job Detail** | Full info, checklist, upload photos, mark complete |
| **Messages** | Conversations by workgroup (with worksite context) |
| **Invoices** | Submit per workgroup (select jobs), track payment status, view history |
| **Profile** | Skills, certifications, availability |

### Offline Capability (PWA)
When offline: view job details, take photos, write messages, update checklists. Auto-sync when back online.

---

# PART 7: AI AGENT — COMPLETE FUNCTION MAP

| Category | Functions |
|----------|----------|
| **Project Planning** | Suggest worksite breakdown, suggest workgroup breakdown per worksite, estimate budgets, identify dependencies, suggest job sequences, calculate critical path per worksite and overall |
| **Contractor Allocation** | Score/rank contractors (proximity per worksite), predict acceptance, load-balance across worksites, re-recommend on rejection, suggest budget adjustments |
| **Communication** | Classify messages/uploads, generate summaries, detect sentiment, extract action items, auto-acknowledge, route to appropriate contact person |
| **Document Processing** | OCR invoices/receipts, photo analysis, auto-classify/file, validate invoices against job budgets, detect duplicates, check for double-billing across invoices |
| **Invoice Intelligence** | Validate line items against job budgets, enforce no double-billing, track cumulative invoiced vs. workgroup budget, flag variances, suggest invoice timing to contractors based on completed jobs |
| **Dependency Monitoring** | Track progress vs. timeline per worksite, monitor dependencies (within and cross-worksite), auto-notify on unblock, recalculate on delays, critical path analysis |
| **Proactive Alerts** | Deadline risk, stalled workgroups, budget exceeded, no contractor response, cascade delays, completed jobs not yet invoiced, invoice anomalies — routed to appropriate contact person |
| **Insights & Reporting** | Performance scoring, cost analysis per worksite, trend analysis, monthly reports, predictive analytics, invoice velocity tracking |
| **Verification** | Background research, license verification, insurance validation, compliance tracking |

---

# PART 8: NOTIFICATION MATRIX

| Event | Business Owner | Worksite Contact(s) | Contractor |
|-------|----------------|---------------------|------------|
| Workgroup allocated | | Email | SMS + Push + Email |
| Contractor accepted | Push + Email | Push + Email | |
| Contractor rejected | Push + Email | Push + Email | |
| No response (24hr) | | Email | SMS reminder |
| No response (48hr) | Push + Email | Push + Email | Final SMS |
| Message received | | Push | Push |
| Photo uploaded | | Push | |
| Job marked complete | | Push | |
| All jobs in workgroup done | Push + Email | Push + Email | |
| Invoice submitted | Push + Email | Push + Email | |
| Invoice AI validated | Push | Push | |
| Invoice AI flagged | Push + Email | Push + Email | Push (issues to fix) |
| Invoice approved | | | Push + Email |
| Invoice rejected | | | Push + Email (with reason) |
| Payment processed | | | SMS + Email |
| Jobs not yet invoiced (X days) | | | Push (reminder) |
| Dependency unblocked | Push | Push + Email | SMS + Push |
| Deadline approaching | Push | Push + SMS | Push + SMS |
| Deadline missed | Push + Email | Push + Email + SMS | Push + SMS |
| Workgroup stalled | Push | Push + Email | Push |
| Budget exceeded | Push + Email | Push + Email | |
| AI anomaly detected | Push + Email | Push + Email | |
| Worksite complete | Push + Email | Push + Email | |

All preferences configurable per user and per organization.
Notifications route to the appropriate Worksite Contact Person(s) based on role (primary/secondary).

---

# PART 9: TECHNICAL ARCHITECTURE

## Confirmed Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Python (FastAPI) in Docker containers |
| **Frontend** | React (Vite), role-based routing |
| **Database** | Supabase (PostgreSQL + Row-Level Security) |
| **Auth** | Supabase Auth (JWT, social login, magic link) |
| **File Storage** | Supabase Storage (photos, invoices, receipts, contracts) |
| **Real-time** | Supabase Realtime (WebSocket subscriptions on messages, jobs, invoices) |
| **Container Runtime** | Docker (local dev) → AWS Fargate (production) |
| **Container Registry** | Amazon ECR |
| **Load Balancer** | AWS Application Load Balancer (ALB) |
| **CDN** | CloudFront (frontend static assets) |
| **Workflow Orchestration** | AWS Step Functions (via Lambda triggers or direct SDK) |
| **AI** | Claude API (via FastAPI backend) |
| **Notifications** | Amazon SNS + SES + Pinpoint |
| **Search/Verification** | SerpAPI / Tavily (contractor verification) |
| **OCR** | Claude Vision or Amazon Textract |

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│  FRONTEND (React + Vite → CloudFront CDN)                          │
│  ┌─────────────────────┐    ┌─────────────────────┐               │
│  │ Business Owner        │    │ Contractor App       │               │
│  │ Dashboard (React)     │    │ (React PWA)          │               │
│  │ /dashboard/*          │    │ /app/*               │               │
│  └──────────┬────────────┘    └──────────┬───────────┘               │
│             └──────────┬─────────────────┘                          │
│                        ▼                                             │
│  ┌─────────────────────────────────────────┐                        │
│  │ AWS Application Load Balancer (ALB)      │                        │
│  └─────────────────────┬───────────────────┘                        │
│                        ▼                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ AWS FARGATE (Docker Containers)                               │   │
│  │                                                                │   │
│  │  ┌──────────────────────────────────────────────────────┐    │   │
│  │  │ FASTAPI APPLICATION                                    │    │   │
│  │  │                                                        │    │   │
│  │  │ Routes:                                                │    │   │
│  │  │  /api/projects     - Project CRUD                     │    │   │
│  │  │  /api/worksites    - Worksite CRUD + contacts         │    │   │
│  │  │  /api/workgroups   - Workgroup mgmt + allocation      │    │   │
│  │  │  /api/jobs         - Job CRUD                         │    │   │
│  │  │  /api/invoices     - Invoice submit + validate        │    │   │
│  │  │  /api/messages     - Messaging                        │    │   │
│  │  │  /api/uploads      - File upload processor            │    │   │
│  │  │  /api/contractors  - Contractor pool                  │    │   │
│  │  │  /api/employees    - Business employee mgmt           │    │   │
│  │  │  /api/ai           - AI agent endpoints               │    │   │
│  │  │  /api/analytics    - Reports + insights               │    │   │
│  │  │                                                        │    │   │
│  │  │ Background Workers:                                    │    │   │
│  │  │  • AI Invoice Validator                                │    │   │
│  │  │  • Notification Engine                                 │    │   │
│  │  │  • Progress Calculator                                 │    │   │
│  │  │  • Dependency Monitor                                  │    │   │
│  │  └──────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                        │                                             │
│  ┌─────────────────────▼───────────────────┐                        │
│  │ AWS Step Functions (Workflows)            │                        │
│  │ Allocation | Accept/Reject | Dependencies │                        │
│  │ Invoice Validation + Approval | Completion│                        │
│  └─────────────────────────────────────────┘                        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ SUPABASE (Managed PostgreSQL + Services)                       │   │
│  │                                                                │   │
│  │  ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐  │   │
│  │  │ PostgreSQL DB  │  │ Supabase Auth   │  │ Supabase Storage│  │   │
│  │  │ All tables +   │  │ JWT tokens      │  │ Photos, invoices│  │   │
│  │  │ RLS policies   │  │ Social login    │  │ Receipts, docs  │  │   │
│  │  │ Views, indexes │  │ Magic link      │  │                 │  │   │
│  │  └──────────────┘  └────────────────┘  └─────────────────┘  │   │
│  │                                                                │   │
│  │  ┌────────────────────┐  ┌─────────────────────────────┐     │   │
│  │  │ Supabase Realtime    │  │ Edge Functions (optional)    │     │   │
│  │  │ WebSocket for msgs,  │  │ Lightweight triggers         │     │   │
│  │  │ job updates, invoices│  │                               │     │   │
│  │  └────────────────────┘  └─────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  External: Claude API | SerpAPI | Twilio | DocuSign | QuickBooks    │
└────────────────────────────────────────────────────────────────────┘
```

### Container Configuration (Fargate)

```
Dockerfile (FastAPI):
─────────────────────
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

Fargate Task Definition:
─────────────────────────
• CPU: 0.5 vCPU (dev) → 2 vCPU (prod)
• Memory: 1 GB (dev) → 4 GB (prod)
• Auto-scaling: Min 1, Max 10 tasks
• Health check: /api/health
• Environment variables via AWS Secrets Manager:
  - SUPABASE_URL
  - SUPABASE_KEY
  - SUPABASE_SERVICE_KEY
  - CLAUDE_API_KEY
  - AWS_REGION

Local Development:
──────────────────
docker-compose.yml:
  • fastapi (app container, port 8000)
  • Supabase local (via supabase CLI, ports 54321/54322)
  • React dev server (port 5173)
```

### Invoice Processing Flow (Technical)

```
┌─────────────────────────────────────────────────────────────────────┐
│ INVOICE PROCESSING PIPELINE (FastAPI + Step Functions)                │
│                                                                       │
│  Contractor submits invoice (selects jobs + amounts)                │
│         │                                                             │
│         ▼                                                             │
│  FastAPI: POST /api/invoices                                        │
│   • Create invoice record in Supabase (invoices table)              │
│   • Link to selected jobs via line_items[] JSONB                    │
│   • Status: "submitted"                                              │
│   • Trigger Step Function: InvoiceValidation                        │
│         │                                                             │
│         ▼                                                             │
│  Step Function: AI Invoice Validator                                │
│   • Query all previous invoices for this workgroup                  │
│   • Check no job appears on multiple invoices                       │
│   • Validate amounts against job budgets                            │
│   • Check cumulative total ≤ workgroup budget                       │
│   • If PDF uploaded → Claude Vision OCR + cross-reference           │
│   • Status: "ai_validated" or "ai_flagged"                          │
│         │                                                             │
│         ├── If validated → Route to Approval                        │
│         │    • Determine approver(s) based on amount + worksite     │
│         │    • Notify approver(s) — Contact Person + Owner          │
│         │    • Status: "pending_approval"                            │
│         │                                                             │
│         └── If flagged → Notify                                     │
│              • Alert Contact Person(s) with specific flags          │
│              • Notify Contractor of issues                          │
│              • Status: "ai_flagged"                                  │
│         │                                                             │
│         ▼ (after approval)                                           │
│  FastAPI: POST /api/invoices/{id}/approve                           │
│   • Trigger payment via QuickBooks / Xero                           │
│   • Update invoice status: "paid"                                   │
│   • Update job records: invoice_id + paid status                    │
│   • Update workgroup stats                                          │
│   • Check if all jobs invoiced → prompt workgroup completion       │
│   • Notify contractor of payment                                    │
│   • Update contractor performance profile                          │
│   • Check if worksite/project rollup needed                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

# PART 10: MVP ROADMAP

| Phase | Weeks | Focus | Deliverable |
|-------|-------|-------|-------------|
| **1: Foundation** | 1–4 | Docker + FastAPI setup, Supabase schema, Auth, core models (Org, Project, Worksite, Employees) | Running container with DB + auth |
| **2: Core Workflow** | 5–10 | Workgroup/Job CRUD, Contractor model, AI allocation, accept/reject, dependencies, worksite contacts | Working allocation system |
| **3: Dashboard** | 11–14 | Owner dashboard, worksite views, Gantt per site, AI insights, proactive alerts | Rich project management dashboard |
| **4: Communication** | 15–18 | Real-time chat (Supabase Realtime), file/photo upload, AI processing, offline PWA | Full communication system |
| **5: Invoicing** | 19–22 | Flexible invoice submission (per workgroup, multi-job), AI validation, approval routing, payment integration | Complete financial workflow |
| **6: Fargate Deploy** | 23–24 | ECR push, Fargate task def, ALB setup, CloudFront, CI/CD pipeline | Production deployment |
| **7: Advanced** | 25+ | Gantt editor, map view (multi-site), DocuSign, verification, SaaS multi-tenant | Enterprise features |

---

# PART 11: COST ESTIMATES

## Development (MVP)

| Item | Monthly Cost |
|------|-------------|
| Supabase (Free tier → Pro) | $0–$25 |
| Docker / local dev | $0 |
| Claude API | ~$20–$50 |
| AWS (minimal Fargate during dev) | ~$10–$30 |
| **Total** | **~$30–$105/month** |

## Production

| Scale | Monthly Cost |
|-------|-------------|
| Small (5 orgs, 50 contractors, 100 workgroups/mo) | ~$150–$350 |
| Medium (20 orgs, 200 contractors, 500 workgroups/mo) | ~$400–$800 |
| Large (100 orgs, 1,000 contractors, 2,000 workgroups/mo) | ~$1,000–$2,500 |

### Production Cost Breakdown

| Component | Small | Medium | Large |
|-----------|-------|--------|-------|
| Supabase Pro | $25 | $25 | $75+ |
| Fargate (containers) | $30–$60 | $100–$250 | $300–$800 |
| ALB | $20 | $25 | $40 |
| CloudFront | $5 | $15 | $50 |
| Claude API | $30–$80 | $100–$250 | $300–$800 |
| SNS/SES (notifications) | $5–$10 | $20–$50 | $50–$150 |
| S3/Storage | $5 | $15 | $50+ |
| Misc (Secrets, Logs, etc.) | $10 | $20 | $50 |

---

# APPENDIX A: CONFIGURABLE INDUSTRY TEMPLATES

| Setting | Property Mgmt | General Contracting | Service Company | Custom |
|---------|--------------|-------------------|-----------------|--------|
| Project term | Work Order | Project | Service Call | Configurable |
| Worksite term | Property | Job Site | Service Location | Configurable |
| Workgroup term | Trade Assignment | Subcontract | Service Area | Configurable |
| Job term | Task | Work Item | Service Task | Configurable |
| Contractor term | Vendor | Subcontractor | Technician | Configurable |
| Default trades | Plumbing, Electrical, HVAC, General | Roofing, Framing, Electrical, Plumbing, HVAC, Painting, Flooring | Residential, Commercial, Emergency | Configurable |
| Required photos | Before + After | Progress + Completion | Before + After | Configurable |
| Multi-worksite | Common (portfolio) | Common (multi-building) | Rare | Configurable |
| Dependencies | Rare | Common | Rare | Configurable |
| Invoice model | Single per workgroup typical | Multiple partial invoices common | Single per workgroup typical | Configurable |

---

# APPENDIX B: INVOICE MODEL SUMMARY

```
┌─────────────────────────────────────────────────────────────────────┐
│ INVOICE MODEL — KEY RULES                                            │
│                                                                       │
│ 1. Invoices belong to a WORKGROUP (not individual jobs)             │
│ 2. Each invoice contains LINE ITEMS referencing specific JOBS       │
│ 3. An invoice can cover ONE or MORE jobs within the workgroup       │
│ 4. MULTIPLE invoices per workgroup are allowed                      │
│ 5. Each job can appear on only ONE invoice (no double-billing)      │
│ 6. Contractor decides how to bundle jobs per invoice                │
│ 7. Enables partial payment as work progresses                       │
│ 8. AI validates every invoice before routing to approval            │
│ 9. Cumulative invoiced amount must not exceed workgroup budget      │
│ 10. When all jobs are invoiced and paid → workgroup is complete    │
│                                                                       │
│ Flow: Contractor completes jobs → selects jobs for invoice →       │
│       submits → AI validates → routes to approval →                │
│       Contact Person + Business Owner approves → payment processed  │
└─────────────────────────────────────────────────────────────────────┘
```

---

# APPENDIX C: FASTAPI PROJECT STRUCTURE

```
cms-backend/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── alembic/                    # DB migrations
│   └── versions/
├── app/
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Settings (Supabase URL, keys, etc.)
│   ├── dependencies.py         # Dependency injection (DB, Auth)
│   │
│   ├── auth/
│   │   ├── router.py           # Auth endpoints
│   │   └── supabase_auth.py    # Supabase JWT validation
│   │
│   ├── models/                 # Pydantic models (request/response)
│   │   ├── project.py
│   │   ├── worksite.py
│   │   ├── workgroup.py
│   │   ├── job.py
│   │   ├── invoice.py
│   │   ├── contractor.py
│   │   ├── employee.py
│   │   └── message.py
│   │
│   ├── routers/                # API route handlers
│   │   ├── projects.py
│   │   ├── worksites.py
│   │   ├── workgroups.py
│   │   ├── jobs.py
│   │   ├── invoices.py
│   │   ├── contractors.py
│   │   ├── employees.py
│   │   ├── messages.py
│   │   ├── uploads.py
│   │   └── analytics.py
│   │
│   ├── services/               # Business logic
│   │   ├── allocation.py       # AI contractor scoring
│   │   ├── invoice_validator.py
│   │   ├── dependency_engine.py
│   │   ├── progress_calculator.py
│   │   └── notification.py
│   │
│   ├── ai/                     # AI/Claude integration
│   │   ├── agent.py            # Main AI agent
│   │   ├── document_processor.py
│   │   └── insights.py
│   │
│   └── db/                     # Database layer
│       ├── supabase_client.py  # Supabase Python client
│       └── queries/            # SQL query files (optional)
│
├── tests/
│   ├── test_projects.py
│   ├── test_worksites.py
│   ├── test_invoices.py
│   └── ...
│
└── scripts/
    ├── seed_data.py            # Test data seeder
    └── deploy.sh               # Fargate deployment
```

---

*Document Version: 4.0 — Contractor Management System: Project, Worksite, Workgroup & Job Architecture*
*Changes from v3.0:*
- *Added Worksite layer: Project → Worksite(s) → Workgroup(s) → Job(s)*
- *Added Business Employee / Contact Person model with primary/secondary per worksite*
- *Switched from DynamoDB (single-table) to Supabase (PostgreSQL + RLS)*
- *Switched from Lambda + API Gateway to Docker + FastAPI → AWS Fargate*
- *Updated technical architecture, cost estimates, and MVP roadmap*
- *Added FastAPI project structure (Appendix C)*
*Parent Document: Contractor Management System Architecture*
