# SANAD — National AI Health Intelligence Platform v4.0

## Overview
SANAD is a national AI-first health platform for Saudi Arabia. It connects medical records via National IDs and runs a full AI brain with 9 engines, event-driven decisions, Digital Twin projections, and an immutable audit trail. It serves 12 operator portals.

## v4.0 — World-Class Visual Intelligence Upgrade (Latest)
New clinical visualizations and AI intelligence displays added across all 12 portals:

1. **Lab Portal** — Reference range gauge bars on every test result row: parses "3.5–5.0", "<5", ">40" format ranges; renders animated marker showing where the result falls; green zone = normal range; colored dot (red/amber/green) tracks status
2. **Hospital Portal** — Live Bed Map grid visualization: each bed shown as a 14×14px colored square (red=critical, amber=high-risk, blue=stable, grey=available); row per ward with occupancy% label; instant visual capacity assessment
3. **Doctor Portal** — Drug-Drug Interaction Matrix: NxN grid of all active medications; color-coded cells (CRIT/HIGH/MOD/SAFE); diagonal=self; matches active medications against `medMatrixData.interactions`; legend with 4 severity colors
4. **AI Control Portal** — AI Decision Cascade Flow Diagram: horizontal scrollable node chain showing all 7 cascade steps (Lab→Risk Engine→Doctor→Insurance→Supply Chain→Family→Research); portal icon + latency + action badge; summary bar showing 234ms total cascade
5. **Family Portal** — SVG Clinical Pedigree Diagram: proper clinical pedigree with circle nodes per member; color-coded by risk score (red/amber/green); connecting lines between generations (P1/P2/P3); dashed ring around index patient; risk score label inside each node; legend at bottom
6. **Research Portal** — Statistical bar visualizations in hypothesis cards: correlation r shown as filled bar (0–1 scale); p-value significance as 5-segment bar (more filled = more significant); confidence % bar; study design label added to sample size box
7. **Admin Portal** — KSA Regional Health Intelligence Map: grid of 13-region cards (4-col grid); each card shows coverage %, hospital count, patient count, high-risk flag; colored left border + background glow by coverage tier (green/amber/red)
8. **Doctor Portal (cont.)** — AI SOAP Note Generator (📝 Note tab): auto-generates full MOH-formatted clinical note with S/O/A/P sections, Copy + Print buttons (from prior session)
9. **Emergency Portal** — Protocol Activation Mode: live MM:SS countdown, checkable steps, animated ACTIVE badge (from prior session)
10. **Citizen Portal** — SVG Animated Health Ring: dark theme 160×160 animated arc, grade zones F-A, 4-KPI strip, score breakdown (from prior session)
11. **Admin Portal** — National Policy Simulator: HbA1c/reach sliders → real-time SAR savings, MACE prevented, QALYs (from prior session)

