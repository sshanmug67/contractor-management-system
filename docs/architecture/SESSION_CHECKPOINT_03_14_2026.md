# CMS Dependency Analyzer — Session Checkpoint
## Date: March 14-15, 2026 (Saturday night session)

---

## PROJECT CONTEXT

The **Contractor Management System (CMS)** is a two-sided platform connecting Business Owners with Contractors. An AI Agent orchestrates the lifecycle. The data hierarchy is: **Project → Worksite → Workgroup → Job**. A Business Owner creates a Project, breaks it into Worksites (physical locations), each containing Workgroups (assigned to one Contractor per trade), and each Workgroup contains multiple Jobs.

The app is built with:
- **Backend**: Python FastAPI + Supabase (PostgreSQL) + Redis + Celery
- **Frontend**: React + TypeScript + Vite
- **Architecture**: Database Abstraction Layer (ProviderRegistry), Redis L2 caching, Celery workers with Beat scheduling
- **Key pattern**: Router → Worker → Service (three-layer separation). Services are pure business logic with no DB/Celery imports.

---

## WHAT WE BUILT (all committed to `dev` branch)

### 1. DAG Engine — General-Purpose Graph Analyzer
- **File**: `app/services/dag_engine.py`
- **Tests**: `tests/services/test_dag_engine.py` (99 tests)
- Pure Python, zero CMS dependencies, extractable as standalone package
- 15 methods: topological_sort, detect_cycle, forward_pass, backward_pass, compute_schedule, critical_path, float_map, project_duration, downstream, upstream, predecessors_satisfied, direct_successors/predecessors, simulate_delay/simulate_delay_impact, fan_out, depth_map
- Data structures: DAGNode(id, duration, is_complete), DAGEdge(from_id, to_id), ForwardResult, BackwardResult, ScheduleResult

### 2. Pydantic Models
- **File**: `app/models/dependency.py`
- **ProjectGraph**: lean input for DAGAnalyzer (WorkgroupNode, JobNode, DependencyEdge)
- **GanttData models**: GanttJob, GanttWorkgroup, GanttWorksite, GanttProject — superset of existing DashboardJob/DashboardWorkgroup types with analysis annotations
- Output models for all 9 methods: HealthSnapshot, AnalysisResponse, ScenarioReport, CriticalityReport, ResourceConflict, ParallelWorkReport, Bottleneck, CashFlowReport, ForecastReport
- Plus: UnblockedResult, DelayImpactResult for reactive/periodic triggers

### 3. CMS DependencyService — 9 Analytical Methods
- **File**: `app/services/dependency_analyzer.py`
- **Tests**: `tests/services/test_dependency_service.py` (58 tests)
- Wraps DAGAnalyzer with CMS domain logic
- 9 methods:
  1. `health_snapshot()` — daily briefing: unblocked, overdue, critical path, status messages, AI bullets
  2. `validate_changes()` — preview proposed graph edits with full validation
  3. `simulate_scenarios()` — multi-scenario what-if delay analysis
  4. `criticality_ranking()` — auto-computed sensitivity per workgroup
  5. `detect_resource_conflicts()` — same-contractor overlap detection
  6. `parallel_work_analysis()` — unblocked but idle capacity
  7. `detect_bottlenecks()` — high fan-out convergence nodes
  8. `cash_flow_projection()` — monthly invoice forecast from graph timeline
  9. `completion_forecast()` — actual-vs-estimated correction factor
- Plus: `compute_unblocked()` (reactive), `compute_delay_impact()` (periodic)

### 4. GanttData Assembler
- **File**: `app/services/gantt_assembler.py`
- Pure function: `assemble_gantt_data(dashboard_data, graph, project_id, today)`
- Merges existing dashboard display data (contractor names, progress, invoices) with all 9 analysis methods
- Enriches every workgroup with: earliest_start/finish, latest_start/finish, float_days, is_critical, criticality_tier, is_bottleneck, downstream_count, status_message
- Enriches every job with: earliest_start/finish, float_days, is_critical, criticality_tier
- Embeds sidebar data: critical path, AI insights, rankings, parallel work, bottlenecks, conflicts, cashflow, forecast
- Embeds the ProjectGraph so frontend can send it back to preview/scenario endpoints

