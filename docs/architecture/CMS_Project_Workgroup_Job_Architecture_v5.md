# Contractor Management System — Project, Worksite, Workgroup & Job Architecture

## Executive Summary

The Contractor Management System operates on a four-level hierarchy: **Project → Worksite → Workgroup → Job**. A Business Owner creates a Project with one or more Worksites (physical locations), each Worksite contains Workgroups (each assigned to a Contractor Company), and each Workgroup contains one or more Jobs. Business Employees serve as contact persons for each Worksite. An AI Agent orchestrates the entire lifecycle — from smart allocation to dependency monitoring to completion validation..

**Contractor Access:** Contractor companies are registered with a shared phone + email credential. When a workgroup is allocated, the contractor owner receives a QR code/link via SMS + Email. They can forward it to their workers. Each person authenticates using the company's shared phone + email (like a keyless entry with multiple keys). On first access, the worker self-identifies (name + phone, email optional) so the system can track who performed the work. GPS check-in + photo geo-tags provide double verification of on-site presence.

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
│   │   Geo-fence Radius: 200 meters
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
│   │   Geo-fence Radius: 300 meters
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
    │   Geo-fence Radius: 150 meters
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
| **Worksite** | Multiple Workgroups | Business Employees (contact persons) | A physical work location with geo-fence |
| **Workgroup** | Multiple Jobs | One Contractor Company | A trade or skill area at a specific worksite |
| **Job** | Checklists, Uploads, Messages | Part of Workgroup | A single discrete task to complete |

### Key Rules

- One Project has many Worksites
- One Worksite has one address, phone, site-specific details, and a configurable geo-fence radius
- One or more Business Employees assigned per Worksite (primary + secondary contacts)
- One Worksite has many Workgroups
- One Workgroup belongs to exactly one Worksite
- One Workgroup is assigned to exactly one Contractor Company
- One Contractor Company can have multiple Workgroups (across different worksites and projects)
- One Workgroup has one or more Jobs
- Messages are per Workgroup (contractor ↔ business owner/employee conversation)
- Uploads (photos, files) can be per Job or per Workgroup
- **Invoices are per Workgroup — each invoice can cover one or more Jobs within the workgroup**
- **Multiple invoices per Workgroup are allowed (invoice as you go)**
- **Each Job can only appear on one invoice (no double-billing)**
- Workgroups can have dependencies on other Workgroups within the same Worksite
- Cross-worksite dependencies are also supported (but less common)
- Jobs can have dependencies on other Jobs within the same Workgroup
- **GPS check-in + photo geo-tags required to verify on-site presence**

---

## Contractor Company Model

```
CONTRACTOR COMPANY: "John's Roofing LLC"
│
│   Company Address: 500 Industrial Blvd, Austin, TX 78745
│   Phone: (512) 555-2001    ← shared credential for app access
│   Email: john@johnsroofing.com  ← shared credential for app access
│   Owner: John Martinez
│   License #: ROF-2024-1234
│   Insurance: Verified (exp: Dec 2026)
│   Skills: [Roofing, Gutters, Waterproofing]
│   Rating: 4.7 / 5.0
│   Status: Active — Last verified: Feb 15, 2026
│
│   ACCESS MODEL:
│   The company's phone + email serve as shared credentials.
│   Owner receives QR link → can forward to any worker.
│   Anyone with the link + company phone + email can enter.
│   On first access, each person self-identifies:
│
│   ┌──────────────────────────────────────────────┐
│   │ Workers who have self-identified:             │
│   │                                                │
│   │ • John Martinez    (512) 555-2001  (owner)    │
│   │ • Carlos Rivera    (512) 555-2002  (foreman)  │
│   │ • David Kim        (512) 555-2003  (worker)   │
│   │ • Maria Santos     (512) 555-2004  (worker)   │
│   │                                                │
│   │ No pre-registration required.                  │
│   │ Workers appear here after first QR access.     │
│   └──────────────────────────────────────────────┘

Contractor Company Rules:
  • Company registered with address, owner name, phone, email, license, insurance
  • Company phone + email are the shared "keyless entry" credentials
  • System notifications (SMS + Email with QR) go to the registered phone + email
  • Owner forwards QR link to workers outside the CMS (text, WhatsApp, call)
  • Anyone with the QR link authenticates using the shared company phone + email
  • No limit on how many people can access via shared credentials
  • On first access, each worker self-identifies: name + phone (required), email (optional)
  • Self-identification is one-time — system remembers the worker thereafter
  • All actions (check-ins, photos, messages, etc.) are tracked per identified worker
  • Business Owner dashboard shows which worker performed each action
  • Periodic external verification of company standing (license, insurance, BBB)
```

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

---