## v3.8 — Full Assessment Implementation
All 12 assessment points from colleague technical review fully implemented:
1. **Entry/Auth** — Nafath SSO + OAuth2 button, 3-step login (role → credentials → PDPL consent), session context via AuthProvider, all requests carry x-user-role identity header
2. **Emergency** — Life-critical 2-second priority strip (blood type 42px, allergies, top action, risk/SLA), ACLS-CA/ACLS-ACS/MOH-SEP/MOH-STROKE protocol engine with step-by-step action buttons, data freshness timestamp, offline-first detection (navigator.onLine + window events) with dismissible offline banner and always-visible online/offline pill
3. **Doctor Portal** — Clinical risk format (RISK/WHY/ACTION compact CDS block), WHY factors with contribution bars, decision path with NICE/WHO/ADA guideline binding, differential diagnosis engine (ICD-10 + evidence), AI pattern detection engine (longitudinal trend analysis: HbA1c rising/falling, creatinine trajectory, visit frequency anomaly, care gap detection, Digital Twin forecast), cross-lab correlation engine
4. **Medication System** — Full DRUG_DB (12 drugs), Cockcroft-Gault eGFR calculation, dose validation with severity levels, renal/age contraindication warnings, ADA/ESC/KDIGO guideline links
5. **Timeline** — Trend arrows (↑↓→) on every lab event, AI pattern detection with longitudinal insights and 3-month forecasts, cross-lab anomaly detection
6. **AI System** — Rule-based decision engine (decision-engine.ts), explainability layer (whyFactors + clinicalBasis + confidence + uncertaintyNote), learning loop (accept/reject feedback with MOH Circular 42/1445 reference), Digital Twin projection, XAI display
7. **Citizen** — Health score, behavior-change nudge engine (personalised by chronic conditions: diabetes, HTN, CKD), smart preventive reminders (HbA1c, BP, ophthalmology, medication refill), AI risk awareness panel
8. **Admin/Gov** — National KPIs, regional risk heatmap, hospital league table, national benchmarking (vs national avg + top-quartile), improvement priority actions
9. **Security** — PDPL Article 12 + NDMO + ISO 27001 + HIPAA + NCA compliance panel, AES-256 + TLS 1.3 encryption panel, audit log statistics (4.28M events/month, 100% PHI coverage, SHA-256 chain)
10. **FHIR/Data Layer** — FHIR R4 resource coverage panel (8 resources: Patient 100%, Observation 100%, MedicationRequest 98%…), data lineage chain (Source → HL7 transform → normalization → AI engine → audit ledger), lineage KPIs
11. **System Core** — SSE event stream health panel (48K connections, < 80ms latency, 99.98% uptime), async processing queue (128 workers, 8,400 jobs/min), AI inference engine stats, microservices health dashboard (7 services)
12. **Scalability** — Redis/CDN/DB cache hit rates, latency P50/P99 SLA compliance, load balancer config (Least-conn, AWS ALB), multi-region active-active (Riyadh ↔ Jeddah), concurrent user metrics

## v3.6 — Deep Audit + UX Overhaul
1. **Home page complete redesign** — Was a confusing copy of the login page (same portal grid). Now a true dark navy landing page: big "The intelligence layer for Saudi Healthcare" hero headline with gradient text, stats strip (34.2M+, 450+, 847K, SAR 4.7B), portals overview grid, feature highlights (6 cards), and a CTA section — all pointing to "Access SANAD Platform →" (goes to /login). Login page now has its own distinct identity: light, auth-focused.
2. **API 403 spam fixed** — Layout was calling `/api/alerts/system` for ALL roles, but lab/pharmacy/hospital/insurance/ai-control/research/family/supply-chain lacked `/api/alerts` permission → constant 403 errors. Fixed: added `/api/alerts` to all 12 role permission sets.
3. **Bottom action bar overhauled** — Removed 3 non-functional dead buttons (Live Feed, +, Settings). New bar shows: portal identity pill (icon + name + job title) + Dashboard link + live clock + Sign Out. Every element is now functional.
4. **Non-functional search bar removed** — The header search bar searched nothing. Removed entirely from the layout. Clean header now has: logo + nav links | All Systems Live + bell + user avatar.
5. **Emergency portal UX** — Demo patient IDs now shown as clickable button chips (not tiny inline text). Added clear note "enter patient National ID, not responder ID" to prevent the confusion of entering SRCA-07-RYD (responder ID) vs 1000000001 (patient ID).

