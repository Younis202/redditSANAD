# SANAD — National AI Health Intelligence Platform v3.0

## Overview
SANAD is a national AI-first health platform for Saudi Arabia. It connects medical records via National IDs and runs a full AI brain with 9 engines, event-driven decisions, Digital Twin projections, and an immutable audit trail. It serves 7 operator portals: Citizen, Doctor, Emergency, Admin (Ministry), Lab, Pharmacy, and Hospital.

## Architecture (v3.0 — Event-Driven + AI-First + Microservices)

### Monorepo Structure (pnpm workspaces)
```
artifacts/
  sanad/          — React 19 + Vite frontend (port 26138, BASE_PATH=/)
  api-server/     — Express 5 backend API (port 8080, BASE_PATH=/api)
  mockup-sandbox/ — Vite sandbox for UI prototyping
lib/
  db/             — Drizzle ORM schema + PostgreSQL connection
  api-spec/       — OpenAPI 3.1 spec (openapi.yaml) + Orval config
  api-zod/        — Zod schemas generated from OpenAPI spec
  api-client-react/ — TanStack Query hooks generated from OpenAPI spec
scripts/
  src/seed.ts     — Database seeder (50 demo patients)
```

### Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, Framer Motion, Recharts, Radix UI
- **Backend**: Express 5, TypeScript, pino logging, esbuild
- **Database**: PostgreSQL + Drizzle ORM
- **API Generation**: Orval (OpenAPI → React Query hooks + Zod schemas)
- **Custom Hooks**: `artifacts/sanad/src/hooks/use-ai-decision.ts` for new v3.0 AI endpoints
- **Runtime**: Node 24, pnpm workspaces

## Workflow
The "Start application" workflow runs:
```
PORT=8080 pnpm --filter @workspace/api-server run dev & PORT=26138 BASE_PATH=/ pnpm --filter @workspace/sanad run dev
```

## API Routing
Replit proxies requests:
- `/` → sanad frontend on port 26138
- `/api/...` → api-server on port 8080

## Database
- PostgreSQL via `DATABASE_URL` environment variable
- Schema pushed with: `pnpm --filter @workspace/db run push`
- Seed: `pnpm --filter @workspace/scripts run seed`
- Tables: patients, medications, visits, lab_results, alerts, ai_decisions, events, audit_log

## AI Engines (v3.0 — 9 Active Engines)

### Decision Engine (`artifacts/api-server/src/lib/decision-engine.ts`)
- **Risk Scoring Engine**: 0-100 composite from 7+ clinical signals
- **Decision Engine**: Urgency (immediate/urgent/soon/routine) + primary action + time window
- **Digital Twin Simulator**: 12-month health trajectory with predicted conditions
- **Behavioral AI**: Appointment adherence, medication compliance, visit frequency flags
- **Recommendation Engine**: Personalized clinical recommendations ranked by urgency
- **Policy Intelligence**: National disease burden analysis + epidemic radar
- **Multi-Agent Orchestrator**: Routes decisions to appropriate engines
- **Explainability Layer**: WHY factors with contribution scores + clinical basis
- **Unknown Pattern Detector**: Anomaly detection (standby)

### Original AI Engine (`artifacts/api-server/src/lib/ai-engine.ts`)
- Drug Interaction Check (50+ interactions)
- Prediction Engine (deterioration, complication, adherence)
- Clinical Actions Generator (emergency triage)

## API Endpoints

### v3.0 AI Routes (requires custom hooks, not in openapi.yaml)
- `GET /api/ai/decision/:patientId` — Full AI decision with WHY factors, Digital Twin, behavioral flags
- `GET /api/ai/events/:patientId` — Event bus audit for patient
- `GET /api/ai/audit/:patientId` — Immutable audit log (WHO·WHAT·WHEN·WHY)

### Admin Intelligence
- `GET /api/admin/intelligence` — National AI metrics: epidemic radar, policy insights, disease burden, 9-engine status

### SLA Guarantees
- immediate: ≤ 3 hours | urgent: ≤ 48 hours | soon: ≤ 2 weeks | routine: ≤ 90 days

## Pages & Portals

### Citizen Portal (`/citizen`)
- Health Score + Grade (A–F) computed client-side
- **🧠 My Health Forecast** — Digital Twin 12-month projection, predicted conditions, key drivers
- Prescriptions, Labs, Visit History

### Doctor Portal (`/doctor`)
- Full clinical overview with timeline, medications, labs, visits
- **🧠 Decision Engine** tab — Urgency strip, WHY factors (with impact + contribution), recommendations, Digital Twin, Behavioral AI flags
- **Audit Trail** tab — Immutable WHO·WHAT·WHEN·WHY log
- AI Predictions tab, Risk Analysis tab, Alerts tab

### Emergency Portal (`/emergency`)
- High-speed patient lookup
- **Triage Level Strip** — Color-coded risk level (CRITICAL/HIGH/MEDIUM), risk score, SLA window, AI confidence
- Critical clinical action flow (DO_NOT_GIVE, MONITOR, URGENT_REVIEW, etc.)
- Drug interactions, vitals, allergies, active medications

### Admin Portal (`/admin`)
- Ministry dashboard: KPIs, risk distribution, regional stats, population health charts
- **National AI Intelligence Platform** — 9-engine status grid (live/standby), Epidemic Radar, Policy Insights, national metrics

## Demo Patient IDs
1000000001, 1000000003, 1000000004, 1000000005, 1000000010, 1000000023

## Replit Configuration
- Frontend artifact: `artifacts/sanad/.replit-artifact/artifact.toml` (port 26138)
- API artifact: `artifacts/api-server/.replit-artifact/artifact.toml` (port 8080)
- Environment secrets needed: `DATABASE_URL`