## QR Code Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│              QR CODE / LINK AUTHENTICATION FLOW                      │
│                                                                       │
│  ── STEP 1: WORKGROUP ALLOCATED ─────────────────────────────────  │
│                                                                       │
│  Business Owner allocates "Roofing" workgroup at 123 Main St       │
│  to John's Roofing LLC                                              │
│         │                                                             │
│         ▼                                                             │
│  System generates:                                                   │
│   • Unique QR token (cryptographically secure, tied to workgroup)  │
│   • Token encodes: workgroup_id + contractor_id + expiry           │
│   • Token URL: https://app.cms.com/wg/{token}                      │
│   • QR code image generated from the URL                            │
│         │                                                             │
│         ▼                                                             │
│  ── STEP 2: NOTIFICATION SENT TO CONTRACTOR ─────────────────────  │
│                                                                       │
│  SMS to (512) 555-2001 (company phone):                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ "New workgroup assigned: Roofing at 123 Main St, Austin TX.  │   │
│  │  Budget: $15,000 | 4 jobs | Mar 1-15                         │   │
│  │  Tap to view: https://app.cms.com/wg/abc123xyz               │   │
│  │  Forward this link to your team if needed."                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  Email to john@johnsroofing.com (company email):                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Subject: New Workgroup Assignment — Roofing @ 123 Main St    │   │
│  │                                                                │   │
│  │ [QR CODE IMAGE]                                                │   │
│  │                                                                │   │
│  │ Or tap this link: https://app.cms.com/wg/abc123xyz            │   │
│  │                                                                │   │
│  │ Project: ABC Properties — Multi-Site Renovation               │   │
│  │ Worksite: 123 Main St, Austin, TX 78701                       │   │
│  │ Budget: $15,000 | Timeline: Mar 1-15 | Jobs: 4               │   │
│  │                                                                │   │
│  │ Forward this link to your team members.                       │   │
│  │ Each person enters the company phone + email to access.       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ── STEP 3: OWNER FORWARDS TO WORKERS (outside CMS) ────────────  │
│                                                                       │
│  John texts his foreman Carlos:                                     │
│  "Hey Carlos, new roofing job at 123 Main St. Use this link:       │
│   https://app.cms.com/wg/abc123xyz                                  │
│   Phone: (512) 555-2001 / Email: john@johnsroofing.com"            │
│                                                                       │
│  ── STEP 4: AUTHENTICATION (Shared Credentials) ────────────────  │
│                                                                       │
│  When anyone taps the link / scans the QR code:                    │
│         │                                                             │
│         ▼                                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ CMS CONTRACTOR APP — ENTER COMPANY CREDENTIALS                │   │
│  │                                                                │   │
│  │ Workgroup: Roofing @ 123 Main St                              │   │
│  │ Contractor: John's Roofing LLC                                │   │
│  │                                                                │   │
│  │ Enter your company credentials:                               │   │
│  │                                                                │   │
│  │ Company Email: [_________________________]                     │   │
│  │ Company Phone: [_________________________]                     │   │
│  │                                                                │   │
│  │ ┌──────────────────┐                                          │   │
│  │ │ Enter              │                                          │   │
│  │ └──────────────────┘                                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│         │                                                             │
│         ▼                                                             │
│  System validates:                                                   │
│   1. Is the QR token valid and not expired?                         │
│   2. Does the email + phone match the contractor company            │
│      linked to this token?                                          │
│   3. Is the contractor company active?                              │
│         │                                                             │
│         ├── ✓ All checks pass → proceed to Step 5                  │
│         │                                                             │
│         └── ✗ Fails → "Credentials don't match. Contact your       │
│              company owner for the correct phone + email."          │
│                                                                       │
│  ── STEP 5: WORKER SELF-IDENTIFICATION (first time only) ────────  │
│                                                                       │
│  If this device/session has not self-identified before:             │
│         │                                                             │
│         ▼                                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ TELL US WHO YOU ARE                                            │   │
│  │                                                                │   │
│  │ Welcome to John's Roofing — Roofing @ 123 Main St            │   │
│  │                                                                │   │
│  │ This is a one-time step so we can track your work.            │   │
│  │                                                                │   │
│  │ First Name: [_________________________] (required)             │   │
│  │ Last Name:  [_________________________] (required)             │   │
│  │ Phone:      [_________________________] (required)             │   │
│  │ Email:      [_________________________] (optional)             │   │
│  │                                                                │   │
│  │ ┌──────────────────┐                                          │   │
│  │ │ Continue           │                                          │   │
│  │ └──────────────────┘                                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│         │                                                             │
│         ▼                                                             │
│  System creates a worker profile:                                   │
│   • worker_id generated                                             │
│   • Linked to contractor company                                    │
│   • Name + phone stored (email if provided)                        │
│   • Session tied to this device + worker profile                   │
│   • One-time: worker won't be asked again on this device           │
│   • If same person accesses another workgroup, system recognizes   │
│     them by device/session and skips self-ID                       │
│         │                                                             │
│         ▼                                                             │
│  ── STEP 6: IN THE APP ──────────────────────────────────────────  │
│                                                                       │
│  Worker lands in the Contractor App:                                │
│   • Sees workgroup details, jobs, site contact info                │
│   • Can accept/reject (owner-level action — see Stage 2 rules)    │
│   • Can check in via GPS                                            │
│   • Can message, upload photos, submit documents                   │
│   • All actions tagged with their worker identity                  │
│                                                                       │
│  Session persistence:                                               │
│   • Session lasts for the life of the workgroup                    │
│   • Worker can reopen app without re-scanning QR                   │
│   • Multiple workers can have active sessions simultaneously      │
│   • No limit on number of workers per workgroup                   │
│                                                                       │
│  ── MULTIPLE WORKGROUPS ─────────────────────────────────────────  │
│                                                                       │
│  If a contractor has 3 workgroups across 2 worksites:              │
│   • Owner receives 3 separate QR links (one per workgroup)        │
│   • Each link authenticated independently with same credentials   │
│   • Worker dashboard shows all workgroups they've accessed         │
│   • Returning workers recognized — no repeat self-identification  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Geo-Verification / Site Check-in