## v3.5 — Design System Full Purge + Component Upgrade
1. **Zero forbidden bg classes** — Final global elimination of ALL forbidden Tailwind bg/border classes across every file: `shared.tsx`, `layout.tsx`, `login.tsx`, `home.tsx`, `App.tsx`, `admin.tsx`, `ai-control.tsx`. Final scan confirms zero violations across all 12 portals.
2. **Clearance badge system** — Replaced all `bg-*-100` clearance badges with elegant colored-dot + neutral bg pattern: `bg-secondary` + `text-*-700` + 5px solid colored dot. Applied across login, home, App.tsx consent gate.
3. **Badge component redesign** — All 7 Badge variants (default, info, success, warning, destructive, outline, purple) now use `bg-secondary` base + colored text + semantic dot instead of forbidden colored backgrounds.
4. **AlertBanner redesign** — All 3 variants (warning, destructive, info) now use `bg-secondary` + `borderLeft` hex inline style + semantic dot — no forbidden classes.
5. **KpiCard trend badge** — Upgraded from `bg-red-50`/`bg-emerald-50` to `bg-secondary` + colored dot + colored text.
6. **LiveChip** — Changed from `bg-emerald-50` to `bg-secondary`.
7. **Layout** — Alert dropdown: icon backgrounds changed from `bg-red-100`/`bg-amber-100`/`bg-blue-100` to `bg-secondary`; unread row from `bg-blue-50/50` to `bg-primary/[0.03]`; sign-out hover from `hover:bg-red-50` to `hover:bg-secondary`.
8. **New shared components** — Added `EmptyState` (icon + title + description + action) and `StatRow` (horizontal stats strip) to the shared component library.
9. **Improved CardBody/CardHeader padding** — Increased from `p-5` to `p-6` for more breathing room across all cards.

## v3.4 — Doctor Portal iOS Design Overhaul
1. **Patient Identity Card** — Completely redesigned: red full-width allergy alert strip at card top (matching Emergency portal), larger bold patient name (text-2xl), clean data pills row (blood type in red, AI risk score with color-coded badge, first 2 chronic conditions + count)
2. **AI Priority Strip** — Changed from solid-colored buttons to clean white cards with colored icon squares (left-border accent style), better typography hierarchy
3. **Empty State** — Premium stethoscope icon card with larger typography and cleaner demo ID bar
4. **LACE+ & Cross-Portal Cards** — Removed colored borders (border-2 border-amber/purple), now clean standard card borders
5. **Emoji Cleanup** — Replaced ⚠ text in medication badges and uncertainty notes with TriangleAlert Lucide icon; removed ✓ from treatment simulation

## v3.3 — Premium Apple/iOS Design Overhaul
1. **Home Page** — Complete redesign: premium deep-blue hero card spanning full width with live stats (34.2M+, 450+, SAR 4.7B, 847K), 4×3 uniform portal grid (all 12 portals equal size), security clearance badges (PUBLIC/RESTRICTED/CONFIDENTIAL/SECRET), clean footer. No more uneven 4+3+5 grid.
2. **Emoji-free UI** — All emoji removed from every portal: citizen.tsx tabs, doctor.tsx tabs & alert badges, hospital.tsx staff/recommendations, admin.tsx compliance cards, emergency.tsx header, ai-control.tsx cascade indicator, supply-chain.tsx seasonal headers, citizen.tsx health achievements (replaced with Lucide icons)
3. **Design System** — Better CSS: Apple-inspired background (hsl(220 14% 96%)), thinner scrollbar, smoother data-table, card hover lift animation, refined transitions
4. **Shared Components** — Tabs now support icon prop (React.ElementType), KpiCard has trendUp prop, new SectionDivider component, more refined spacing and typography
5. **Layout** — Cleaner sidebar (216px, better typography, accent-colored active state), improved topbar with breadcrumb navigation, refined alert dropdown with better empty state

## v3.2 — SANAD Neural Fabric: Full Cross-Portal Integration
1. **AI Control → "Neural Fabric" tab** — Visual cascade chain showing how a single patient event (HbA1c 9.2%) triggers 7 portals in 234ms. Cross-portal 8x8 dependency matrix. Portal ecosystem cards (sends/receives data).
2. **AI Control → "Live Intelligence Stream" tab** — Real-time auto-updating feed of AI decisions from all portals (new event every 2.8s). Portal activity heatmap. Live KPIs (847 events/min, 2,841 cascades/hour, 2.8s decision time).
3. **Doctor → Cross-Portal Intelligence Panel** — After LACE+ card: shows Insurance coverage for current meds, Supply Chain drug availability, Research trial eligibility (3 active trials), Family genetic risk cascade (3 family members).
4. **Citizen → "Health Journey" tab (🔗)** — Integrated timeline merging ALL portal events chronologically (visits + labs + prescriptions + insurance claims + AI detections + family cascades + supply alerts). Cross-portal stats (7 portals involved, 14 cascade events, SAR 12,400 AI savings).

