# Dashboard Data Gap Analysis
## What's Missing, What It Means, and How to Build It

---

## Current State vs Required State

The dashboard currently uses a `bridgeProject()` function that **fakes or estimates** 18 data fields that don't exist in the database yet. This document maps every missing field, explains its business meaning, provides the DB schema, and the API endpoint changes needed.

---

## LEGEND

| Symbol | Meaning |
|--------|---------|
| ✅ | Already exists in DB/API — no changes needed |
| 🔶 | Exists but needs renaming or reinterpretation |
| ❌ | Missing — needs new DB column/table + API field |

---

## 1. PER-PROJECT FIELDS

### 1A. Contract & Revenue Fields (CLIENT SIDE — money flowing IN)

These track the relationship with YOUR CLIENT (the entity that hired you).

| Field | Status | DB Column | Type | Business Meaning |
|-------|--------|-----------|------|-----------------|
| `contractValue` | 🔶 | `projects.contract_value` | `DECIMAL(12,2)` | The total contract amount the client agreed to pay you for this project. This is NOT your internal budget — it's the client-facing contract price. Currently we use `totalBudget` as a proxy, but budget ≠ contract value. Budget is what you plan to spend; contract value is what the client pays. |
| `invoicedToClient` | ❌ | Computed from `client_invoices` table | `DECIMAL(12,2)` | Total dollar amount of all invoices YOU have sent TO the client. Sum of all client invoices for this project regardless of payment status. |
| `receivedFromClient` | ❌ | Computed from `client_invoices` where `paid = true` | `DECIMAL(12,2)` | Total dollar amount the client has actually PAID you. This is cash in hand. The difference between `invoicedToClient` and `receivedFromClient` = your outstanding receivables (money owed to you). |

**Why these matter:** The donut chart shows contract value breakdown. If you invoiced $720K of a $1.2M contract and received $620K, you know: 52% collected, 8% invoiced-but-waiting, 40% still to invoice. This drives cash flow decisions.

### 1B. Contractor Cost Fields (CONTRACTOR SIDE — money flowing OUT)

These track your relationship with SUBCONTRACTORS you hired.

| Field | Status | DB Column | Type | Business Meaning |
|-------|--------|-----------|------|-----------------|
| `contractorCosts` | 🔶 | Computed from `workgroups.budget` sum | `DECIMAL(12,2)` | Total estimated cost of all contractor work for this project. Sum of all workgroup budgets. This already exists conceptually as `totalBudget` in the current system but represents the OUTFLOW side. |
| `paidToContractors` | ❌ | Computed from `invoices` where `paid = true` | `DECIMAL(12,2)` | Total dollar amount you have actually PAID to subcontractors. Currently bridged as `totalSpent * 0.75` which is a guess. Should be computed from the invoices table where payment status is complete. |
| `pendingContractorInvoices` | 🔶 | Already exists in `invoices` table | `Array` | Contractor invoices submitted to you but not yet paid. These already exist in the `pendingInvoices` API — just need to be grouped by project and returned as a nested array per project. |

**Why these matter:** Cash Position = `receivedFromClient` - `paidToContractors`. This single number tells you if a project is cash-positive (you have more money from the client than you've paid out) or cash-negative (you're funding the gap from your own pocket).

### 1C. Profitability Fields

| Field | Status | DB Column | Type | Business Meaning |
|-------|--------|-----------|------|-----------------|
| `originalMargin` | ❌ | `projects.original_margin_pct` | `DECIMAL(5,2)` | The profit margin % you estimated when you bid on this project. Example: Contract value $1.2M, estimated costs $960K → original margin = 20%. This is set once at project creation and never changes. |
| `currentMargin` | ❌ | Computed | `DECIMAL(5,2)` | The profit margin % based on CURRENT cost projections. As change orders come in, contractor costs increase, and scope changes, the margin erodes or improves. Formula: `(contractValue - currentEstimatedCosts) / contractValue * 100`. |

**Why these matter:** The margin trend arrow (18% ↓4) tells Tom instantly if a project's profitability is eroding. If original margin was 22% and current is 16%, that's a 6-point erosion — a red flag that needs investigation.

### 1D. Schedule & Risk Fields

