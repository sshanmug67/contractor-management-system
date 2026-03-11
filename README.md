# Contractor Management System (CMS)

AI-powered two-sided platform connecting **Business Owners** with **Contractors** for property renovation project management.

## Overview

The CMS enables property owners to manage multi-site renovation projects with full visibility into workgroups, jobs, budgets, schedules, and contractor performance — with an AI agent orchestrating communications, monitoring, and insights.

### Architecture

- **Frontend:** React + TypeScript + Vite (deployed via AWS Amplify)
- **Backend:** Python Lambda functions + API Gateway (AWS SAM)
- **Database:** DynamoDB
- **Auth:** AWS Cognito
- **AI:** Claude API for agent intelligence
- **Storage:** S3 for documents/images

### Data Model

```
Project → Worksites → Workgroups → Jobs
                        ↓
                    Contractor (1 per workgroup)
                        ↓
                    Invoices (per job)
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Dev Mode

The app includes a **Dev Role Switcher** in the sidebar to toggle between Owner and Contractor views without authentication.

## Project Structure

```
frontend/src/
├── components/layout/     # OwnerLayout, ContractorLayout
├── routes/
│   ├── owner/             # Business Owner pages
│   │   ├── OwnerDashboard.tsx   # Main dashboard (Card + Gantt views)
│   │   ├── ProjectListPage.tsx
│   │   ├── ContractorPoolPage.tsx
│   │   ├── InvoicesPage.tsx
│   │   └── ...
│   └── contractor/        # Contractor portal pages
│       ├── MyWorkgroupsPage.tsx
│       ├── JobDetailPage.tsx
│       └── ...
├── store/                 # Zustand state management
│   └── authStore.ts
└── App.tsx                # Route definitions
```

## Features

### Owner Dashboard
- **Card View** — Tabbed site navigation, 3-column workgroup cards with Jobs/Budget/Schedule details
- **Timeline View** — Gantt chart with site-grouped workgroups and expandable job bars
- **Project Outlook** — Critical path alerts, AI insights, attention metrics, site presence
- **Workgroup Drawer** — Slide-over detail panel with job status, invoice tracking, budget breakdown

### Planned
- [ ] Contractor portal (My Workgroups, Job updates, Invoice submission)
- [ ] Real-time messaging
- [ ] AI agent (automated reminders, contractor matching, anomaly detection)
- [ ] GPS check-in for on-site verification
- [ ] Document management (OCR, classification)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Zustand |
| Styling | Inline styles with DM Sans font, gradient system |
| Backend | Python 3.12, AWS Lambda, API Gateway |
| Database | DynamoDB (single-table design) |
| Auth | AWS Cognito |
| AI | Anthropic Claude API |
| Infra | AWS SAM / CDK, Amplify Hosting |

## License

Private — All rights reserved.