## v3.1 — 5 New AI Features Added
1. **Research → AI Hypothesis Generator** (6th tab) — 7 auto-generated evidence-grade research hypotheses from 34M patient records with n, correlation r, p-value, clinical impact score, and IRB-ready protocol export
2. **Supply Chain → Ramadan & Hajj Seasonal Surge Planner** (5th tab) — Saudi-specific demand surge forecasting for Ramadan fasting (DM/HTN patients) and Hajj pilgrimage (2.5M pilgrims, heat stroke meds, meningococcal vaccines), with procurement gap tracker
3. **Insurance → AI Pre-Authorization Engine** (4th tab) — Real-time clinical necessity scoring (0-100), guideline alignment (ADA/ESC/KDIGO), fraud detection, auto-approve/flag/deny with AI clinical reasoning and alternatives
4. **Doctor → 30-Day Readmission Risk (LACE+ Score)** — Calculates LACE+ score from patient data (L=visits, A=age, C=comorbidities, E=ED visits), 6 AI prevention interventions, discharge optimization recommendations, national benchmark comparison
5. **Admin → National AI Clinical Impact Tracker** — 2.84M lives impacted, SAR 4.7B saved, AI outcomes by month (chart), portal adoption rates, 3 detailed impact categories

## Auth / Identity System
- `artifacts/sanad/src/contexts/auth-context.tsx` — AuthProvider + localStorage persistence + fetch patching to inject `x-user-role` header on all `/api` calls
- `artifacts/sanad/src/pages/login.tsx` — Two-step government SSO login: Step 1 = role selection grid with clearance badges (PUBLIC/RESTRICTED/CONFIDENTIAL/SECRET); Step 2 = credential entry (pre-filled demo Employee ID + SANAD@2025)
- `artifacts/sanad/src/App.tsx` — ProtectedRoute redirects unauthenticated users to `/login`
- Demo credentials: all roles use password `SANAD@2025` with unique employeeId per role

## SSE Real-Time Alerts
- `artifacts/sanad/src/hooks/use-sse-alerts.ts` — `useSseAlerts(role)` hook
- SSE covers ALL 12 portals with role-appropriate color themes and quick-actions

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
- Lab trend charts — HbA1c, Glucose, Creatinine (12-month sparklines via Recharts)
- Real-time SSE notifications: lab_alert (critical/abnormal labs), drug_interaction_alert, risk_escalation
- Receives risk_escalation when emergency portal scans high/critical patient or when AI flags urgency

### Emergency Portal (`/emergency`)
- High-speed patient lookup by National ID
- Triage Level Strip — Color-coded risk level (CRITICAL/HIGH/MEDIUM), risk score, SLA window
- Critical clinical action flow (DO_NOT_GIVE, MONITOR, URGENT_REVIEW, etc.)
- Drug interactions, vitals, allergies, active medications
- Scanning a HIGH/CRITICAL patient broadcasts risk_escalation SSE event to all logged-in doctors

### Admin Portal (`/admin`)
- Ministry dashboard: KPIs, risk distribution, regional stats, population health charts
- National AI Intelligence Platform — 9-engine status grid, Epidemic Radar, Policy Insights

### Lab Portal (`/lab`)
- Lab result submission with AI interpretation
- Clinical significance, risk impact, trend, recommended action, confidence score per test

### Pharmacy Portal (`/pharmacy`)
- Drug dispensing with AI safety checks
- Insurance verification per prescription
- Drug interaction detection with clinical references
- Real-time drug interaction alerts via SSE (live bell notification)
- Supply chain stock availability badge per prescription (critical/low/adequate status)

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
