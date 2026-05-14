-- ============================================================================
-- OPD App v3.0 — Prescriptions Schema Migration
-- All statements are idempotent (IF EXISTS / IF NOT EXISTS / ON CONFLICT).
-- ============================================================================

-- ─── 1. Prescriptions Table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prescriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id      UUID NOT NULL REFERENCES users(id),
  doctor_id       UUID NOT NULL REFERENCES users(id),
  -- Structured prescription: array of { name, dosage, frequency, duration }
  medications     JSONB NOT NULL DEFAULT '[]',
  diagnosis       TEXT DEFAULT '',
  doctor_notes    TEXT DEFAULT '',
  photo_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. Indexes ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment_id ON prescriptions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON prescriptions(created_at DESC);

-- ─── 3. Row Level Security ──────────────────────────────────────────────────

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Doctors can insert prescriptions they author
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'prescriptions' AND policyname = 'Doctors can insert prescriptions'
  ) THEN
    CREATE POLICY "Doctors can insert prescriptions"
      ON prescriptions FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = doctor_id);
  END IF;
END $$;

-- Doctors can read prescriptions they authored
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'prescriptions' AND policyname = 'Doctors can read own prescriptions'
  ) THEN
    CREATE POLICY "Doctors can read own prescriptions"
      ON prescriptions FOR SELECT TO authenticated
      USING (auth.uid() = doctor_id);
  END IF;
END $$;

-- Patients can read prescriptions assigned to them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'prescriptions' AND policyname = 'Patients can read own prescriptions'
  ) THEN
    CREATE POLICY "Patients can read own prescriptions"
      ON prescriptions FOR SELECT TO authenticated
      USING (auth.uid() = patient_id);
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK SQL (run manually if needed)
-- ============================================================================
-- DROP POLICY IF EXISTS "Doctors can insert prescriptions" ON prescriptions;
-- DROP POLICY IF EXISTS "Doctors can read own prescriptions" ON prescriptions;
-- DROP POLICY IF EXISTS "Patients can read own prescriptions" ON prescriptions;
-- DROP INDEX IF EXISTS idx_prescriptions_patient_id;
-- DROP INDEX IF EXISTS idx_prescriptions_doctor_id;
-- DROP INDEX IF EXISTS idx_prescriptions_appointment_id;
-- DROP INDEX IF EXISTS idx_prescriptions_created_at;
-- DROP TABLE IF EXISTS prescriptions;
