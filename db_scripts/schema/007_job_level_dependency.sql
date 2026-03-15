-- ══════════════════════════════════════════════════
-- Job Dependencies — Westfield Buildout Phase 2
-- Cross-workgroup, job-to-job finish-to-start links
-- ══════════════════════════════════════════════════

-- ── Floor 2 ──────────────────────────────────────

-- Electrical → Drywall (can't close walls until wiring + ductwork are in)
INSERT INTO job_dependencies (job_id, depends_on_job_id) VALUES
  ('aa000000-0000-0000-0000-000000000049', 'aa000000-0000-0000-0000-000000000043'),  -- Frame conference rooms ← Wire conference rooms
  ('aa000000-0000-0000-0000-000000000049', 'aa000000-0000-0000-0000-000000000047');  -- Frame conference rooms ← Install new VAV system

-- Electrical → Drywall (lighting rough-in before drywall finish)
INSERT INTO job_dependencies (job_id, depends_on_job_id) VALUES
  ('aa000000-0000-0000-0000-000000000050', 'aa000000-0000-0000-0000-000000000045');  -- Hang and finish drywall ← Lighting installation

-- Drywall → Flooring (walls complete before floor work begins)
INSERT INTO job_dependencies (job_id, depends_on_job_id) VALUES
  ('aa000000-0000-0000-0000-000000000051', 'aa000000-0000-0000-0000-000000000050');  -- Remove old carpet ← Hang and finish drywall

-- Flooring → Painting (floors down before paint)
INSERT INTO job_dependencies (job_id, depends_on_job_id) VALUES
  ('aa000000-0000-0000-0000-000000000054', 'aa000000-0000-0000-0000-000000000052'),  -- Prime all surfaces ← Install LVP flooring
  ('aa000000-0000-0000-0000-000000000056', 'aa000000-0000-0000-0000-000000000053');  -- Paint conference rooms ← Conference room carpet tiles

-- ── Floor 3 ──────────────────────────────────────

-- Electrical → HVAC (power before cooling equipment)
INSERT INTO job_dependencies (job_id, depends_on_job_id) VALUES
  ('aa000000-0000-0000-0000-000000000060', 'aa000000-0000-0000-0000-000000000058'),  -- Server room precision cooling ← Server room power
  ('aa000000-0000-0000-0000-000000000061', 'aa000000-0000-0000-0000-000000000057');  -- Suite HVAC zones ← Wire executive suites

-- HVAC → Painting (vents installed before painting)
INSERT INTO job_dependencies (job_id, depends_on_job_id) VALUES
  ('aa000000-0000-0000-0000-000000000062', 'aa000000-0000-0000-0000-000000000061');  -- Executive suite painting ← Suite HVAC zones

-- Electrical → Painting (emergency lights roughed in before painting common areas)
INSERT INTO job_dependencies (job_id, depends_on_job_id) VALUES
  ('aa000000-0000-0000-0000-000000000063', 'aa000000-0000-0000-0000-000000000059');  -- Common area painting ← Emergency lighting