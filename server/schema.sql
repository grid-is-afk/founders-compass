CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Users (advisors)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'advisor' CHECK (role IN ('advisor', 'admin', 'client', 'licensee')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration: widen the role CHECK to include 'licensee' (CEPA/advisor portal user).
-- Existing installs were created with the 3-role constraint, so re-create it idempotently.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('advisor', 'admin', 'client', 'licensee'));

-- Migration: licensee subscription tier (billing deferred — set manually for the beta cohort).
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_tier TEXT CHECK (plan_tier IN ('starter', 'growth', 'scale'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS firm_name TEXT;

-- ============================================================
-- Clients
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  contact_name        TEXT,
  contact_email       TEXT,
  revenue             TEXT,
  stage               TEXT DEFAULT 'Q1 — Discover',
  current_quarter     INT NOT NULL DEFAULT 1,
  current_year        INT NOT NULL DEFAULT 2026,
  capital_readiness   INT DEFAULT 0 CHECK (capital_readiness >= 0 AND capital_readiness <= 100),
  customer_capital    INT DEFAULT 0 CHECK (customer_capital >= 0 AND customer_capital <= 100),
  performance_score   INT DEFAULT 0 CHECK (performance_score >= 0 AND performance_score <= 100),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration: add user_id column to existing clients tables
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Migration: soft-delete (archive) support
ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
-- Migration: track whether portal invite email was sent
ALTER TABLE clients ADD COLUMN IF NOT EXISTS portal_invite_sent BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_clients_advisor ON clients(advisor_id);

-- ============================================================
-- Assessments
-- ============================================================
CREATE TABLE IF NOT EXISTS assessments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type           TEXT NOT NULL,
  completed_date DATE,
  last_modified  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessments_client ON assessments(client_id);

CREATE TABLE IF NOT EXISTS assessment_factors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  factor_name    TEXT NOT NULL,
  category       TEXT,
  score          INT CHECK (score >= 0 AND score <= 10),
  rating         TEXT,
  considerations TEXT,
  sort_order     INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_assessment_factors_assessment ON assessment_factors(assessment_id);

-- ============================================================
-- Instruments
-- ============================================================
CREATE TABLE IF NOT EXISTS instruments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type           TEXT NOT NULL,
  name           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete', 'not_applicable')),
  completed_date DATE,
  linked_phase   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instruments_client ON instruments(client_id);

-- ============================================================
-- Tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  assignee   TEXT,
  status     TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  priority   TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date   DATE,
  phase      TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);

CREATE TABLE IF NOT EXISTS subtasks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  done       BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);

-- ============================================================
-- Prospects
-- ============================================================
CREATE TABLE IF NOT EXISTS prospects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  contact      TEXT,
  company      TEXT,
  revenue      TEXT,
  source       TEXT,
  status       TEXT NOT NULL DEFAULT 'intake' CHECK (status IN ('intake', 'discovery_scheduled', 'discovery_complete', 'fit_assessment', 'not_fit', 'fit', 'onboarding', 'nurture_call', 'kept_in_loop', 'flagged_follow_up')),
  fit_score    INT CHECK (fit_score >= 0 AND fit_score <= 100),
  fit_decision TEXT CHECK (fit_decision IN ('fit', 'no_fit')),
  notes        TEXT,
  date         DATE DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospects_advisor ON prospects(advisor_id);

-- ============================================================
-- Documents
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT,
  subfolder   TEXT,
  file_url    TEXT,
  size        TEXT,
  type        TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);

-- Migration: link documents back to the originating deliverable (one row per deliverable)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deliverable_id UUID
  REFERENCES deliverables(id) ON DELETE CASCADE;
-- Migration: track when a document was last modified (separate from uploaded_at)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_deliverable
  ON documents(deliverable_id) WHERE deliverable_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_deliverable
  ON documents(deliverable_id);

-- ============================================================
-- Protection items
-- ============================================================
CREATE TABLE IF NOT EXISTS protection_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category       TEXT NOT NULL,
  label          TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'review' CHECK (status IN ('active', 'review', 'gap', 'not_applicable')),
  risk           TEXT CHECK (risk IN ('low', 'medium', 'high', null)),
  recommendation TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protection_client ON protection_items(client_id);