### 5. Repository — get_project_graph()
- **Interface**: `app/db/interfaces/dashboard_repository.py` — added abstract method
- **Implementation**: `app/db/providers/supabase/dashboard_queries.py` — 5 queries (worksites → workgroups → jobs → wg_deps → job_deps), assembles into ProjectGraph dict
- Maps `depends_on_workgroup_id` → `from_id` (predecessor) and `workgroup_id` → `to_id` (dependent)

### 6. Redis Cache Layer
- **File**: `app/cache/dependency_cache.py`
- Cache keys: `cms:cache:gantt:{project_id}` (10 min), `cms:cache:health_snapshot:{project_id}` (10 min), `cms:cache:criticality:{project_id}` (10 min), `cms:cache:cashflow:{project_id}` (10 min), `cms:cache:delay_insights:{project_id}` (6 hr)
- Pub/sub: `cms:analysis:refreshed:{project_id}`
- `invalidate_project_analysis()` clears all analysis caches for a project

### 7. Dependency Analysis Worker
- **File**: `app/workers/dependency_analysis_worker.py`
- Task: `refresh_dependency_analysis(project_id=None)`
- Triggers: Daily 5 AM via Beat, event-driven via `.delay(project_id)`, pre-warm on worker startup via `worker_ready` signal
- For each project: fetches dashboard data + ProjectGraph → runs gantt_assembler → caches full GanttData + individual analysis results
- Successfully tested: 3 projects cached in 5.9 seconds on worker startup

### 8. Router — 12 API Endpoints
- **File**: `app/routers/dependency_changes.py`
- All under `/api/dependencies/`
- **GET /gantt/{project_id}** — full GanttData (cache-first, 29KB response from Westfield)
- POST /preview — change validation
- POST /apply — apply changes + invalidate cache + fire refresh worker
- POST /scenarios — what-if simulation
- GET /graph/{project_id} — raw ProjectGraph
- GET /health/{project_id} — health snapshot (cache-first)
- GET /criticality/{project_id} — criticality ranking (cache-first)
- GET /parallel/{project_id} — parallel work
- GET /bottlenecks/{project_id} — bottleneck detection
- GET /conflicts/{project_id} — resource conflicts
- GET /cashflow/{project_id} — cash flow (cache-first)
- GET /forecast/{project_id} — completion forecast

### 9. Celery App Updates
- **File**: `app/workers/celery_app.py`
- Added Beat schedule: `refresh-dependency-analysis` (crontab 5 AM)
- Added autodiscover: `app.workers.dependency_analysis_worker`
- Added task route: `dependency_analysis_worker.*` → `periodic` queue
- Added `worker_ready` signal: pre-warms both dependency analysis + dashboard stats cache on startup

### 10. Architecture Documents
- `docs/architecture/CMS_Dependency_Analyzer_Blueprint_v2_0.docx` — 9-method framework, UI integration map, full Pydantic models, build order
- `docs/architecture/CMS_Redis_Celery_Blueprint_v1_1.docx` — updated workers, Redis keys, Beat schedule, file structure

---

## TEST DATA IN SUPABASE

3 projects with seed data:
- `d0000000-...01` — **ABC Properties** (3 sites, 9 WGs, 26 jobs, some deps)
- `d0000000-...02` — **Johnson Residence** (1 site, 6 WGs, 15 jobs, rich dependency chain)
- `d0000000-...03` — **Westfield Office** (2 sites/floors, 8 WGs, 22 jobs, richest graph)

Westfield is the best test project — Floor 2 chain: Electrical→HVAC→Drywall→Flooring→Painting, Floor 3: Electrical→HVAC+Server→Painting, plus cross-WG job-level dependencies.

Dev org ID: `a0000000-0000-0000-0000-000000000001`

---

## WHAT'S NEXT: FRONTEND WIRING

The `/api/dependencies/gantt/{project_id}` endpoint returns 29KB of fully enriched GanttData from Redis cache. The frontend needs to consume it.