| Field | Status | DB Column | Type | Business Meaning |
|-------|--------|-----------|------|-----------------|
| `forecastEnd` | ❌ | `projects.forecast_end_date` | `DATE` | The projected actual completion date based on current progress and delays. Different from `endDate` which is the PLANNED/contractual completion. If forecastEnd > endDate, the project is running late. |
| `scheduleStatus` | ❌ | Computed or `projects.schedule_status` | `ENUM('ontrack','delayed','critical')` | Overall schedule health. Can be computed: if `forecastEnd <= endDate` → ontrack, if delay ≤ 30 days → delayed, if delay > 30 days → critical. Or set manually by PM. |
| `delayDays` | ❌ | Computed | `INTEGER` | Number of calendar days the project is behind schedule. `forecastEnd - endDate` in days. Zero if on track. Displayed as "+16d late" on the card. |
| `riskFlag` | ❌ | `projects.risk_flag` or computed | `VARCHAR(255)` | A single-line alert text for the most critical risk on this project. Examples: "Schedule slip +16 days", "Budget overrun 12%", "Client payment overdue 45 days". Could be AI-generated or manually set. Null if no active risk. |
| `nextMilestone` | ❌ | Computed from jobs/workgroups | `VARCHAR(255)` | The name of the next upcoming incomplete milestone or job. Computed by finding the first not-started or in-progress job by sequence. Shown in the bottom bar: "Next: Floor 2 electrical rough-in". |

### 1E. Operational Count Fields

| Field | Status | DB Column | Type | Business Meaning |
|-------|--------|-----------|------|-----------------|
| `worksites` | ✅ | Already exists as `sitesCount` | `INTEGER` | Number of physical work locations for this project. Already in the API. |
| `workgroups` | ✅ | Already exists as `workgroupsCount` | `INTEGER` | Number of trades/workgroups. Already in the API. |
| `activeContractors` | ❌ | Computed | `INTEGER` | Count of distinct contractors currently assigned to active/in-progress workgroups on this project. Currently guessed as `Math.min(workgroupsCount, 6)`. Should be: `SELECT COUNT(DISTINCT contractor_id) FROM workgroups WHERE project_id = ? AND status IN ('active', 'in_progress')`. |
| `changeOrders` | ❌ | `projects.change_order_count` or computed | `INTEGER` | Number of approved change orders on this project. Change orders are scope modifications after the original contract — they often signal scope creep and margin erosion. Could be a simple counter on the project, or counted from a `change_orders` table if one exists. |
| `openIssues` | ❌ | Computed or `projects.open_issues_count` | `INTEGER` | Number of unresolved issues, punch list items, or problems flagged on this project. Could come from an issues/tickets system, or be a manually maintained count. |
| `client` | ❌ | `projects.client_name` | `VARCHAR(255)` | Name of the client who hired you for this project. Currently parsed from the project title by splitting on " — " which is fragile. Should be a proper field. |

---

## 2. NEW DATABASE TABLE: `client_invoices`

This is the biggest gap. The current system tracks contractor invoices (money going OUT) but has no concept of client invoices (money coming IN). You need a table for invoices you send to your clients.

```sql
CREATE TABLE client_invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id),
    invoice_number  VARCHAR(50) NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    date_issued     DATE NOT NULL,
    date_due        DATE,
    date_paid       DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
                    -- draft, sent, viewed, paid, overdue, disputed
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_client_invoices_project ON client_invoices(project_id);
CREATE INDEX idx_client_invoices_status ON client_invoices(status);
```

**This table enables:**
- `invoicedToClient` = `SUM(amount) FROM client_invoices WHERE project_id = ? AND status != 'draft'`
- `receivedFromClient` = `SUM(amount) FROM client_invoices WHERE project_id = ? AND status = 'paid'`
- Outstanding receivables = invoiced - received

---

