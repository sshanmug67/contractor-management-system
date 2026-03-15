# CMS Gantt Chart — Session Checkpoint
## Date: March 15, 2026 (Sunday marathon session)

---

## SESSION SUMMARY

Transformed the Gantt chart from a monolithic 1316-line file with hardcoded sidebar data
into a modular 10-component architecture powered by a real DAG analysis engine, with
scenario simulation, ghost bars, critical path visualization, and business-focused UX.

---

## FILE INVENTORY (what to drop where)

### Frontend — New/Modified Components
```
frontend/src/routes/owner/
├── ProjectDetailPage.tsx              ← 175 lines (was 1316! orchestrator only)
└── components/
    ├── projectConstants.tsx            ← 146 lines (icons, palettes, shared)
    ├── GanttView.tsx                  ← 530 lines (timeline + all enhancements)
    ├── GanttOutlook.tsx               ← 182 lines (sidebar, hides completed crit)
    ├── ScenarioPanel.tsx              ← 272 lines (★ NEW: what-if simulator)
    ├── CardView.tsx                   ← 298 lines (overview tab, extracted)
    ├── ProjectOutlook.tsx             ←  77 lines (overview sidebar, extracted)
    ├── BudgetExpensesView.tsx         ← 120 lines (budget tab, extracted)
    └── WorkgroupDrawer.tsx            ←  80 lines (drawer, extracted)
```

### Frontend — Service/Hook/Types Layer
```
frontend/src/types/gantt.ts            ← 286 lines (TS types matching backend)
frontend/src/services/ganttService.ts  ← (API calls, unchanged from earlier)
frontend/src/hooks/ganttBridge.ts      ← 426 lines (snake→camel transform + hook)
```

### Backend
```
backend/app/services/gantt_assembler.py ← 306 lines (enriches dashboard + DAG analysis)
```

---

## ARCHITECTURE

```
Overview tab  → useDashboard()  → /api/dashboard/owner (unchanged)
Timeline tab  → useGanttData()  → /api/dependencies/gantt/{projectId}
Budget tab    → useDashboard()  (unchanged)

Scenario sim  → ganttService.runScenarios() → POST /api/dependencies/scenarios
Dep preview   → ganttService.previewChanges() → POST /api/dependencies/preview
Dep apply     → ganttService.applyChanges() → POST /api/dependencies/apply
```

### Data Flow for Scenario Simulation
```
User right-clicks WG bar → context menu → "Simulate delay..."
  → ProjectDetailPage sets simulatingWgId
  → Sidebar swaps: GanttOutlook → ScenarioPanel
  → User drags slider (debounced 200ms)
  → ScenarioPanel calls POST /scenarios with embedded ProjectGraph
  → Backend DependencyService.simulate_scenarios() (pure compute, ~50ms)
  → Response: { scenarios: [{ delta_days, shifts, projected_duration_days, ... }] }
  → ScenarioPanel displays results + calls onShiftsChanged([{entityId, shiftDays}])
  → ProjectDetailPage passes simulationShifts to GanttView
  → GanttView renders purple ghost bars in SVG overlay
  → User closes panel → shifts cleared → ghost bars disappear
```

---

## ENHANCEMENTS IMPLEMENTED

### 1. Critical Path Visualization
- `isCritActive = isCritical && status !== "complete"` — only active/pending WGs get red
- Completed critical WGs → green bars + milestone diamond, NO CRIT badge
- Red pulse animation on ALL non-complete critical WGs (active + pending + draft)
- Border priority: `isCritActive && isBlocked` → red dashed > `isCritActive` → red solid > `isBlocked` → amber dashed

### 2. Critical Path Arrows
- Red dashed arrows only between non-complete critical nodes
- `bothCritical` check: both in criticalPathSet AND neither is complete
- Critical WG arrows always render (not skipped by coveredWgPairs) to ensure red line appears

### 3. Not-Started Jobs
- `isNotStarted` → `background: "none"`, `border: "1px dashed #8C7E6A"`, `opacity: 1`
- Clear dotted outline instead of invisible ghost (was 18% opacity)

### 4. Float Bars
- SVG overlay: translucent blue dashed rectangles past WG bar ends
- Label: "{N}d slack" centered inside
- Completion count positions AFTER float bar end via `floatEndPctMap`

### 5. Bottleneck Badges
- "⚠ BTL ×{downstreamCount}" on WG rows
- Tooltip: "Bottleneck: N downstream depend on this"

### 6. Dep-Drag Handles
- Purple circle on right edge of every expanded job bar (hover-only)
- Drag → purple line → drop → preview → banner → apply/discard

### 7. Sidebar Refinements
- Critical path: hides completed WGs, shows "2 remaining · 2 done"
- Each card: "Site → WG" format with contractor, status message, job count
- Bottleneck section with downstream counts

### 8. Computed End Dates (Backend)
- WG end_date = start_date + sum(job durations) — computed in gantt_assembler.py
- Job start_date/end_date = WG start + cumulative sequence offset — computed in gantt_assembler.py
- Frontend uses backend dates if available, falls back to old calculation

### 9. Date Labels on Bars
- WG bars: "1/3 Feb 23" after the bar (or after float bar)
- Job bars: "Paid Nov 3" or "Feb 21" next to bar end
- Job tooltips: "3 days · $5K · Mar 1 → Mar 4"