-- ============================================================
-- Grow engagements
-- ============================================================
CREATE TABLE IF NOT EXISTS grow_engagements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  capital_type          TEXT,
  label                 TEXT NOT NULL,
  partner               TEXT,
  status                TEXT NOT NULL DEFAULT 'exploring' CHECK (status IN ('exploring', 'active', 'completed', 'paused')),
  adopted_from_template BOOLEAN NOT NULL DEFAULT FALSE,
  task_count            INT NOT NULL DEFAULT 0,
  completed_tasks       INT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grow_client ON grow_engagements(client_id);

-- ============================================================
-- Risk alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  detail      TEXT,
  severity    TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved    BOOLEAN NOT NULL DEFAULT FALSE,
  source_id   UUID,
  source_type TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE risk_alerts ADD COLUMN IF NOT EXISTS source_id   UUID;
  ALTER TABLE risk_alerts ADD COLUMN IF NOT EXISTS source_type TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_risk_alerts_client ON risk_alerts(client_id);

-- ============================================================
-- Deliverables
-- ============================================================
CREATE TABLE IF NOT EXISTS deliverables (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete', 'ready')),
  engine     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliverables_client ON deliverables(client_id);

-- Migrations: deliverables additional columns
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS review_status TEXT;
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS content TEXT;

-- ============================================================
-- Meetings
-- ============================================================
CREATE TABLE IF NOT EXISTS meetings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type       TEXT,
  date       TIMESTAMPTZ,
  notes      TEXT,
  status     TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_client ON meetings(client_id);

-- ============================================================
-- Quarterly plans
-- ============================================================
CREATE TABLE IF NOT EXISTS quarterly_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  quarter     INT NOT NULL,
  year        INT NOT NULL,
  label       TEXT,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'complete')),
  review_date DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quarterly_plans_client ON quarterly_plans(client_id);

