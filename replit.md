# SANAD — National AI Health Intelligence Platform v3.0

## Overview
SANAD is a national AI-first health platform for Saudi Arabia. It connects medical records via National IDs and runs a full AI brain with 9 engines, event-driven decisions, Digital Twin projections, and an immutable audit trail. It serves 12+ operator portals.

## Architecture (v3.0 — Event-Driven + AI-First)

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
  src/seed.ts     — Database seeder (50 demo patients + 20 lab results + medications + visits + alerts + 21 historical lab points for trend charts)
```

### Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, Framer Motion, Recharts, Radix UI
- **Backend**: Express 5, TypeScript, pino logging, esbuild
- **Database**: PostgreSQL + Drizzle ORM
- **API Generation**: Orval (OpenAPI → React Query hooks + Zod schemas)
- **Custom Hooks**: `artifacts/sanad/src/hooks/use-ai-decision.ts` for AI endpoints
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

## Database Setup
- PostgreSQL via `DATABASE_URL` environment variable
- Schema pushed with: `pnpm --filter @workspace/db run push-force`
- Seed: `pnpm --filter @workspace/scripts run seed`

### Tables
- `patients` — 50 demo patients (national ID, full name, chronic conditions, allergies, risk score)
- `medications` — drug prescriptions with is_active, drug_name, start_date
- `visits` — clinical visits with visit_type, diagnosis, department
- `lab_results` — lab tests with test_name, result, status (normal/abnormal/critical)
- `alerts` — clinical alerts (drug-interaction, critical-lab, risk-score, predictive, allergy)
- `ai_decisions` — AI decision audit with why_factors, digital_twin_projection, behavioral_flags
- `events` — event bus log for all system actions
- `audit_log` — immutable audit trail (WHO·WHAT·WHEN·WHY)

### DB Compatibility Notes
The patients table has BOTH legacy columns (name_ar, name_en, city) AND new ORM columns (full_name, emergency_contact, etc.).
The new ORM columns (full_name, drug_name, start_date, test_date, result, reference_range) were added and populated from legacy data.
Legacy columns (name_ar, name_en, city, name, prescribed_date, value, normal_range) were made nullable.

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
- **Arabic-English normalization**: Translates Arabic condition names for AI processing

### Original AI Engine (`artifacts/api-server/src/lib/ai-engine.ts`)
- Drug Interaction Check (50+ interactions)
- Prediction Engine (deterioration, complication, adherence)
- Clinical Actions Generator (emergency triage)

## API Endpoints

### Core Routes
- `GET /api/patients/` — List all patients (paginated)
- `GET /api/patients/:id` — Get patient by DB id
- `GET /api/patients/national/:nationalId` — Get patient by National ID (with medications, visits, labs, alerts)
- `GET /api/emergency/:nationalId` — Emergency lookup (with clinical actions, risk level, triage)

### AI Routes
- `GET /api/ai/decision/:patientId` — Full AI decision (risk, urgency, WHY factors, Digital Twin, behavioral flags, recommendations, explainability, SLA deadline)
- `GET /api/ai/risk-score/:patientId` — Quick risk score
- `GET /api/ai/predictions/:patientId` — Clinical predictions
- `POST /api/ai/check-interaction` — Drug interaction check
- `GET /api/ai/events/:patientId` — Event bus audit for patient
- `GET /api/ai/audit/:patientId` — Immutable audit log

### Portal Routes
- `GET /api/lab/patient/:nationalId` — Lab results with AI interpretation (significance, risk impact, trend, action, confidence)
- `POST /api/lab/result` — Submit new lab result
- `GET /api/pharmacy/patient/:nationalId` — Prescriptions with dispense checks + insurance coverage
- `POST /api/pharmacy/dispense/:medicationId` — Dispense medication
- `GET /api/hospital/overview` — Hospital operations, bed management, staff, capacity
- `GET /api/insurance/patient/:nationalId` — Insurance claims + fraud detection
- `GET /api/insurance/dashboard` — Insurance operations dashboard
- `GET /api/ai-control/metrics` — AI engine monitoring, confidence trends, drift detection
- `GET /api/research/data` — Anonymized research data
- `GET /api/family/:nationalId` — Family health linking
- `GET /api/supply-chain/inventory` — Drug supply chain
- `GET /api/admin/stats` — National KPIs (patients, risk distribution, regional stats)
- `GET /api/admin/intelligence` — AI metrics, epidemic radar, disease burden, policy insights

### SLA Guarantees
- immediate: ≤ 3 hours | urgent: ≤ 48 hours | soon: ≤ 2 weeks | routine: ≤ 90 days

## Pages & Portals (12 Total)

### Citizen Portal (`/citizen`)
- Health Score + Grade (A–F) computed client-side
- Digital Twin 12-month projection
- Prescriptions, Labs, Visit History

### Doctor Portal (`/doctor`)
- Full clinical overview with timeline, medications, labs, visits
- Decision Engine tab — Urgency strip, WHY factors, recommendations, Digital Twin, Behavioral AI
- Audit Trail tab — Immutable WHO·WHAT·WHEN·WHY log
- AI Predictions tab, Risk Analysis tab, Alerts tab

### Emergency Portal (`/emergency`)
- High-speed patient lookup by National ID
- Triage Level Strip — Color-coded risk level (CRITICAL/HIGH/MEDIUM), risk score, SLA window
- Critical clinical action flow (DO_NOT_GIVE, MONITOR, URGENT_REVIEW, etc.)
- Drug interactions, vitals, allergies, active medications

### Admin Portal (`/admin`)
- Ministry dashboard: KPIs, risk distribution, regional stats, population health charts
- National AI Intelligence Platform — 9-engine status grid, Epidemic Radar, Policy Insights

### Lab Portal (`/lab`)
- Lab result submission with AI interpretation
- Clinical significance, risk impact, trend, recommended action, confidence score per test

### Pharmacy Portal (`/pharmacy`)
- Drug dispensing with AI safety checks
- Insurance verification per prescription
- Drug interaction detection

### Hospital Portal (`/hospital`)
- Bed management, capacity tracking
- Department operations, staff allocation

### Insurance Portal (`/insurance`)
- Claims processing, fraud detection
- Risk pricing

### AI Control Center (`/ai-control`)
- 9-engine status monitoring
- Model confidence tracking, drift detection
- Decision audit

### Research Portal (`/research`)
- Anonymized population health data
- Clinical study support

### Family Health Portal (`/family`)
- Family member linking
- Genetic risk assessment

### Supply Chain Portal (`/supply-chain`)
- Drug shortage tracking
- Distribution optimization

## Demo Patient IDs
- `1000000001` — Mohammed Al-Qahtani (HIGH RISK, 61yr, diabetes+hypertension+CAD, 5 meds)
- `1000000002` — Fatima Al-Zahrani (LOW RISK, 47yr, hypothyroidism+asthma)
- `1000000003` — Khalid Al-Rashidi (CRITICAL, 70yr, heart failure+CKD+HTN+AFib, multiple critical alerts)
- `1000000005` — Abdullah Al-Dosari (CRITICAL, 80yr, COPD+diabetes+HTN+CKD, 3 active meds)
- `1000000010` — (10th patient, diabetic, microalbuminuria detected)

## Replit Configuration
- Frontend artifact: `artifacts/sanad/.replit-artifact/artifact.toml` (port 26138)
- API artifact: `artifacts/api-server/.replit-artifact/artifact.toml` (port 8080)
- Environment secrets needed: `DATABASE_URL`