```
┌─────────────────────────────────────────────────────────────────────┐
│              GEO-VERIFICATION — DOUBLE PROOF SYSTEM                  │
│                                                                       │
│  Two layers of location verification:                                │
│                                                                       │
│  ── LAYER 1: GPS CHECK-IN ───────────────────────────────────────  │
│                                                                       │
│  When a contractor worker opens a workgroup in the app:            │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ WORKGROUP: Roofing @ 123 Main St                              │   │
│  │                                                                │   │
│  │ ┌────────────────────────────────────────────────────────┐   │   │
│  │ │ 📍 CHECK IN TO WORKSITE                                │   │   │
│  │ │                                                          │   │   │
│  │ │ You must be within 200m of the worksite to check in.   │   │   │
│  │ │                                                          │   │   │
│  │ │ Your location: 30.2672° N, 97.7431° W                  │   │   │
│  │ │ Worksite: 30.2675° N, 97.7428° W                       │   │   │
│  │ │ Distance: ~35 meters ✅                                  │   │   │
│  │ │                                                          │   │   │
│  │ │ ┌──────────────────┐                                    │   │   │
│  │ │ │ ✓ Check In Now    │                                    │   │   │
│  │ │ └──────────────────┘                                    │   │   │
│  │ └────────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  Check-in records:                                                   │
│   • Worker name + phone (who checked in)                            │
│   • GPS coordinates at check-in                                     │
│   • Timestamp                                                        │
│   • Distance from worksite center                                   │
│   • Within geo-fence: yes/no                                        │
│   • Device info (for audit)                                         │
│                                                                       │
│  Check-in rules:                                                    │
│   • Geo-fence radius is configurable per worksite (default: 200m)  │
│   • Worker must check in before marking jobs as in-progress        │
│   • Check-out is optional (or auto after X hours of inactivity)    │
│   • Multiple check-ins per day are recorded (tracking site visits)  │
│   • AI flags: no check-in but photos uploaded, or check-in far     │
│     from worksite                                                    │
│                                                                       │
│  ── LAYER 2: PHOTO GEO-TAGS ────────────────────────────────────  │
│                                                                       │
│  Every photo uploaded through the Contractor App:                   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ PHOTO UPLOAD — AI PROCESSING                                   │   │
│  │                                                                │   │
│  │ Photo taken by: Carlos Rivera (worker)                        │   │
│  │ EXIF Data Extracted:                                           │   │
│  │   📍 GPS: 30.2674° N, 97.7430° W                              │   │
│  │   📅 Timestamp: 2026-03-05 10:32:14 CST                       │   │
│  │   📱 Device: iPhone 15 Pro                                     │   │
│  │                                                                │   │
│  │ Geo-verification:                                              │   │
│  │   ✅ Photo GPS within 200m of worksite (45m away)             │   │
│  │   ✅ Matches today's check-in location                        │   │
│  │   ✅ Timestamp within work hours                               │   │
│  │                                                                │   │
│  │ AI Analysis:                                                    │   │
│  │   • Classification: "Progress photo — roof deck repair"       │   │
│  │   • Estimated completion: ~40%                                 │   │
│  │   • Matched to: Job 1.1.2 (Repair roof deck)                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  Photo geo-tag rules:                                               │
│   • App captures GPS at time of photo (not just EXIF)              │
│   • AI cross-references photo GPS with worksite geo-fence          │
│   • Photos outside geo-fence are flagged (not rejected)            │
│   • Stripped EXIF is compared against app-captured GPS for fraud   │
│     detection                                                       │
│                                                                       │
│  ── AI GEO-INTELLIGENCE ─────────────────────────────────────────  │
│                                                                       │
│  AI monitors patterns and flags anomalies:                          │
│                                                                       │
│  ⚠ "Carlos checked in at 123 Main St but no photos uploaded       │
│     in 4 hours. Possible idle time."                                │
│                                                                       │
│  ⚠ "Photo uploaded for Job 1.1.2 but GPS coordinates are          │
│     2.3 km from worksite. Possible wrong location."                │
│                                                                       │
│  ⚠ "No check-ins recorded this week for Roofing workgroup.        │
│     Deadline is in 5 days."                                          │
│                                                                       │
│  ✅ "Carlos checked in 5 days this week at 123 Main St.            │
│     15 progress photos uploaded. Job 1.1.1 appears complete."      │
│                                                                       │
│  Business Owner Dashboard shows:                                    │
│   • Check-in history per workgroup (who, when, GPS)                │
│   • Photo geo-tag map overlay                                       │
│   • AI site presence summary                                        │
│   • Anomaly flags                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Invoice Model

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
│  │    Geo-fence Radius: 200 meters                               │   │
│  │    Budget: $85,000                                             │   │
│  │    Start: Mar 1  |  End: Jun 30                               │   │
│  │    Primary Contact: Sarah Johnson                              │   │
│  │    Secondary Contact: Mike Chen                                │   │
│  │                                                                │   │
│  │  Worksite 2: "456 Oak Ave"                                    │   │
│  │    Address: 456 Oak Ave, Austin, TX 78702                     │   │
│  │    Phone: (512) 555-0202                                      │   │
│  │    Geo-fence Radius: 300 meters                               │   │
│  │    Budget: $55,000                                             │   │
│  │    Start: Apr 1  |  End: Jul 15                               │   │
│  │    Primary Contact: Mike Chen                                  │   │
│  │    Secondary Contact: Lisa Park                                │   │
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
│  │  On allocation:                                                │   │
│  │   → System generates unique QR token for this workgroup      │   │
│  │   → SMS + Email with QR code sent to contractor company      │   │
│  │     phone + email                                             │   │
│  │   → Owner forwards link + credentials to workers as needed   │   │
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
│                          │        │ company address to WORKSITE      │
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
│  Contractor (owner or worker) accesses via QR + company credentials:│
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
│  │                                                                │   │
│  │  ⓘ Any worker with access can accept/reject on behalf of     │   │
│  │    the contractor company.                                     │   │
│  │    System records WHO accepted/rejected.                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  If ACCEPTED:                                                        │
│   → Workgroup status: "In Progress"                                  │
│   → Business Owner + Worksite Contact Person(s) notified             │
│   → Messaging thread opens                                           │
│   → AI Agent starts monitoring timeline and dependencies             │
│   → GPS check-in becomes available for this workgroup               │
│   → System records: "Accepted by Carlos Rivera on Mar 1, 8:05am"   │
│                                                                       │
│  If REJECTED:                                                        │
│   → Contractor provides reason (optional)                            │
│   → AI notifies Business Owner + Contact Person(s)                   │
│   → AI suggests next-best contractor                                 │
│   → If reason = "budget too low": AI suggests adjusted budget       │
│   → QR token invalidated                                            │
│                                                                       │
│  If NO RESPONSE within 24 hours:                                     │
│   → AI sends reminder (SMS + Email to company phone/email)          │
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
│  │ 📍 CHECK IN            │             │ Progress: ████░░ 37%  │       │
│  │ [✓ Checked in 8:15am] │             │                        │       │
│  │  Carlos Rivera         │             │ On-Site Today:         │       │
│  │  35m from worksite ✅  │             │  Carlos R. (8:15am)   │       │
│  │                        │             │  David K. (8:22am)    │       │
│  │ Site Contact:          │             │                        │       │
│  │  Sarah J. (Primary)   │             │ AI Summary:            │       │
│  │                        │             │ "2 workers on-site.    │       │
│  │ Jobs:                  │             │  Tear-off complete.    │       │
│  │ ✅ Remove shingles     │             │  Deck repair started.  │       │
│  │ 🟡 Repair deck (now)  │             │  On track for Mar 15." │       │
│  │ ⬚ Install shingles    │             │                        │       │
│  │ ⬚ Install gutters     │             │ 📍 Site Presence:       │       │
│  │                        │             │  5 check-ins this week │       │
│  │ Chat + Upload actions  │             │  12 geo-tagged photos  │       │
│  └──────────────────────┘             └──────────────────────┘       │
│                                                                       │
│  AI AGENT processes every message / upload:                          │
│   1. Classify content (text, photo, receipt, invoice, question)     │
│   2. If photo → Analyze + verify GPS within geo-fence              │
│   3. If receipt → OCR + Extract data + Match to job/workgroup budget│
│   4. If invoice → Validate against referenced job budgets           │
│   5. Update job/workgroup/worksite/project progress automatically   │
│   6. Generate AI summary for dashboard                               │
│   7. Flag anomalies (GPS mismatch, unusual expense, timeline risk) │
│                                                                       │
│  Proactive monitoring:                                               │
│   • Deadline approaching + low progress → Alert owner + contact     │
│   • No communication for X days → Nudge contractor                  │
│   • No check-ins for X days → Flag "no site presence"              │
│   • Photos outside geo-fence → Flag for review                     │
│   • Budget exceeded → Flag for review                                │
│   • Job completed → Check if dependent jobs can start               │
│   • Completed jobs not yet invoiced → Prompt contractor             │
│   • All jobs done → Prompt for final invoice submission             │
└─────────────────────────────────────────────────────────────────────┘
```

### Message Types & AI Processing

