-- ============================================================================
-- OPD App v2.0 — Schema Migration
-- All statements are idempotent (IF EXISTS / IF NOT EXISTS / ON CONFLICT).
-- ============================================================================

-- ─── 1. ID Sequences ────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS patient_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS doctor_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS admin_id_seq START 1;

-- ─── 2. ID Generation RPCs ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_patient_id()
RETURNS TEXT AS $$
  SELECT 'PAT-' || LPAD(nextval('patient_id_seq')::TEXT, 6, '0');
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION generate_doctor_id()
RETURNS TEXT AS $$
  SELECT 'DOC-' || LPAD(nextval('doctor_id_seq')::TEXT, 6, '0');
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION generate_admin_id()
RETURNS TEXT AS $$
  SELECT 'ADM-' || LPAD(nextval('admin_id_seq')::TEXT, 6, '0');
$$ LANGUAGE SQL;

-- ─── 3. Doctor Table — New Columns ──────────────────────────────────────────

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General Physician';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS category_code CHAR(2) DEFAULT 'GN';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS availability BOOLEAN DEFAULT true;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- ─── 4. Patient & Admin Tables — Photo URL ─────────────────────────────────

ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- ─── 5. Appointments Table — New Columns ────────────────────────────────────

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS token_number TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS category_code CHAR(2);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reason_for_visit TEXT NOT NULL DEFAULT '';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── 6. Token Counters Table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS token_counters (
  category_code CHAR(2)   NOT NULL,
  counter_date  DATE       NOT NULL,
  last_sequence INTEGER    NOT NULL DEFAULT 0,
  PRIMARY KEY (category_code, counter_date)
);

-- Seed initial rows for today
INSERT INTO token_counters (category_code, counter_date, last_sequence)
VALUES
  ('GN', CURRENT_DATE, 0),
  ('EN', CURRENT_DATE, 0),
  ('PE', CURRENT_DATE, 0),
  ('OR', CURRENT_DATE, 0),
  ('DE', CURRENT_DATE, 0)
ON CONFLICT (category_code, counter_date) DO NOTHING;

-- ─── 7. Atomic Token Generation RPC ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_token(
  p_category_code CHAR(2),
  p_date          DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT AS $$
DECLARE
  next_seq  INTEGER;
  date_str  TEXT;
BEGIN
  INSERT INTO token_counters (category_code, counter_date, last_sequence)
  VALUES (p_category_code, p_date, 1)
  ON CONFLICT (category_code, counter_date)
  DO UPDATE SET last_sequence = token_counters.last_sequence + 1
  RETURNING last_sequence INTO next_seq;

  date_str := UPPER(TO_CHAR(p_date, 'DDMON'));

  RETURN p_category_code || '-' || date_str || '-' || LPAD(next_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── 8. RLS on token_counters (same policy pattern as other tables) ─────────

ALTER TABLE token_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow anon read token_counters"
  ON token_counters FOR SELECT TO anon USING (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated all on token_counters"
  ON token_counters FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- ROLLBACK SQL (run manually if needed)
-- ============================================================================
-- DROP FUNCTION IF EXISTS generate_token(CHAR(2), DATE);
-- DROP FUNCTION IF EXISTS generate_patient_id();
-- DROP FUNCTION IF EXISTS generate_doctor_id();
-- DROP FUNCTION IF EXISTS generate_admin_id();
-- DROP TABLE IF EXISTS token_counters;
-- DROP SEQUENCE IF EXISTS patient_id_seq;
-- DROP SEQUENCE IF EXISTS doctor_id_seq;
-- DROP SEQUENCE IF EXISTS admin_id_seq;
-- ALTER TABLE doctors DROP COLUMN IF EXISTS category;
-- ALTER TABLE doctors DROP COLUMN IF EXISTS category_code;
-- ALTER TABLE doctors DROP COLUMN IF EXISTS availability;
-- ALTER TABLE doctors DROP COLUMN IF EXISTS photo_url;
-- ALTER TABLE patients DROP COLUMN IF EXISTS photo_url;
-- ALTER TABLE admins DROP COLUMN IF EXISTS photo_url;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS token_number;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS category_code;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS reason_for_visit;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS generated_at;