## 3. PROJECT TABLE MODIFICATIONS

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_value DECIMAL(12,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS original_margin_pct DECIMAL(5,2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS forecast_end_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS schedule_status VARCHAR(20) DEFAULT 'ontrack';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS risk_flag VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS change_order_count INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS open_issues_count INTEGER DEFAULT 0;
```

---

## 4. PORTFOLIO-LEVEL KPI FIELDS

These are all computed by aggregating project-level data. No new DB tables needed — just the API query.

| KPI | How to Compute | Current Bridge |
|-----|---------------|----------------|
| `totalContractValue` | `SUM(contract_value) FROM projects WHERE status = 'active'` | Uses `totalBudget` as proxy |
| `totalReceivedFromClients` | `SUM(amount) FROM client_invoices WHERE status = 'paid' AND project is active` | Uses `totalSpent` as proxy |
| `totalInvoicedToClients` | `SUM(amount) FROM client_invoices WHERE status != 'draft' AND project is active` | Uses `totalSpent + totalInvoiced` |
| `totalPaidToContractors` | `SUM(amount) FROM invoices WHERE paid = true AND project is active` | Guessed from project data |
| `totalContractorCosts` | `SUM(budget) FROM workgroups WHERE project is active` | Same as above |
| `onSchedule` | `COUNT(*) FROM projects WHERE schedule_status = 'ontrack' AND status = 'active'` | Computed from activeProjects - delayed |
| `delayed` | `COUNT(*) FROM projects WHERE schedule_status = 'delayed' AND status = 'active'` | Uses stats.delayed |
| `critical` | `COUNT(*) FROM projects WHERE schedule_status = 'critical' AND status = 'active'` | Hardcoded to 0 |
| `projectsAtRisk` | `COUNT(*) FROM projects WHERE risk_flag IS NOT NULL AND status = 'active'` | Uses delayed count |

---

## 5. API ENDPOINT CHANGES

### Updated `useDashboardPortfolio` response shape:

```typescript
// Add to UIProject interface
interface UIProject {
  // ... existing fields ...
  
  // NEW: Client-side revenue fields
  contractValue: number;
  clientName: string;
  invoicedToClient: number;
  receivedFromClient: number;
  
  // NEW: Contractor cost fields  
  paidToContractors: number;
  pendingContractorInvoices: {
    contractor: string;
    amount: number;
  }[];
  
  // NEW: Profitability
  originalMargin: number;
  currentMargin: number;
  
  // NEW: Schedule & Risk
  forecastEndDate: string | null;
  scheduleStatus: 'ontrack' | 'delayed' | 'critical';
  delayDays: number;
  riskFlag: string | null;
  nextMilestone: string | null;
  
  // NEW: Operational counts
  activeContractors: number;
  changeOrders: number;
  openIssues: number;
}

// Add to UIStats interface
interface UIStats {
  // ... existing fields ...
  
  // NEW: Portfolio KPIs
  totalContractValue: number;
  totalReceivedFromClients: number;
  totalInvoicedToClients: number;
  totalPaidToContractors: number;
  totalContractorCosts: number;
  onSchedule: number;
  delayed: number;
  critical: number;
  projectsAtRisk: number;
}
```

### Backend Query (pseudocode):

```sql
-- Per project, compute all dashboard fields in one query
SELECT 
  p.*,
  p.contract_value,
  p.client_name,
  p.original_margin_pct,
  p.forecast_end_date,
  p.schedule_status,
  p.risk_flag,
  p.change_order_count,
  p.open_issues_count,
  
  -- Client revenue
  COALESCE(ci.total_invoiced, 0) as invoiced_to_client,
  COALESCE(ci.total_received, 0) as received_from_client,
  
  -- Contractor costs
  COALESCE(inv.total_paid, 0) as paid_to_contractors,
  
  -- Active contractors
  COALESCE(wg.active_contractor_count, 0) as active_contractors,
  
  -- Next milestone
  nj.title as next_milestone

FROM projects p

LEFT JOIN (
  SELECT project_id,
    SUM(amount) as total_invoiced,
    SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_received
  FROM client_invoices
  WHERE status != 'draft'
  GROUP BY project_id
) ci ON ci.project_id = p.id

LEFT JOIN (
  SELECT project_id,
    SUM(CASE WHEN paid = true THEN amount ELSE 0 END) as total_paid
  FROM invoices
  GROUP BY project_id
) inv ON inv.project_id = p.id

LEFT JOIN (
  SELECT project_id,
    COUNT(DISTINCT contractor_id) as active_contractor_count
  FROM workgroups
  WHERE status IN ('active', 'in_progress')
  GROUP BY project_id
) wg ON wg.project_id = p.id

LEFT JOIN LATERAL (
  SELECT j.title
  FROM jobs j
  JOIN workgroups w ON j.workgroup_id = w.id
  WHERE w.project_id = p.id
    AND j.status IN ('not_started', 'in_progress')
  ORDER BY j.sequence ASC
  LIMIT 1
) nj ON true

WHERE p.status = 'active';
```

---

## 6. IMPLEMENTATION PRIORITY

### Phase 1 — Core Cash Flow (Biggest Impact)
1. Create `client_invoices` table
2. Add `contract_value` and `client_name` to projects
3. Update API to return `invoicedToClient`, `receivedFromClient`, `paidToContractors`
4. Remove `bridgeProject` money fields

**This unlocks:** Accurate donut charts, real cash position, real receivables in KPI strip.

### Phase 2 — Profitability & Schedule
5. Add `original_margin_pct`, `forecast_end_date`, `schedule_status` to projects
6. Compute `currentMargin`, `delayDays`, `nextMilestone` in API
7. Remove bridge for margin, schedule, milestone fields

**This unlocks:** Real margin tracking with trend arrows, accurate schedule status, forecast dates.

### Phase 3 — Operational Details
8. Add `change_order_count`, `open_issues_count`, `risk_flag` to projects
9. Compute `activeContractors` from workgroups
10. Remove all remaining bridge code

**This unlocks:** Complete project cards with real data, risk flags, change order tracking.

---

## 7. WHAT HAPPENS WHEN YOU'RE DONE

Once all fields are real, you can delete:
- The entire `bridgeProject()` function (lines 139-174)
- The entire `bridgePortfolio()` function (lines 189-201)  
- The `ProjectCardData` interface (lines 111-137) — replace with extended `UIProject`
- The `PortfolioKPIs` interface (lines 176-187) — replace with extended `UIStats`
- All `(proj as any)` type assertions

The dashboard will read directly from the API with zero transformations.
