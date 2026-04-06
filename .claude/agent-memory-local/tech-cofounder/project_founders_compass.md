---
name: Founders Compass Architecture Context
description: TFO Founders Compass app - React+Vite+Express, moving from mock data to PostgreSQL with auth. Multi-tenant advisory platform.
type: project
---

Founders Compass ("The Founders Office") is a capital alignment platform for business advisors managing founder-led business exits.

**Stack:** React 18 + TypeScript + Vite (port 8080) frontend, Express 5 server (port 3001) with Claude AI copilot, deployed on Railway. Shadcn/ui components, TanStack Query, react-router-dom v6.

**Why:** Currently a demo with hardcoded mock data in 4 files. Needs to become a real multi-tenant production app with auth, PostgreSQL DB, and real data entry. DB must be Supabase-migration-compatible.

**How to apply:** All backend work must use standard PostgreSQL (no exotic extensions). Auth is JWT-based, admin-created accounts only. Every API route must be tenant-scoped (advisor sees only their own clients).

**Key data entities:** users, clients (4 mock), assessments (4 types x 25-54 factors each), instruments (8 types), prospects, grow engagements, protection items, tasks/subtasks, documents, risk alerts, deliverables, meetings, quarterly plans/phases, insurance opportunities/referrals.

**Mock data files consuming 30+ components:** mockData.ts, assessmentMockData.ts, journeyMockData.ts, clientMockData.ts. Around 30 component files import directly from these.

**Server files:** server/index.ts (Express + Claude AI chat), server/tools.ts (6 AI tools - currently return fake success strings), server/systemPrompt.ts, server/platformContext.ts.

**Routing:** Landing page at /, AdvisorLayout wraps /advisor/* routes, ClientLayout wraps /client/* routes. ClientProvider context tracks selected client ID.