CREATE TABLE IF NOT EXISTS quarterly_phases (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id          UUID NOT NULL REFERENCES quarterly_plans(id) ON DELETE CASCADE,
  phase            TEXT NOT NULL,
  label            TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete')),
  completed_tasks  INT NOT NULL DEFAULT 0,
  total_tasks      INT NOT NULL DEFAULT 0,
  sort_order       INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_quarterly_phases_plan ON quarterly_phases(plan_id);

-- ============================================================
-- Activity log
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID REFERENCES clients(id) ON DELETE SET NULL,
  advisor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_advisor ON activity_log(advisor_id);
CREATE INDEX IF NOT EXISTS idx_activity_client ON activity_log(client_id);

-- ============================================================
-- Migrations for existing databases
-- ============================================================

-- Fix prospects status constraint (was wrong values)
DO $$ BEGIN
  ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_status_check;
  ALTER TABLE prospects ADD CONSTRAINT prospects_status_check
    CHECK (status IN ('intake', 'discovery_scheduled', 'discovery_complete', 'fit_assessment', 'not_fit', 'fit', 'onboarding'));
  ALTER TABLE prospects ALTER COLUMN status SET DEFAULT 'intake';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Fix prospects fit_decision constraint
DO $$ BEGIN
  ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_fit_decision_check;
  ALTER TABLE prospects ADD CONSTRAINT prospects_fit_decision_check
    CHECK (fit_decision IN ('fit', 'no_fit'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add user_id column to clients if missing
DO $$ BEGIN
  ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add uploaded_by_role to documents (tracks advisor vs client uploads)
DO $$ BEGIN
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by_role TEXT NOT NULL DEFAULT 'advisor';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add size_bytes to documents (numeric bytes for 50MB cap enforcement)
DO $$ BEGIN
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS size_bytes BIGINT NOT NULL DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- Prospect Pipeline Redesign — new statuses + exposure index
-- ============================================================

-- Expand prospect status constraint to include off-pipeline statuses
DO $$ BEGIN
  ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_status_check;
  ALTER TABLE prospects ADD CONSTRAINT prospects_status_check
    CHECK (status IN (
      'intake', 'discovery_scheduled', 'discovery_complete',
      'fit_assessment', 'not_fit', 'fit', 'onboarding',
      'nurture_call', 'kept_in_loop', 'flagged_follow_up'
    ));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Founder Exposure Index™ assessment table
CREATE TABLE IF NOT EXISTS prospect_exposure_index (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id     UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  advisor_id      UUID NOT NULL REFERENCES users(id),
  responses       JSONB NOT NULL DEFAULT '{}',
  category_scores JSONB,
  ai_summary      TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exposure_index_prospect ON prospect_exposure_index(prospect_id);
CREATE INDEX IF NOT EXISTS idx_exposure_index_advisor  ON prospect_exposure_index(advisor_id);

-- Six C's Framework™ assessment table
CREATE TABLE IF NOT EXISTS prospect_six_cs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id  UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  advisor_id   UUID NOT NULL REFERENCES users(id),
  scores       JSONB NOT NULL DEFAULT '{}',
  total_score  INT,
  notes        TEXT,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_six_cs_prospect ON prospect_six_cs(prospect_id);
CREATE INDEX IF NOT EXISTS idx_six_cs_advisor  ON prospect_six_cs(advisor_id);

-- ============================================================
-- Q1 Discover Phase — Client Workspace
-- ============================================================

-- Client-scoped Exposure Index
CREATE TABLE IF NOT EXISTS client_exposure_index (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  advisor_id      UUID NOT NULL REFERENCES users(id),
  responses       JSONB NOT NULL DEFAULT '{}',
  category_scores JSONB,
  ai_summary      TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_exposure_index ON client_exposure_index(client_id);

-- Founder Matrix (Corp or LLC intake)
CREATE TABLE IF NOT EXISTS client_founder_matrix (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  advisor_id   UUID NOT NULL REFERENCES users(id),
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('corp', 'llc')),
  responses    JSONB NOT NULL DEFAULT '{}',
  ai_summary   TEXT,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_founder_matrix ON client_founder_matrix(client_id);

-- Founder Snapshot (5 dimensions)
CREATE TABLE IF NOT EXISTS client_founder_snapshot (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  advisor_id   UUID NOT NULL REFERENCES users(id),
  responses    JSONB NOT NULL DEFAULT '{}',
  ai_summary   TEXT,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_founder_snapshot ON client_founder_snapshot(client_id);

-- Founder's Optionality Framework (3 conditions)
CREATE TABLE IF NOT EXISTS client_optionality_framework (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  advisor_id   UUID NOT NULL REFERENCES users(id),
  responses    JSONB NOT NULL DEFAULT '{}',
  ai_summary   TEXT,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_optionality_framework ON client_optionality_framework(client_id);

-- Phase duration config (configurable without code changes)
CREATE TABLE IF NOT EXISTS q1_phase_config (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase     TEXT NOT NULL UNIQUE,
  day_start INT NOT NULL,
  day_end   INT NOT NULL,
  label     TEXT NOT NULL
);
INSERT INTO q1_phase_config (phase, day_start, day_end, label) VALUES
  ('kickoff',         1,   7,  'Project Kickoff'),
  ('prove',           8,  28,  'Prove'),
  ('diagnose',       29,  49,  'Diagnose'),
  ('design_tfo',     50,  70,  'Design TFO'),
  ('design_outside', 71,  87,  'Design (outside TFO)'),
  ('review',         88,  90,  'Review & Wrap')
ON CONFLICT (phase) DO NOTHING;

-- Migrations for existing clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS entity_type TEXT CHECK (entity_type IN ('corp', 'llc'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS q1_phase TEXT DEFAULT 'kickoff';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS source_prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

-- Add q1_phase and entity_type to ALLOWED_COLUMNS via migration note (update server/routes/clients.ts separately)
-- These columns are updatable via PATCH /api/clients/:id

-- ============================================================
-- Client Dashboard — Six Keys, Capital Optionality, Multiples, IPD
-- ============================================================

CREATE TABLE IF NOT EXISTS client_six_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  advisor_id  UUID NOT NULL REFERENCES users(id),
  clarity     INT CHECK (clarity >= 0 AND clarity <= 100),
  alignment   INT CHECK (alignment >= 0 AND alignment <= 100),
  structure   INT CHECK (structure >= 0 AND structure <= 100),
  stewardship INT CHECK (stewardship >= 0 AND stewardship <= 100),
  velocity    INT CHECK (velocity >= 0 AND velocity <= 100),
  legacy      INT CHECK (legacy >= 0 AND legacy <= 100),
  notes       TEXT,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_six_keys ON client_six_keys(client_id);

CREATE TABLE IF NOT EXISTS client_capital_optionality (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  advisor_id           UUID NOT NULL REFERENCES users(id),
  minority_recap_pct   INT DEFAULT 0 CHECK (minority_recap_pct >= 0 AND minority_recap_pct <= 100),
  minority_recap_label TEXT DEFAULT 'Explore',
  strategic_acq_pct    INT DEFAULT 0 CHECK (strategic_acq_pct >= 0 AND strategic_acq_pct <= 100),
  strategic_acq_label  TEXT DEFAULT 'Explore',
  esop_pct             INT DEFAULT 0 CHECK (esop_pct >= 0 AND esop_pct <= 100),
  esop_label           TEXT DEFAULT 'Explore',
  full_exit_pct        INT DEFAULT 0 CHECK (full_exit_pct >= 0 AND full_exit_pct <= 100),
  full_exit_label      TEXT DEFAULT 'Explore',
  notes                TEXT,
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_capital_optionality ON client_capital_optionality(client_id);

CREATE TABLE IF NOT EXISTS client_multiples (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  advisor_id       UUID NOT NULL REFERENCES users(id),
  initial_multiple NUMERIC(10,2),
  current_multiple NUMERIC(10,2),
  best_in_class    NUMERIC(10,2),
  goal_multiple    NUMERIC(10,2),
  notes            TEXT,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_multiples ON client_multiples(client_id);

CREATE TABLE IF NOT EXISTS client_ipd_metrics (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                 UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  persuasiveness_of_problem NUMERIC(4,2),
  confidence_in_solution    NUMERIC(4,2),
  combined_index            NUMERIC(4,2),
  probability_label         TEXT,
  problem_axes              JSONB,
  solution_axes             JSONB,
  generated_from_data_room  BOOLEAN DEFAULT FALSE,
  last_generated_at         TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_ipd_metrics ON client_ipd_metrics(client_id);

-- ============================================================
-- Client-level Six C's (for clients who skipped prospect phase)
-- ============================================================

CREATE TABLE IF NOT EXISTS client_six_cs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  advisor_id   UUID NOT NULL REFERENCES users(id),
  scores       JSONB NOT NULL DEFAULT '{}',
  total_score  INT,
  notes        TEXT,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_six_cs ON client_six_cs(client_id);

-- ============================================================
-- Document linking on tasks (file mapped to checklist item)
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- ============================================================
-- Skip reason on tasks (checklist item skipped with required note)
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS skip_reason TEXT;

-- ============================================================
-- Prospect Data Room — documents now support prospect ownership
-- ============================================================

ALTER TABLE documents ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_documents_prospect ON documents(prospect_id);

-- ============================================================
-- Advisor notifications (client-triggered actions)
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id  UUID REFERENCES clients(id) ON DELETE SET NULL,
  type       TEXT NOT NULL,
  message    TEXT NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_advisor ON notifications(advisor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(advisor_id, read) WHERE read = FALSE;

-- ============================================================
-- Task assignee linked to TFO team members
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);

-- ============================================================
-- Chapter 2: Grow Phase
-- ============================================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS q2_phase TEXT DEFAULT 'prove';

CREATE TABLE IF NOT EXISTS client_six_cs_reconcile (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  advisor_id   UUID NOT NULL REFERENCES users(id),
  findings     JSONB NOT NULL DEFAULT '[]',
  summary      TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_six_cs_reconcile ON client_six_cs_reconcile(client_id);

CREATE TABLE IF NOT EXISTS client_ip_value_framework (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  advisor_id      UUID NOT NULL REFERENCES users(id),
  ip_type         TEXT,
  ip_status       TEXT,
  valuation_basis TEXT,
  notes           TEXT,
  ai_summary      TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_ip_value_framework ON client_ip_value_framework(client_id);

-- ============================================================
-- Chapter 3: Strengthen Phase
-- ============================================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS q3_phase TEXT DEFAULT 'prove';

-- Distinguish Q2 vs Q3 grow engagements (default 2 = existing Q2 data)
ALTER TABLE grow_engagements ADD COLUMN IF NOT EXISTS chapter INT NOT NULL DEFAULT 2;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS q4_phase TEXT DEFAULT 'prove';

-- ============================================================
-- Client Visibility — per-user "See all" vs "Own clients only"
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS see_all_clients BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- Subfolder support on documents
-- ============================================================

ALTER TABLE documents ADD COLUMN IF NOT EXISTS subfolder TEXT;

-- ============================================================
-- Nurture Call Scheduling — date/time picker on off-pipeline view
-- ============================================================

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS nurture_call_date TIMESTAMPTZ;

-- ============================================================
-- Data Room Folders — explicit folder creation without requiring a document
-- ============================================================

CREATE TABLE IF NOT EXISTS data_room_folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, category, name)
);

-- ============================================================
-- UC-07: Quarterly plan start date — canonical chapter start
-- ============================================================

ALTER TABLE quarterly_plans ADD COLUMN IF NOT EXISTS start_date DATE;

-- One quarterly plan per (client, quarter, year). Makes upserts deterministic
-- and protects against race conditions in syncQ1PlanStartDate.
CREATE UNIQUE INDEX IF NOT EXISTS uq_quarterly_plans_client_quarter_year
  ON quarterly_plans(client_id, quarter, year);

-- ============================================================
-- Soft-delete / archive support for deliverables + documents
-- ============================================================
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_deliverables_archived
  ON deliverables(client_id, archived_at);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_documents_archived
  ON documents(client_id, archived_at);

-- ============================================================
-- Deliverable audit trail: stable generation timestamp + approver
-- ============================================================
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ;
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS approved_by  UUID
  REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- UC-07: Quarterly objectives (structured persistence)
-- The Q-objectives a founder commits to at the quarterly review.
-- Captured BOTH ways: AI-extracted from the review-prep doc
-- (status 'proposed', source 'extracted') and advisor-entered/confirmed
-- (source 'advisor'). Unblocks UC-08 (workplan maintenance) and the
-- UC-11 orphan-objective rule.
-- ============================================================
CREATE TABLE IF NOT EXISTS quarterly_objectives (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  -- Next quarter's plan often doesn't exist yet, so quarter/year are stored
  -- directly; plan_id is backfilled when the plan is created.
  plan_id     UUID REFERENCES quarterly_plans(id) ON DELETE SET NULL,
  quarter     INT NOT NULL,
  year        INT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'proposed'
                CHECK (status IN ('proposed', 'confirmed', 'achieved', 'dropped')),
  source      TEXT NOT NULL DEFAULT 'advisor'
                CHECK (source IN ('extracted', 'advisor')),
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quarterly_objectives_client
  ON quarterly_objectives(client_id, year, quarter);

-- Link supporting tasks to an objective so UC-11 can detect objectives
-- that have no supporting tasks (orphan-objective rule).
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS objective_id UUID
  REFERENCES quarterly_objectives(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_objective ON tasks(objective_id);

-- Third review-status stage: 'client_approved' (the founder has agreed). This
-- is the transition that promotes a review-prep's objectives to 'confirmed'.
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS client_approved_at TIMESTAMPTZ;

-- An older migration left a CHECK constraint allowing only pending_review/approved,
-- which rejected the new 'client_approved' stage. Widen it to all three stages.
DO $$ BEGIN
  ALTER TABLE deliverables DROP CONSTRAINT IF EXISTS deliverables_review_status_check;
  ALTER TABLE deliverables ADD CONSTRAINT deliverables_review_status_check
    CHECK (review_status IN ('pending_review', 'approved', 'client_approved'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- UC-11: Drift detection — advisor flag + deliverable promise date
-- Powers two new risk rules in server/routes/riskScan.ts:
--   • advisor-flagged engagement  (clients.flagged_at / flagged_reason)
--   • missed deliverable promise  (deliverables.due_date)
-- Additive, idempotent — picked up by the boot self-migration (index.ts).
-- ============================================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS flagged_at     TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS flagged_reason TEXT;

ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS due_date DATE;

-- ============================================================
-- Fix: risk_alerts.severity vocabulary mismatch.
-- The original CHECK (line ~215) allowed low/medium/high/critical, but the risk
-- scanner (server/routes/riskScan.ts) and the Risk Alerts UI standardized on
-- critical/warning/info. Every 'warning'/'info' detection (e.g. an overdue task
-- under 21 days) was rejected, aborting the scan mid-insert and leaving alerts
-- partially written. Widen to the UNION so legacy rows AND current code validate.
-- ============================================================
DO $$ BEGIN
  ALTER TABLE risk_alerts DROP CONSTRAINT IF EXISTS risk_alerts_severity_check;
  ALTER TABLE risk_alerts ADD CONSTRAINT risk_alerts_severity_check
    CHECK (severity IN ('low', 'medium', 'high', 'critical', 'warning', 'info'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- Quarter lock: the moment the founder approved the quarter's plan (set when a
-- "Qn Review Prep" deliverable hits client_approved — see server/routes/
-- deliverables.ts). Becomes the scope-creep baseline: tasks/objectives created
-- after locked_at are flagged by the risk scanner. Additive, idempotent.
-- ============================================================
ALTER TABLE quarterly_plans ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- ============================================================
-- UC-13: Cross-engagement pattern recognition ("Firm Insights")
-- Firm-level patterns surfaced across ALL engagements: what's working, what
-- consistently blocks progress, and where the methodology is strongest/weakest.
-- Numbers are computed deterministically in SQL (server/routes/firmInsights.ts);
-- the narrative is written by Claude from those pre-computed aggregates only.
-- TFO-only: gated to advisor/admin (never the client role) at the route layer.
--   • category  — which of the four spec buckets this insight belongs to
--   • metrics   — the computed aggregates the narrative is grounded in (audit)
--   • engagements_referenced — client ids cited as internal evidence (Katie:
--     drafts may reference specific engagement ids; the UI shows their names)
--   • status    — draft → approved | dismissed. A re-scan replaces only drafts;
--     approved/dismissed rows survive so human decisions are never lost.
-- ============================================================
CREATE TABLE IF NOT EXISTS firm_insights (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category               TEXT NOT NULL CHECK (category IN ('working', 'blocker', 'strength', 'weakness')),
  title                  TEXT NOT NULL,
  narrative              TEXT NOT NULL,
  metrics                JSONB,
  engagements_referenced UUID[] NOT NULL DEFAULT '{}',
  status                 TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'dismissed')),
  generated_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firm_insights_status ON firm_insights(status);

-- ============================================================
-- UC-04: Cross-channel communication synthesis
--
-- Two tables behind a clean "adapter seam":
--   • communication_events — ONE normalized row per communication, whatever the
--     channel. Each channel adapter (meetings now; gmail → zoom → whatsapp once
--     Aakash provisions creds) only translates its source INTO this shape; the
--     synthesis engine reads only this table and never knows a channel exists.
--     UNIQUE(client_id, channel, source_ref) makes re-syncing idempotent — an
--     adapter can re-run and upsert without creating duplicates.
--   • communication_digests — one stored topic-organized digest per generate
--     run (mirrors firm_insights): the AI regroups events BY TOPIC, not channel,
--     over a date window. Weekly = the same call with a 7-day window.
-- Additive + idempotent — applied by the boot self-migration (index.ts).
-- ============================================================
CREATE TABLE IF NOT EXISTS communication_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL CHECK (channel IN ('meeting', 'gmail', 'zoom', 'whatsapp')),
  direction     TEXT CHECK (direction IN ('inbound', 'outbound', 'internal')),
  occurred_at   TIMESTAMPTZ NOT NULL,
  sender        TEXT,
  participants  TEXT[] NOT NULL DEFAULT '{}',
  subject       TEXT,
  body_text     TEXT NOT NULL,
  source_ref    TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_events_source
  ON communication_events(client_id, channel, source_ref);
CREATE INDEX IF NOT EXISTS idx_comm_events_client_time
  ON communication_events(client_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS communication_digests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  topics          JSONB NOT NULL DEFAULT '[]',
  source_channels TEXT[] NOT NULL DEFAULT '{}',
  event_count     INT NOT NULL DEFAULT 0,
  generated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_digests_client
  ON communication_digests(client_id, period_end DESC);

-- ============================================================
-- UC-12: Commitment tracking — bilateral ownership + provenance
-- A commitment is just a task with an owner that may be the CLIENT (a
-- stakeholder) rather than a TFO advisor. We extend `tasks` rather than create a
-- parallel table so the existing capture/agenda/workplan machinery applies
-- unchanged (Katie: "UC-12 is just a task").
--   • owner_type           — 'tfo' (a team member owns it) | 'client' (a
--                            stakeholder owns it). Existing rows default to 'tfo'.
--   • owner_stakeholder_id  — set when owner_type='client'; the client person on
--                            the hook. App invariant: tfo→assignee_id may be set,
--                            owner_stakeholder_id NULL; client→owner_stakeholder_id
--                            set, assignee_id NULL (enforced in routes/tasks.ts).
--   • source_kind/source_id — where the commitment came from (meeting capture
--                            stamps 'meeting' + the meeting id). v1 sources:
--                            meeting | email | call | note | manual.
-- Additive, idempotent — picked up by the boot self-migration (index.ts).
-- ============================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner_type TEXT NOT NULL DEFAULT 'tfo'
  CHECK (owner_type IN ('tfo', 'client'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner_stakeholder_id UUID
  REFERENCES stakeholders(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_kind TEXT
  CHECK (source_kind IN ('meeting', 'email', 'call', 'note', 'manual'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_id UUID;
CREATE INDEX IF NOT EXISTS idx_tasks_owner_stakeholder ON tasks(owner_stakeholder_id);

-- ============================================================
-- Licensee Portal (Advisor Portal) — V1 thin slice
--
-- A "licensee" (role on users) is a CEPA who manages their own business-owner
-- clients via a simplified portal. Their clients are ordinary `clients` rows
-- (advisor_id = the licensee's user id), so tasks/documents/etc. all apply.
--
--   • licensee_intakes          — one 4-pillar CEPA intake per client (v1; future
--                                 re-assessments bump `version`). Stores the
--                                 engagement snapshot + the computed pillar_scores
--                                 JSON ({ entity:{pct,band}, ip:{...}, ... }).
--   • licensee_intake_responses — one row per answered question, with the chosen
--                                 option's risk_tag. Gap/Partial rows drive the
--                                 readiness % and TFO scoping priorities.
--   • referral_partners         — directory of vetted specialists (seeded by TFO).
--   • referral_requests         — a licensee asking TFO to connect a client to a
--                                 specialist; tracked Requested → In Progress →
--                                 Connected with an outcome.
-- Additive, idempotent — applied by the boot self-migration (index.ts).
-- ============================================================
CREATE TABLE IF NOT EXISTS licensee_intakes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  version        INT NOT NULL DEFAULT 1,
  status         TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'complete')),
  -- Engagement snapshot (collected from the CEPA)
  cepa_name      TEXT,
  firm_name      TEXT,
  completed_date DATE,
  annual_revenue TEXT,
  num_owners     INT,
  owner_ages     TEXT,
  industry       TEXT,
  exit_horizon   TEXT,
  vam_phase      TEXT,
  -- Computed readiness per pillar: { entity:{pct,band}, ip:..., capital:..., exit:... }
  pillar_scores  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  UNIQUE (client_id, version)
);
CREATE INDEX IF NOT EXISTS idx_licensee_intakes_client ON licensee_intakes(client_id);

CREATE TABLE IF NOT EXISTS licensee_intake_responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id    UUID NOT NULL REFERENCES licensee_intakes(id) ON DELETE CASCADE,
  pillar       TEXT NOT NULL CHECK (pillar IN ('entity', 'ip', 'capital', 'exit')),
  question_key TEXT NOT NULL,
  answer_value TEXT,
  risk_tag     TEXT CHECK (risk_tag IN ('on_track', 'partial', 'gap', 'na')),
  notes        TEXT,
  UNIQUE (intake_id, question_key)
);
CREATE INDEX IF NOT EXISTS idx_licensee_responses_intake ON licensee_intake_responses(intake_id);

CREATE TABLE IF NOT EXISTS referral_partners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  occupation    TEXT,
  specialty     TEXT,
  testimonials  TEXT,
  rating        NUMERIC(2,1) CHECK (rating >= 0 AND rating <= 5),
  contact_email TEXT,
  headshot_url  TEXT,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_partners_active ON referral_partners(active);

CREATE TABLE IF NOT EXISTS referral_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  licensee_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pillar       TEXT CHECK (pillar IN ('entity', 'ip', 'capital', 'exit')),
  partner_id   UUID REFERENCES referral_partners(id) ON DELETE SET NULL,
  note         TEXT,
  status       TEXT NOT NULL DEFAULT 'requested'
                 CHECK (status IN ('requested', 'in_progress', 'connected')),
  outcome      TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_requests_client ON referral_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_licensee ON referral_requests(licensee_id);

-- ============================================================
-- HubSpot pipeline sync (one-way: HubSpot → platform)
-- HubSpot is the source of truth for the prospect pipeline. A polling job mirrors
-- each HubSpot deal's stage onto a prospect row, matched by the contact's email.
-- These columns are additive + idempotent — applied by the boot self-migration.
--   • hubspot_deal_id      — the HubSpot deal this prospect mirrors (UNIQUE → the
--                            upsert key that makes re-sync idempotent).
--   • hubspot_stage        — the raw HubSpot stage label, shown as a card sub-label.
--   • hubspot_synced_at    — last time this row was touched by a sync (powers the
--                            "Synced X min ago" freshness line).
--   • synced_from_hubspot  — true when the prospect originated from a HubSpot sync
--                            (vs. created manually in the platform).
--   • assessment_*_url     — links to the 3 external self-assessment result pages
--                            stored on the HubSpot contact (scores live in TFO's
--                            separate assessment apps, not in HubSpot).
--   • hubspot_pitch_deck_url — the source pitch-deck URL last seen on the contact;
--                            used to avoid re-downloading the PDF every sync.
-- ============================================================
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS hubspot_deal_id        TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS hubspot_stage          TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS hubspot_synced_at      TIMESTAMPTZ;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS synced_from_hubspot    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS assessment_fre_url       TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS assessment_discovery_url TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS assessment_sixcs_url     TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS hubspot_pitch_deck_url   TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_prospects_hubspot_deal
  ON prospects(hubspot_deal_id) WHERE hubspot_deal_id IS NOT NULL;

-- Single-row table tracking the incremental sync watermark + last run status.
CREATE TABLE IF NOT EXISTS hubspot_sync_state (
  id            INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_sync_at  TIMESTAMPTZ,
  last_status   TEXT,
  last_error    TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO hubspot_sync_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Pre-client assessment result links carried over from the source prospect on
-- enroll/link. The scores live in TFO's external assessment apps (Supabase), so
-- these are links the client workspace surfaces (Assessment History → Pre-Client)
-- and QB AI is made aware of. fre = Exposure Index, sixcs = Six C's.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assessment_fre_url       TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assessment_discovery_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assessment_sixcs_url     TEXT;

-- ============================================================================
-- Otter.ai transcript ingestion
--
-- Inbound meeting transcripts (from the shared Otter "clientsuccess" account, via
-- a Zapier webhook) auto-file into the matching client's or prospect's Data Room,
-- routed by a dedicated `primary_email` — the founder's OWN email (the actual call
-- participant). This is intentionally SEPARATE from `contact_email`/`contact`,
-- which may be a licensee/handler address shared across several clients, so it is
-- not safe to match on. Anything unmatched lands in `otter_inbox` for manual assign.
-- ============================================================================
ALTER TABLE clients   ADD COLUMN IF NOT EXISTS primary_email TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS primary_email TEXT;
CREATE INDEX IF NOT EXISTS idx_clients_primary_email   ON clients   (LOWER(primary_email));
CREATE INDEX IF NOT EXISTS idx_prospects_primary_email ON prospects (LOWER(primary_email));

-- Idempotency ledger (one row per Otter conversation) + holding area for
-- transcripts that couldn't be auto-matched (status = 'pending').
CREATE TABLE IF NOT EXISTS otter_inbox (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  otter_conversation_id TEXT NOT NULL,
  advisor_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  title                 TEXT,
  participants          JSONB NOT NULL DEFAULT '[]',
  occurred_at           TIMESTAMPTZ,
  transcript_text       TEXT,              -- held only while pending; NULL once filed
  matched_target        TEXT NOT NULL DEFAULT 'none'
                          CHECK (matched_target IN ('client', 'prospect', 'none')),
  matched_id            UUID,
  document_id           UUID REFERENCES documents(id) ON DELETE SET NULL,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'filed')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  filed_at              TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_otter_inbox_conversation
  ON otter_inbox(otter_conversation_id);
CREATE INDEX IF NOT EXISTS idx_otter_inbox_status
  ON otter_inbox(status, created_at DESC);