### Step 1: TypeScript Types (~30 min)
Create `types/gantt.ts` matching the GanttData response shape. Key additions over existing types:
- `GanttWorkgroup` extends `DashboardWorkgroup` + `earliest_start`, `earliest_finish`, `latest_start`, `latest_finish`, `float_days`, `is_critical`, `criticality_tier`, `is_bottleneck`, `downstream_count`, `status_message`
- `GanttJob` extends `DashboardJob` + `earliest_start`, `earliest_finish`, `float_days`, `is_critical`, `criticality_tier`
- `GanttData.analysis` object with all sidebar data

### Step 2: Service Hook (~30 min)
Create service/hook to fetch from `/api/dependencies/gantt/{project_id}` instead of `/api/dashboard/owner`

### Step 3: Switch Timeline Data Source (~1 hr)
The Timeline tab currently consumes `OwnerDashboardData`. Switch it to `GanttData`. All existing fields are present (it's a superset), so existing rendering should work unchanged.

### Step 4: Visual Enhancements (~3-5 hrs)
- Critical path highlighting on Gantt bars (is_critical → glow/color)
- Criticality badges per workgroup (Critical/High/Medium/Low)
- Float visualization (translucent bar extension showing slack)
- Bottleneck indicators on high fan-out workgroups
- Status messages on hover/detail
- Wire sidebar panels to analysis data

### Files to request from user:
- The Timeline/Gantt React component
- The data hook that feeds the Timeline
- Any TypeScript types file for dashboard data (already seen: `types/dashboard.ts`, `types/job.ts`, `types/workgroup.ts`, `types/project.ts`)

---

## EXISTING FRONTEND TYPES (from this session)

### types/dashboard.ts
```typescript
DashboardJob { id, title, budget, est_duration_days, sequence, status, invoiced, paid, invoice_amount, depends_on_job_ids }
DashboardWorkgroup { id, worksite_id, title, trade, contractor_id, contractor_name, budget, start_date, end_date, status, progress_pct, depends_on_ids, paid, invoiced, jobs }
DashboardWorksite { id, name, address_line1, city, state, zip_code, budget, start_date, end_date, status, progress_pct, workgroups }
DashboardProject { id, title, description, total_budget, start_date, end_date, status }
OwnerDashboardData { project, worksites, budget_summary, stats }
```

### types/workgroup.ts
```typescript
Workgroup { id, project_id, contractor_id, title, trade, description, budget, start_date, end_date, status, progress_pct, dependencies: string[], total_invoiced, total_paid }
WorkgroupStatus = 'draft' | 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'review' | 'approved' | 'complete' | 'disputed'
```

### types/job.ts
```typescript
Job { id, workgroup_id, title, description, budget, est_duration_days, sequence, status, progress_pct, invoice_id, dependencies: string[] }
JobStatus = 'not_started' | 'in_progress' | 'complete' | 'invoiced' | 'paid'
```

---

## BACKEND FILE LOCATIONS

```
backend/app/
├── services/
│   ├── dag_engine.py              ← General-purpose DAGAnalyzer
│   ├── dependency_analyzer.py     ← CMS DependencyService (9 methods)
│   ├── gantt_assembler.py         ← Merges display + analysis → GanttData
│   └── ... (other services)
├── models/
│   ├── dependency.py              ← ProjectGraph, GanttData, all output models
│   └── ... (other models)
├── routers/
│   ├── dependency_changes.py      ← 12 API endpoints
│   └── ... (other routers)
├── cache/
│   ├── dependency_cache.py        ← Redis L2 cache helpers
│   ├── dashboard_cache.py
│   └── redis_client.py
├── workers/
│   ├── dependency_analysis_worker.py  ← Daily + event-driven
│   ├── celery_app.py              ← Beat schedule + worker_ready
│   └── ... (other workers)
├── db/
│   ├── interfaces/dashboard_repository.py  ← get_project_graph() interface
│   └── providers/supabase/dashboard_queries.py  ← get_project_graph() impl
└── tests/services/
    ├── test_dag_engine.py         ← 99 tests
    └── test_dependency_service.py ← 58 tests
```

## KEY API ENDPOINTS FOR FRONTEND
```
GET  /api/dependencies/gantt/d0000000-0000-0000-0000-000000000003   ← Full GanttData (cache-first)
POST /api/dependencies/preview      ← Preview change impact
POST /api/dependencies/apply        ← Apply changes
POST /api/dependencies/scenarios    ← What-if analysis
```