| Message Type | AI Processing |
|---|---|
| **Text message** | Sentiment analysis, extract action items, detect questions, flag urgent issues. Track which worker sent it. |
| **Photo upload** | Classify (progress/completion/damage/before/after), estimate % complete, extract EXIF (timestamp, GPS), verify within geo-fence, auto-tag and file. Track uploader. |
| **Receipt upload** | OCR → extract vendor, amount, items, date. Match to job/workgroup budget. Running expense total. Flag if over budget. |
| **Invoice upload** | OCR → extract all line items. Match line items to specific jobs. Validate amounts against job budgets. Check no job is double-billed. Route to approval. |
| **Document upload** | Classify (permit, inspection, warranty, certificate). Extract key data. File to appropriate category. |
| **GPS check-in** | Record worker name, coordinates, timestamp, distance from worksite. Verify within geo-fence radius. Flag anomalies. |

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
│  │ Submitted by: Carlos Rivera (worker @ John's Roofing)        │   │
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
│  │   ✓ Site presence verified (GPS check-ins + geo-tagged photos)│   │
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
│  │ Approval view includes:                                       │   │
│  │   • Invoice amount + line items                               │   │
│  │   • Job completion status                                     │   │
│  │   • Site Presence: ✅ 8 check-ins, 15 geo-tagged photos       │   │
│  │   • Workers on-site: Carlos Rivera, David Kim                │   │
│  │   • AI Summary with before/after photo comparison            │   │
│  │   • [✓ Approve]  [✗ Reject]  [? Query Contractor]           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  After approval:                                                     │
│  → Payment triggered for $6,000 (QuickBooks / Xero)                 │
│  → Contractor notified: "Payment approved for Invoice #1 ($6,000)" │
│  → Jobs 1 & 2 status: Invoiced & Paid                               │
│  → Workgroup remains "In Progress" (Jobs 3 & 4 still pending)      │
│                                                                       │
│  ── FINAL INVOICE + COMPLETION ───────────────────────────────────  │
│                                                                       │
│  After all jobs complete and final invoice approved:                │
│  • All jobs invoiced & paid → Workgroup status: Complete            │
│  • AI checks: Does this unblock dependent workgroups?               │
│    → Yes: Notify dependent contractors (new QR links sent)         │
│  • Contractor performance profile updated                           │
│  • If ALL workgroups at worksite complete → Worksite: Complete      │
│  • If ALL worksites complete → Project status: Complete             │
│  • AI generates project summary report                               │
│  • QR tokens for completed workgroup expire                        │
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
                                      │                     ├─► Project: 48%
Job 1.4.1: Not  ┐                     │                     │   In Progress
Job 1.4.2: Not  ├─► WG 1.4: 0%      │                     │
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
```

## AI Dependency Intelligence

When a workgroup completes:
- Check which workgroups were waiting on it (same worksite and cross-worksite)
- Auto-notify dependent contractors: generate new QR links and send via SMS + Email
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
│ progress_pct      │     └───────────┬──────────┘
│ created_at        │                  │
│ updated_at        │                  │
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
│ geo_latitude          │  ← for geo-fence center
│ geo_longitude         │  ← for geo-fence center
│ geo_fence_radius_m    │  ← configurable per site (meters)
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

┌──────────────────────┐
│ contractors           │
│ id (uuid, PK)        │
│ org_id (FK)           │
│ company_name          │
│ owner_name            │
│ address_line1         │  ← for proximity scoring + verification
│ address_line2         │
│ city                  │
│ state                 │
│ zip_code              │
│ email                 │  ← shared credential (keyless entry)
│ phone                 │  ← shared credential (keyless entry)
│ license_number        │
│ insurance_info (jsonb)│
│ skills (text[])       │
│ rating (decimal)      │
│ performance (jsonb)   │
│ verification_status   │  ← 'verified' | 'pending' | 'flagged'
│ last_verified_at      │
│ is_active             │
│ created_at            │
│ updated_at            │
└──────────────────────┘

┌──────────────────────┐
│ contractor_workers    │  ← self-identified workers (created on first access)
│ id (uuid, PK)        │
│ contractor_id (FK)   │
│ first_name            │  ← required (self-entered)
│ last_name             │  ← required (self-entered)
│ phone                 │  ← required (self-entered)
│ email                 │  ← optional (self-entered)
│ first_seen_at         │  ← when they first self-identified
│ last_active_at        │  ← last activity in any workgroup
│ created_at            │
│ updated_at            │
└──────────────────────┘

┌──────────────────────┐
│ workgroups            │
│ id (uuid, PK)        │
│ worksite_id (FK)     │
│ contractor_id (FK)   │
│ title                 │
│ trade                 │
│ budget                │
│ start_date            │
│ end_date              │
│ status                │
│ progress_pct          │
│ accepted_by (FK→worker)│  ← which worker accepted
│ accepted_at           │
│ created_at            │
│ updated_at            │
└────────┬─────────────┘
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
│ invoice_id (FK, null) │
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
│ sender_type   │  │ uploaded_by   │  └──────────────┘
│ worker_id(FK) │  │ worker_id(FK) │  ← track which worker
│ content       │  │ file_url      │
│ ai_summary    │  │ file_type     │
│ created_at    │  │ ai_analysis   │
└──────────────┘  │ geo_lat       │  ← photo geo-tag
                   │ geo_lng       │
                   │ geo_verified  │  ← within geo-fence?
                   │ created_at    │
                   └──────────────┘

┌──────────────────────────┐
│ invoices                  │
│ id (uuid, PK)            │
│ workgroup_id (FK)        │
│ contractor_id (FK)       │
│ submitted_by_worker(FK)  │  ← which worker submitted
│ invoice_number           │
│ amount (decimal)         │
│ line_items (jsonb)       │
│ status                    │
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

┌──────────────────────────┐
│ site_checkins             │  ← GPS check-in records
│ id (uuid, PK)            │
│ workgroup_id (FK)        │
│ worksite_id (FK)         │
│ worker_id (FK)           │  ← which worker checked in
│ geo_latitude              │
│ geo_longitude             │
│ distance_from_site_m      │  ← calculated distance
│ within_geo_fence (bool)  │
│ device_info (jsonb)      │
│ checked_in_at             │
│ checked_out_at            │  ← nullable (optional)
│ created_at                │
└──────────────────────────┘

┌──────────────────────────┐
│ qr_tokens                 │  ← QR code / link tokens
│ id (uuid, PK)            │
│ workgroup_id (FK)        │
│ contractor_id (FK)       │
│ token (text, unique)     │  ← cryptographically secure
│ is_active (bool)         │
│ expires_at               │  ← when workgroup completes
│ created_at                │
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
│ actor_type                │  ← 'owner' | 'employee' | 'worker' | 'ai'
│ changes (jsonb)           │
│ created_at                │
└──────────────────────────┘

┌──────────────────────────────┐
│ contractor_verifications      │  ← periodic external checks
│ id (uuid, PK)                │
│ contractor_id (FK)           │
│ verification_type             │  ← 'license' | 'insurance' | 'bbb' | 'custom'
│ status                        │  ← 'passed' | 'failed' | 'expired' | 'pending'
│ source_url                    │
│ details (jsonb)              │
│ verified_at                   │
│ expires_at                    │
│ created_at                    │
└──────────────────────────────┘
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
│ 10. ✓ Site presence verified — GPS check-ins exist for relevant     │
│       jobs (workers actually went to the worksite)                  │
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
    role TEXT,
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
    owner_name TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    email TEXT NOT NULL,             -- shared credential
    phone TEXT NOT NULL,             -- shared credential
    license_number TEXT,
    insurance_info JSONB DEFAULT '{}',
    skills TEXT[] DEFAULT '{}',
    rating DECIMAL(3,2) DEFAULT 0,
    performance JSONB DEFAULT '{}',
    verification_status TEXT DEFAULT 'pending' CHECK (
        verification_status IN ('verified', 'pending', 'flagged')
    ),
    last_verified_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Contractor Workers (self-identified on first access) ──
CREATE TABLE contractor_workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID REFERENCES contractors(id) NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,                       -- optional
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
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
    geo_latitude DECIMAL(10,7),      -- geo-fence center
    geo_longitude DECIMAL(10,7),     -- geo-fence center
    geo_fence_radius_m INTEGER DEFAULT 200,  -- configurable per site
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

-- ── QR Tokens ─────────────────────────────────────────────
CREATE TABLE qr_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workgroup_id UUID NOT NULL,      -- FK added after workgroups table
    contractor_id UUID REFERENCES contractors(id) NOT NULL,
    token TEXT NOT NULL UNIQUE,       -- cryptographically secure
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    accepted_by UUID REFERENCES contractor_workers(id),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from qr_tokens to workgroups
ALTER TABLE qr_tokens ADD CONSTRAINT fk_qr_workgroup
    FOREIGN KEY (workgroup_id) REFERENCES workgroups(id) ON DELETE CASCADE;

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
    invoice_id UUID,
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
    submitted_by_worker UUID REFERENCES contractor_workers(id),
    invoice_number TEXT NOT NULL,
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

ALTER TABLE jobs ADD CONSTRAINT fk_jobs_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id);

-- ── Site Check-ins (GPS) ──────────────────────────────────
CREATE TABLE site_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE NOT NULL,
    worksite_id UUID REFERENCES worksites(id) NOT NULL,
    worker_id UUID REFERENCES contractor_workers(id) NOT NULL,
    geo_latitude DECIMAL(10,7) NOT NULL,
    geo_longitude DECIMAL(10,7) NOT NULL,
    distance_from_site_m DECIMAL(8,2),
    within_geo_fence BOOLEAN NOT NULL,
    device_info JSONB,
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    checked_out_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Messages ──────────────────────────────────────────────
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workgroup_id UUID REFERENCES workgroups(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('owner', 'employee', 'worker', 'ai')),
    worker_id UUID REFERENCES contractor_workers(id),
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
    job_id UUID REFERENCES jobs(id),
    uploaded_by UUID NOT NULL,
    worker_id UUID REFERENCES contractor_workers(id),
    file_url TEXT NOT NULL,
    file_type TEXT,
    ai_analysis JSONB,
    geo_latitude DECIMAL(10,7),       -- photo geo-tag
    geo_longitude DECIMAL(10,7),      -- photo geo-tag
    geo_verified BOOLEAN,             -- within geo-fence?
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Checklists ────────────────────────────────────────────
CREATE TABLE checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    items JSONB DEFAULT '[]',
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
    actor_type TEXT,    -- 'owner' | 'employee' | 'worker' | 'ai'
    changes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Contractor Verifications ──────────────────────────────
CREATE TABLE contractor_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID REFERENCES contractors(id) NOT NULL,
    verification_type TEXT NOT NULL,   -- 'license' | 'insurance' | 'bbb' | 'custom'
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('passed', 'failed', 'expired', 'pending')
    ),
    source_url TEXT,
    details JSONB,
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_projects_org ON projects(org_id);
CREATE INDEX idx_projects_status ON projects(org_id, status);
CREATE INDEX idx_worksites_project ON worksites(project_id);
CREATE INDEX idx_worksite_contacts_worksite ON worksite_contacts(worksite_id);
CREATE INDEX idx_worksite_contacts_employee ON worksite_contacts(employee_id);
CREATE INDEX idx_workgroups_worksite ON workgroups(worksite_id);
CREATE INDEX idx_workgroups_contractor ON workgroups(contractor_id);
CREATE INDEX idx_workgroups_status ON workgroups(worksite_id, status);
CREATE INDEX idx_jobs_workgroup ON jobs(workgroup_id);
CREATE INDEX idx_jobs_status ON jobs(workgroup_id, status);
CREATE INDEX idx_invoices_workgroup ON invoices(workgroup_id);
CREATE INDEX idx_invoices_contractor ON invoices(contractor_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_messages_workgroup ON messages(workgroup_id, created_at DESC);
CREATE INDEX idx_uploads_workgroup ON uploads(workgroup_id);
CREATE INDEX idx_uploads_job ON uploads(job_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_time ON audit_logs(created_at DESC);
CREATE INDEX idx_contractors_org ON contractors(org_id);
CREATE INDEX idx_contractors_skills ON contractors USING GIN(skills);
CREATE INDEX idx_contractor_workers ON contractor_workers(contractor_id);
CREATE INDEX idx_site_checkins_workgroup ON site_checkins(workgroup_id);
CREATE INDEX idx_site_checkins_worker ON site_checkins(worker_id);
CREATE INDEX idx_site_checkins_time ON site_checkins(checked_in_at DESC);
CREATE INDEX idx_qr_tokens_token ON qr_tokens(token);
CREATE INDEX idx_qr_tokens_workgroup ON qr_tokens(workgroup_id);
CREATE INDEX idx_verifications_contractor ON contractor_verifications(contractor_id);

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
ALTER TABLE site_checkins ENABLE ROW LEVEL SECURITY;

-- Example RLS policies
CREATE POLICY "Users see own org projects" ON projects
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM user_profiles WHERE id = auth.uid())
    );

-- ============================================================
-- REALTIME (Supabase)
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE workgroups;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE site_checkins;

-- ============================================================
-- HELPER VIEWS
-- ============================================================

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

CREATE VIEW workgroup_invoice_summary AS
SELECT
    wg.id AS workgroup_id,
    wg.title,
    wg.budget,
    wg.status,
    ws.name AS worksite_name,
    c.company_name AS contractor_name,
    COUNT(DISTINCT i.id) AS invoice_count,
    COALESCE(SUM(i.amount) FILTER (WHERE i.status != 'rejected'), 0) AS total_invoiced,
    COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid'), 0) AS total_paid,
    wg.budget - COALESCE(SUM(i.amount) FILTER (WHERE i.status != 'rejected'), 0) AS remaining_budget
FROM workgroups wg
JOIN worksites ws ON wg.worksite_id = ws.id
LEFT JOIN contractors c ON wg.contractor_id = c.id
LEFT JOIN invoices i ON wg.id = i.workgroup_id
GROUP BY wg.id, wg.title, wg.budget, wg.status, ws.name, c.company_name;

CREATE VIEW workgroup_site_presence AS
SELECT
    wg.id AS workgroup_id,
    wg.title,
    ws.name AS worksite_name,
    COUNT(DISTINCT sc.id) AS total_checkins,
    COUNT(DISTINCT sc.worker_id) AS unique_workers,
    COUNT(DISTINCT DATE(sc.checked_in_at)) AS days_on_site,
    COUNT(DISTINCT u.id) FILTER (WHERE u.geo_verified = TRUE) AS verified_photos,
    COUNT(DISTINCT u.id) FILTER (WHERE u.geo_verified = FALSE) AS unverified_photos
FROM workgroups wg
JOIN worksites ws ON wg.worksite_id = ws.id
LEFT JOIN site_checkins sc ON wg.id = sc.workgroup_id
LEFT JOIN uploads u ON wg.id = u.workgroup_id AND u.file_type = 'photo'
GROUP BY wg.id, wg.title, ws.name;
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
│          │  │    Jobs 1-2 at 123 Main St. AI validated ✓. Carlos        │   │
│          │  │    Rivera submitted. 8 check-ins confirmed on-site."     │   │
│          │  │                                                            │   │
│          │  │ 🤖 "456 Oak Ave: HVAC workgroup — no check-ins in 3     │   │
│          │  │    days. Deadline in 5 days. Possible stall."            │   │
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
│          │  │ Worksite        │ Contact    │ Workgroups │ Site Activity│    │
│          │  ├─────────────────┼────────────┼────────────┼─────────────┤    │
│          │  │ 123 Main St     │ Sarah J.   │ 4 (3 actv) │ 📍 5 today  │    │
│          │  │ 456 Oak Ave     │ Mike C.    │ 2 (1 actv) │ ⚠ 0 in 3d  │    │
│          │  │ 789 Elm St      │ Sarah J.   │ 2 (1 actv) │ 📍 2 today  │    │
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
| **Overview** | Active projects, worksites, pending approvals, AI insights, site activity summary |
| **Projects** | All projects with status. Create new project. List + Kanban views. |
| **Project Detail** | Worksites list, overall Gantt timeline, total budget, AI insights |
| **Worksite Detail** | Address, contacts, workgroups, Gantt per site, budget, check-in history, AI insights |
| **Workgroup Detail** | Jobs list, contractor, workers on-site, messages, uploads, invoice history, site presence |
| **Contractors** | Pool with AI scores, availability, skills, performance, verification status |
| **Employees** | Business employees, contact assignments per worksite |
| **Messages** | Conversations by project → worksite → workgroup |
| **Invoices** | All invoices with AI validation, job-level line items, site presence, bulk approve |
| **Reports** | Spend analysis per worksite, site presence analytics, contractor leaderboard, timeline analysis |
| **Settings** | Org config, template, fields, approval chains, geo-fence defaults, notifications |

---

# PART 6: CONTRACTOR WEB APP

```
┌──────────────────────┐     ┌──────────────────────────────┐
│ CONTRACTOR APP        │     │ WORKGROUP DETAIL               │
│                        │     │                                │
│ Welcome, Carlos       │     │ Project: Multi-Site Reno       │
│ John's Roofing LLC    │     │ Worksite: 123 Main St          │
│                        │     │   📍 Austin, TX 78701          │
│ MY WORKGROUPS          │     │ Your Workgroup: Roofing        │
│                        │     │ Budget: $15,000                │
│ ┌────────────────────┐│     │ Timeline: Mar 1-15             │
│ │ 🔴 NEW              ││     │ Progress: ████░░░░ 37%         │
│ │ Roofing             ││     │                                │
│ │ 123 Main St, Austin ││     │ 📍 CHECK IN                    │
│ │ $15,000 | 4 jobs    ││     │ [✓ Checked in 8:15am — 35m]  │
│ │ [View]              ││     │                                │
│ └────────────────────┘│     │ SITE CONTACT                   │
│                        │     │ Sarah Johnson (Primary)        │
│ ┌────────────────────┐│     │ 📧 sarah@abcproperties.com     │
│ │ 🟡 IN PROGRESS      ││     │ 📞 (512) 555-1001              │
│ │ Electrical          ││     │                                │
│ │ 456 Oak Ave, Austin ││     │ JOBS                            │
│ │ 3 jobs (1/3 done)   ││     │ ┌──────────────────────────┐   │
│ │ [View]              ││     │ │ 1. Remove shingles  ✅ 💰 │   │
│ └────────────────────┘│     │ │ 2. Repair deck      ✅ 💰 │   │
│                        │     │ │ 3. Install shingles 🟡    │   │
│ ┌────────────────────┐│     │ │ 4. Install gutters  ⬚     │   │
│ │ 🟢 COMPLETE         ││     │ └──────────────────────────┘   │
│ │ Plumbing            ││     │ 💰 = Invoiced                  │
│ │ 789 Elm St          ││     │                                │
│ └────────────────────┘│     │ INVOICES                        │
│                        │     │ ┌──────────────────────────┐   │
│ [🏠 Work] [💬 Msgs]    │     │ │ INV-001  $6,000  ✅ Paid   │   │
│ [📄 Invoices] [👤 Me]  │     │ │ (Job 1 + Job 2)           │   │
└──────────────────────┘     │ │                            │   │
                              │ │ [+ Submit New Invoice]    │   │
                              │ └──────────────────────────┘   │
                              │                                │
                              │ ┌──────────────────────────┐   │
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
| **Workgroup Detail** | Worksite info, contact person, GPS check-in, jobs list, progress, messaging, upload, invoice history |
| **Job Detail** | Full info, checklist, upload photos (with GPS), mark complete |
| **Messages** | Conversations by workgroup (with worksite context) |
| **Invoices** | Submit per workgroup (select jobs), track payment status, view history |
| **Profile** | Worker name, phone — company info (read-only) |

### Offline Capability (PWA)
When offline: view job details, take photos (GPS cached), write messages, update checklists. Auto-sync when back online. GPS check-in requires connectivity.

---

# PART 7: AI AGENT — COMPLETE FUNCTION MAP

| Category | Functions |
|----------|----------|
| **Project Planning** | Suggest worksite breakdown, suggest workgroup breakdown per worksite, estimate budgets, identify dependencies, suggest job sequences, calculate critical path per worksite and overall |
| **Contractor Allocation** | Score/rank contractors (proximity to worksite), predict acceptance, load-balance across worksites, re-recommend on rejection, suggest budget adjustments |
| **Communication** | Classify messages/uploads, generate summaries, detect sentiment, extract action items, auto-acknowledge, route to appropriate contact person |
| **Document Processing** | OCR invoices/receipts, photo analysis, auto-classify/file, validate invoices against job budgets, detect duplicates, check for double-billing across invoices |
| **Invoice Intelligence** | Validate line items against job budgets, enforce no double-billing, track cumulative invoiced vs. workgroup budget, flag variances, cross-reference site presence before validation |
| **Geo-Verification** | Validate GPS check-ins against worksite geo-fence, verify photo EXIF geo-tags, cross-reference check-in patterns, detect GPS spoofing, flag anomalies (no presence + work reported) |
| **Dependency Monitoring** | Track progress vs. timeline per worksite, monitor dependencies (within and cross-worksite), auto-notify on unblock (with new QR links), recalculate on delays, critical path analysis |
| **Proactive Alerts** | Deadline risk, stalled workgroups, no site check-ins, photos outside geo-fence, budget exceeded, no contractor response, cascade delays, completed jobs not yet invoiced, invoice anomalies |
| **Insights & Reporting** | Performance scoring, cost analysis per worksite, site presence analytics, worker activity tracking, trend analysis, monthly reports, predictive analytics |
| **Verification** | Background research (SerpAPI), license verification, insurance validation, BBB lookup, compliance tracking, periodic re-verification alerts |

---

# PART 8: NOTIFICATION MATRIX

| Event | Business Owner | Worksite Contact(s) | Contractor (company phone/email) |
|-------|----------------|---------------------|----------------------------------|
| Workgroup allocated | | Email | SMS + Email (with QR code/link) |
| Contractor accepted | Push + Email | Push + Email | |
| Contractor rejected | Push + Email | Push + Email | |
| No response (24hr) | | Email | SMS reminder |
| No response (48hr) | Push + Email | Push + Email | Final SMS |
| Message received | | Push | Push (in-app) |
| Photo uploaded | | Push | |
| Job marked complete | | Push | |
| GPS check-in | | | (logged silently) |
| No check-ins (X days) | | Push + Email | SMS reminder |
| Photo outside geo-fence | | Push | Push (in-app warning) |
| All jobs in workgroup done | Push + Email | Push + Email | |
| Invoice submitted | Push + Email | Push + Email | |
| Invoice AI validated | Push | Push | |
| Invoice AI flagged | Push + Email | Push + Email | SMS (issues to fix) |
| Invoice approved | | | SMS + Push |
| Invoice rejected | | | SMS + Push (with reason) |
| Payment processed | | | SMS + Email |
| Jobs not yet invoiced (X days) | | | Push (reminder) |
| Dependency unblocked | Push | Push + Email | SMS + Email (new QR link) |
| Deadline approaching | Push | Push + SMS | SMS |
| Deadline missed | Push + Email | Push + Email + SMS | SMS |
| Workgroup stalled | Push | Push + Email | SMS |
| Budget exceeded | Push + Email | Push + Email | |
| AI anomaly detected | Push + Email | Push + Email | |
| Worksite complete | Push + Email | Push + Email | |
| Contractor verification expiring | Push + Email | | SMS |

All preferences configurable per user and per organization.

---

# PART 9: TECHNICAL ARCHITECTURE

## Confirmed Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Python (FastAPI) in Docker containers |
| **Frontend** | React (Vite), role-based routing |
| **Database** | Supabase (PostgreSQL + Row-Level Security) |
| **Auth** | Supabase Auth (Business Owner side) + QR token + shared credentials (Contractor side) |
| **File Storage** | Supabase Storage (photos, invoices, receipts, contracts) |
| **Real-time** | Supabase Realtime (WebSocket subscriptions on messages, jobs, invoices, check-ins) |
| **Container Runtime** | Docker (local dev) → AWS Fargate (production) |
| **Container Registry** | Amazon ECR |
| **Load Balancer** | AWS Application Load Balancer (ALB) |
| **CDN** | CloudFront (frontend static assets) |
| **Workflow Orchestration** | AWS Step Functions (via Lambda triggers or direct SDK) |
| **AI** | Claude API (via FastAPI backend) |
| **Notifications** | Amazon SNS (SMS) + SES (Email) + Pinpoint (Push) |
| **Search/Verification** | SerpAPI / Tavily (contractor verification) |
| **OCR** | Claude Vision or Amazon Textract |
| **QR Generation** | qrcode Python library (server-side) |

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│  FRONTEND (React + Vite → CloudFront CDN)                          │
│  ┌─────────────────────┐    ┌─────────────────────┐               │
│  │ Business Owner        │    │ Contractor App       │               │
│  │ Dashboard (React)     │    │ (React PWA)          │               │
│  │ /dashboard/*          │    │ /app/*               │               │
│  │ Auth: Supabase Auth   │    │ Auth: QR + shared    │               │
│  │ (email/password/SSO)  │    │ credentials          │               │
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
│  │  │  /api/auth/qr-verify  - QR token + credential check  │    │   │
│  │  │  /api/auth/self-id    - Worker self-identification    │    │   │
│  │  │  /api/projects        - Project CRUD                  │    │   │
│  │  │  /api/worksites       - Worksite CRUD + contacts      │    │   │
│  │  │  /api/workgroups      - Workgroup mgmt + allocation   │    │   │
│  │  │  /api/jobs            - Job CRUD                      │    │   │
│  │  │  /api/invoices        - Invoice submit + validate     │    │   │
│  │  │  /api/messages        - Messaging                     │    │   │
│  │  │  /api/uploads         - File upload processor         │    │   │
│  │  │  /api/checkins        - GPS check-in/check-out        │    │   │
│  │  │  /api/contractors     - Contractor pool + verify      │    │   │
│  │  │  /api/employees       - Business employee mgmt        │    │   │
│  │  │  /api/ai              - AI agent endpoints            │    │   │
│  │  │  /api/analytics       - Reports + insights            │    │   │
│  │  │                                                        │    │   │
│  │  │ Background Workers:                                    │    │   │
│  │  │  • AI Invoice Validator                                │    │   │
│  │  │  • Notification Engine                                 │    │   │
│  │  │  • Progress Calculator                                 │    │   │
│  │  │  • Dependency Monitor                                  │    │   │
│  │  │  • Geo-Verification Engine                             │    │   │
│  │  │  • Contractor Verification Scheduler                   │    │   │
│  │  │  • QR Token Generator                                  │    │   │
│  │  └──────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                        │                                             │
│  ┌─────────────────────▼───────────────────┐                        │
│  │ AWS Step Functions (Workflows)            │                        │
│  │ Allocation | Accept/Reject | Dependencies │                        │
│  │ Invoice Validation + Approval | Completion│                        │
│  │ Contractor Verification Pipeline          │                        │
│  └─────────────────────────────────────────┘                        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ SUPABASE (Managed PostgreSQL + Services)                       │   │
│  │                                                                │   │
│  │  ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐  │   │
│  │  │ PostgreSQL DB  │  │ Supabase Auth   │  │ Supabase Storage│  │   │
│  │  │ All tables +   │  │ JWT tokens      │  │ Photos, invoices│  │   │
│  │  │ RLS policies   │  │ (biz owner side)│  │ Receipts, docs  │  │   │
│  │  │ Views, indexes │  │                 │  │                 │  │   │
│  │  └──────────────┘  └────────────────┘  └─────────────────┘  │   │
│  │                                                                │   │
│  │  ┌────────────────────┐                                       │   │
│  │  │ Supabase Realtime    │                                       │   │
│  │  │ WebSocket: messages, │                                       │   │
│  │  │ jobs, invoices,      │                                       │   │
│  │  │ check-ins            │                                       │   │
│  │  └────────────────────┘                                       │   │
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
│  Contractor worker submits invoice (selects jobs + amounts)         │
│         │                                                             │
│         ▼                                                             │
│  FastAPI: POST /api/invoices                                        │
│   • Create invoice record in Supabase                               │
│   • Link submitted_by_worker to the worker who submitted           │
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
│   • Verify site presence (check-ins + geo-tagged photos exist)     │
│   • If PDF uploaded → Claude Vision OCR + cross-reference           │
│   • Status: "ai_validated" or "ai_flagged"                          │
│         │                                                             │
│         ├── If validated → Route to Approval                        │
│         │    • Determine approver(s) based on amount + worksite     │
│         │    • Notify Contact Person(s) + Owner                     │
│         │    • Status: "pending_approval"                            │
│         │                                                             │
│         └── If flagged → Notify                                     │
│              • Alert Contact Person(s) with specific flags          │
│              • Notify Contractor (SMS to company phone)             │
│              • Status: "ai_flagged"                                  │
│         │                                                             │
│         ▼ (after approval)                                           │
│  FastAPI: POST /api/invoices/{id}/approve                           │
│   • Trigger payment via QuickBooks / Xero                           │
│   • Update invoice status: "paid"                                   │
│   • Update job records: invoice_id + paid status                    │
│   • Update workgroup/worksite/project stats                        │
│   • Notify contractor of payment (SMS)                             │
│   • Update contractor performance profile                          │
│   • Check if worksite/project rollup needed                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

# PART 10: MVP ROADMAP

| Phase | Weeks | Focus | Deliverable |
|-------|-------|-------|-------------|
| **1: Foundation** | 1–4 | Docker + FastAPI setup, Supabase schema, Supabase Auth (biz owner), core models (Org, Project, Worksite, Employees, Contractors) | Running container with DB + auth |
| **2: QR + Contractor Access** | 5–8 | QR token generation, shared credential auth, worker self-identification, contractor app shell | Working QR onboarding flow |
| **3: Core Workflow** | 9–14 | Workgroup/Job CRUD, AI allocation, accept/reject, dependencies, worksite contacts | Working allocation system |
| **4: Geo-Verification** | 15–17 | GPS check-in, photo geo-tags, geo-fence validation, site presence tracking | Double-proof location system |
| **5: Dashboard** | 18–21 | Owner dashboard, worksite views, Gantt per site, AI insights, site presence analytics | Rich project management dashboard |
| **6: Communication** | 22–25 | Real-time chat (Supabase Realtime), file/photo upload, AI processing, offline PWA | Full communication system |
| **7: Invoicing** | 26–29 | Flexible invoice submission, AI validation (with site presence check), approval routing, payment integration | Complete financial workflow |
| **8: Verification** | 30–31 | Contractor verification pipeline (license, insurance, BBB), periodic re-checks | Compliance system |
| **9: Fargate Deploy** | 32–33 | ECR push, Fargate task def, ALB setup, CloudFront, CI/CD pipeline | Production deployment |
| **10: Advanced** | 34+ | Gantt editor, map view (multi-site), DocuSign, SaaS multi-tenant | Enterprise features |

---

# PART 11: COST ESTIMATES

## Development (MVP)

| Item | Monthly Cost |
|------|-------------|
| Supabase (Free tier → Pro) | $0–$25 |
| Docker / local dev | $0 |
| Claude API | ~$20–$50 |
| AWS (minimal Fargate during dev) | ~$10–$30 |
| Twilio (SMS for QR links) | ~$5–$20 |
| **Total** | **~$35–$125/month** |

## Production

| Scale | Monthly Cost |
|-------|-------------|
| Small (5 orgs, 50 contractors, 100 workgroups/mo) | ~$200–$400 |
| Medium (20 orgs, 200 contractors, 500 workgroups/mo) | ~$500–$900 |
| Large (100 orgs, 1,000 contractors, 2,000 workgroups/mo) | ~$1,200–$2,800 |

### Production Cost Breakdown

| Component | Small | Medium | Large |
|-----------|-------|--------|-------|
| Supabase Pro | $25 | $25 | $75+ |
| Fargate (containers) | $30–$60 | $100–$250 | $300–$800 |
| ALB | $20 | $25 | $40 |
| CloudFront | $5 | $15 | $50 |
| Claude API | $30–$80 | $100–$250 | $300–$800 |
| Twilio (SMS) | $10–$30 | $40–$100 | $100–$300 |
| SNS/SES (notifications) | $5–$10 | $20–$50 | $50–$150 |
| S3/Storage | $5 | $15 | $50+ |
| SerpAPI (verification) | $10 | $25 | $50 |
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
| Geo-fence default | 200m | 300m | 500m | Configurable |
| GPS check-in required | Optional | Required | Optional | Configurable |

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
│ 10. Site presence verified before invoice approved                  │
│ 11. When all jobs are invoiced and paid → workgroup is complete    │
│                                                                       │
│ Flow: Contractor completes jobs → selects jobs for invoice →       │
│       submits → AI validates (incl. site presence) →               │
│       routes to approval → Contact Person + Business Owner          │
│       approves → payment processed                                   │
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
│   │   ├── supabase_auth.py    # Supabase JWT validation (biz owner)
│   │   ├── qr_auth.py          # QR token + shared credential validation
│   │   └── worker_session.py   # Worker self-ID + session management
│   │
│   ├── models/                 # Pydantic models (request/response)
│   │   ├── project.py
│   │   ├── worksite.py
│   │   ├── workgroup.py
│   │   ├── job.py
│   │   ├── invoice.py
│   │   ├── contractor.py
│   │   ├── worker.py
│   │   ├── employee.py
│   │   ├── checkin.py
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
│   │   ├── checkins.py         # GPS check-in/check-out
│   │   └── analytics.py
│   │
│   ├── services/               # Business logic
│   │   ├── allocation.py       # AI contractor scoring
│   │   ├── invoice_validator.py
│   │   ├── dependency_engine.py
│   │   ├── progress_calculator.py
│   │   ├── geo_verification.py # GPS + photo geo-tag verification
│   │   ├── qr_generator.py     # QR code + token generation
│   │   ├── contractor_verifier.py  # External verification pipeline
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
│   ├── test_qr_auth.py
│   ├── test_checkins.py
│   ├── test_invoices.py
│   └── ...
│
└── scripts/
    ├── seed_data.py            # Test data seeder
    └── deploy.sh               # Fargate deployment
```

---

# APPENDIX D: QR AUTHENTICATION SUMMARY

```
┌─────────────────────────────────────────────────────────────────────┐
│ QR AUTHENTICATION MODEL — KEY RULES                                  │
│                                                                       │
│ 1. Each contractor company has ONE shared phone + email credential  │
│ 2. System sends QR code/link to company phone + email on allocation │
│ 3. Owner can forward the link to any worker (outside the CMS)      │
│ 4. Anyone with the link enters company phone + email to access     │
│ 5. Like keyless entry — same "key" for everyone at the company     │
│ 6. No limit on how many people can use the shared credentials      │
│ 7. On FIRST access, each person self-identifies:                   │
│    - First name (required)                                          │
│    - Last name (required)                                           │
│    - Phone number (required)                                        │
│    - Email (optional)                                                │
│ 8. Self-identification is ONE-TIME per device/session              │
│ 9. Returning workers are recognized — no repeat self-ID            │
│ 10. Session persists for the life of the workgroup                 │
│ 11. All actions tracked per identified worker                      │
│ 12. QR token expires when workgroup is complete                    │
│ 13. Business Owner can revoke QR token at any time                 │
│ 14. Separate QR token per workgroup                                 │
│                                                                       │
│ Flow: Allocate → QR sent (SMS+Email) → Owner forwards →           │
│       Worker taps link → Company phone+email → Self-ID (once) →    │
│       In the app → GPS check-in → Do work → Submit docs            │
└─────────────────────────────────────────────────────────────────────┘
```

---

*Document Version: 5.0 — Contractor Management System: Project, Worksite, Workgroup & Job Architecture*
*Changes from v4.0:*
- *Simplified contractor auth: shared company phone + email as "keyless entry" credentials*
- *Added worker self-identification model (name + phone required, email optional, one-time)*
- *No pre-registered contractor employee roster — workers appear on first access*
- *Added QR code authentication flow (full 6-step process)*
- *Added geo-verification system: GPS check-in + photo geo-tags (double proof)*
- *Added configurable geo-fence radius per worksite*
- *Added site_checkins, contractor_workers, qr_tokens, contractor_verifications tables*
- *Added workgroup_site_presence view for analytics*
- *Added AI geo-intelligence (anomaly detection, presence monitoring)*
- *Added site presence verification to invoice validation (check #10)*
- *Updated notification matrix with geo-related events*
- *Updated MVP roadmap (expanded to 33+ weeks with QR, geo, and verification phases)*
- *Added Appendix D: QR Authentication Summary*
*Parent Document: Contractor Management System Architecture*
