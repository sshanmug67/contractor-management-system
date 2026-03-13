## CMS Visual Enhancement Plan — Next Session

### Reference: CVE Intel Dashboard (dark theme, dense data viz, layered cards)
### Goal: Bring CMS to the same premium visual tier

---

### 1. OWNER DASHBOARD (OwnerDashboard.tsx)
- **Stat cards**: Add subtle gradient backgrounds, micro-sparkline trends
- **Project cards**: Mini progress ring (donut) replacing flat percentage text
- **Pending invoices table**: Status pills with pulse animation for urgent items
- **AI Insights panel**: Typing animation on new insights, glass-morphism card
- **Activity feed**: Grouped by time (Today / Yesterday / This Week), avatars per contractor
- **Needs Attention grid**: Animated count-up on numbers, click-through to filtered views

### 2. PROJECT DETAIL — OVERVIEW TAB
- **Site banner**: Add mini budget donut (paid/invoiced/remaining) on the right side
- **Workgroup cards**: Replace flat progress bar with circular progress ring
- **Workgroup cards**: Add contractor avatar/initials badge
- **Workgroup cards**: Hover state → subtle card lift + glow matching trade color
- **Dependency chips**: Animated dashed connector line between blocked cards
- **WorkgroupDrawer**: Richer job timeline with status transitions

### 3. PROJECT DETAIL — TIMELINE TAB (GanttView)
- **Job bars**: Gradient fills matching status (not flat colors)
- **TODAY marker**: Pulsing red line with "TODAY" label
- **Dependency arrows**: Animated gold dashed lines with arrowheads
- **Hover tooltips**: Rich tooltip showing job details, duration, budget
- **Expand/collapse**: Smooth accordion animation on workgroup rows
- **Critical path**: Highlight critical path jobs with red border/glow

### 4. PROJECT DETAIL — BUDGET & EXPENSES TAB
- **Budget donut chart**: Recharts PieChart (paid/invoiced/remaining)
- **Spend over time**: Recharts AreaChart showing cumulative spend vs budget line
- **Budget by workgroup bars**: Gradient fills, hover to show paid/invoiced breakdown
- **Invoice table**: Sortable columns, status filter pills with counts
- **Budget health indicator**: Green/yellow/red based on burn rate vs timeline

### 5. GLOBAL POLISH
- **Skeleton loading**: Replace spinners with shimmer skeleton screens
- **Card shadows**: 3-layer elevation system (flat → raised → floating)
- **Transitions**: Page transitions between Dashboard → ProjectDetail
- **Dark header**: Extend the dark gradient header style for visual weight
- **Typography**: Tighter letter-spacing on numbers, tabular-nums for alignment
- **Empty states**: Illustrated empty states (no projects, no invoices, etc.)
- **Micro-interactions**: Button press scale, card hover lift, tab underline slide

### 6. DESIGN TOKENS TO STANDARDIZE
- Current palette is good (P.done/active/pending/draft/crit)
- Add: glass effect (backdrop-blur + semi-transparent bg)
- Add: elevation levels (shadow-sm, shadow-md, shadow-lg)
- Add: consistent border-radius scale (8, 12, 14, 16)
- Add: animation duration scale (fast: 150ms, normal: 250ms, slow: 400ms)

### 7. COMPONENT CANDIDATES FOR EXTRACTION
- ProgressRing (circular progress — reusable across cards)
- BudgetDonut (Recharts pie — reusable across overview + budget tab)
- StatusPill (consistent status badges everywhere)
- SkeletonCard / SkeletonTable (loading states)
- TradeIcon (already exists but could get colored backgrounds)

---

### FILES TO HAVE READY
- OwnerDashboard.tsx (current working version)
- ProjectDetailPage.tsx (current working version)
- useDashboardPortfolio.ts + useDashboard.ts (hooks)
- dashboardBridge.ts (transforms)

### TECH AVAILABLE (already in project)
- Recharts (imported, ready to use)
- Lucide React icons
- DM Sans font (loaded)
- Tailwind classes (for artifacts/components)
- CSS animations (fu, si, spin, fadeIn, pulse already defined)