### 10. Scenario Simulation (★ Major Feature)
- Right-click context menu on WG bars → "Simulate delay..."
- ScenarioPanel (450px wide) replaces sidebar
- Delay slider 0-30 days with quick presets (+3d, +7d, +14d, +21d, Buffer+1)
- Results: Project Timeline (+Nd, planned → projected dates), Cash Flow Impact ($),
  Affected Workgroups (each with planned/projected dates + budget), Float Buffer gauge,
  Critical Path alert, Backend summary text
- Ghost bars: purple dashed outlines on Gantt chart showing shifted positions
- Real-time updates as slider moves (debounced POST /scenarios)

---

## BACKEND RESPONSE SHAPES

### GET /api/dependencies/gantt/{projectId}
```json
{
  "project": { ...fields, "project_duration_days": 38 },
  "worksites": [ ...enriched with is_critical, float_days, etc. ],
  "critical_path": ["wg1", "wg2"],
  "critical_path_details": [...],
  "ai_insight_bullets": [...],
  "analysis": {
    "criticality_rankings": [...],
    "parallel_work": {...},
    "bottlenecks": [...],
    "resource_conflicts": [...],
    "cashflow": {...},
    "forecast": {...}
  },
  "graph": { workgroups, jobs, wg_edges, job_edges }
}
```

### POST /api/dependencies/scenarios
Request:
```json
{
  "project_id": "...",
  "scenarios": [{ "name": "WG +5d", "delays": [{ "entity_id": "...", "entity_type": "workgroup", "delay_days": 5 }] }],
  "graph": { ... }
}
```
Response:
```json
{
  "scenarios": [{
    "scenario_name": "WG +5d",
    "original_end_date": null,
    "projected_end_date": null,
    "original_duration_days": 38,      ← DAG work days, NOT calendar days!
    "projected_duration_days": 43,     ← DAG work days, NOT calendar days!
    "delta_days": 5,                   ← work days
    "critical_path": [],
    "shifts": [{ "entity_id", "title", "entity_type", "old_earliest_start", "new_earliest_start", "shift_days" }],
    "absorbed_by": [],
    "propagated_through": ["id1", "id2"],
    "cost_impact": null
  }],
  "summary": "Least impact: ..."
}
```

---

## PENDING: BACKEND DATE LOGIC (next session)

### The Problem
`original_duration_days` and `projected_duration_days` from the scenarios endpoint are
DAG **work days** (sum of job durations on critical path = 38), NOT calendar days.
The actual project spans Oct 31 to Jun 29 = 241 calendar days.

This means:
- `delta_days: 14` is in work days, but we apply it as calendar days to get projected end
- The frontend does `planned_end + delta_days` which gives Jul 13, but this assumes
  1 work day = 1 calendar day, which isn't true when WGs have gaps between them
- The scenario panel's "38d total → 52d total" label shows work days, which is confusing
  when the project header says "Oct 31 — Jun 29" (241 calendar days)

### What Needs to Happen
Options to discuss next session:
1. **Backend computes actual calendar dates**: `original_end_date` and `projected_end_date`
   should be real ISO dates computed from the actual WG start/end dates, not work day counts
2. **delta_days should be calendar days**: if Flooring starts Feb 15 and is delayed 14 work days,
   the actual calendar shift depends on when those jobs would have run
3. **Or**: keep work days but clearly label them as "work days" in the UI and don't mix
   with calendar dates

The cleanest fix: have the backend's `simulate_scenarios()` compute the projected calendar
dates using actual WG start_date/end_date values from the graph, not just DAG arithmetic.

### Files to Modify
- `backend/app/services/dependency_analyzer.py` — `simulate_scenarios()` method
- `backend/app/services/gantt_assembler.py` — may need to pass calendar date context
- `frontend/src/routes/owner/components/ScenarioPanel.tsx` — display logic once backend is fixed

---

## TEST DATA
- `d0000000-0000-0000-0000-000000000001` — ABC Properties (3 sites, 15 WGs)
- `d0000000-0000-0000-0000-000000000002` — Johnson Residence (1 site, 6 WGs, 15 jobs)
- `d0000000-0000-0000-0000-000000000003` — Westfield Office (2 floors, 8 WGs, 22 jobs) ← richest
- Dev org: `a0000000-0000-0000-0000-000000000001`

## DATABASE SCHEMA (relevant)
- 3 projects, 6 worksites, 23 workgroups, 63 jobs
- 13 workgroup dependencies, 10 job dependencies
- WG start_date is user-defined, end_date is now computed from jobs
- Job start_date/end_date now computed from WG start + cumulative sequence

---

## KEY BACKEND FILES
```
backend/app/services/dag_engine.py           ← General-purpose DAGAnalyzer (99 tests)
backend/app/services/dependency_analyzer.py  ← 9 analytical methods + simulate_scenarios
backend/app/services/gantt_assembler.py      ← Merges dashboard + analysis → GanttData
backend/app/routers/dependency_changes.py    ← 12 API endpoints under /api/dependencies/
backend/app/workers/dependency_analysis_worker.py ← Daily 5AM + event-driven cache refresh
backend/app/cache/dependency_cache.py        ← Redis cache: cms:cache:gantt:{project_id}
```
