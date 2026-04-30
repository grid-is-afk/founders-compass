CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Users (advisors)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'advisor' CHECK (role IN ('advisor', 'admin', 'client')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  file_url    TEXT,
  size        TEXT,
  type        TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);

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
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  detail     TEXT,
  severity   TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_alerts_client ON risk_alerts(client_id);

-- ============================================================
-- Deliverables
-- ============================================================
CREATE TABLE IF NOT EXISTS deliverables (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete')),
  engine     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliverables_client ON deliverables(client_id);

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
