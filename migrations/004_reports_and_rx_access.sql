-- ============================================================================
-- OPD App v4.0 — Admin Reports & Prescription Access Migration
-- All statements are idempotent (IF EXISTS / IF NOT EXISTS / DO blocks).
-- ============================================================================

-- ─── 1. Admin Report Aggregation RPC ────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_admin_report(
  p_start_date  DATE,
  p_end_date    DATE,
  p_doctor_id   UUID     DEFAULT NULL,
  p_category    CHAR(2)  DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Security guard: only admins may execute
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT json_build_object(
    'summary', (
      SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
      FROM (
        SELECT
          d.id               AS doctor_id,
          u.name             AS doctor_name,
          d.speciality       AS specialty,
          d.category         AS category,
          d.category_code    AS category_code,
          COUNT(a.id)        AS total_appointments,
          COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED')   AS completed,
          COUNT(a.id) FILTER (WHERE a.status = 'CANCELLED')   AS cancelled,
          COUNT(a.id) FILTER (WHERE a.status = 'WAITING')     AS waiting,
          COUNT(a.id) FILTER (WHERE a.status = 'IN_PROGRESS') AS in_progress,
          COUNT(DISTINCT a.patient_id)                         AS unique_patients
        FROM doctors d
        JOIN users u ON u.id = d.id
        LEFT JOIN appointments a
          ON a.doctor_id = d.id
          AND a.visit_date BETWEEN p_start_date AND p_end_date
        WHERE
          (p_doctor_id IS NULL OR d.id = p_doctor_id)
          AND (p_category IS NULL OR d.category_code = p_category)
        GROUP BY d.id, u.name, d.speciality, d.category, d.category_code
        ORDER BY u.name
      ) s
    ),
    'visits', (
      SELECT COALESCE(json_agg(row_to_json(v)), '[]'::json)
      FROM (
        SELECT
          a.id               AS appointment_id,
          a.token_number,
          a.visit_date,
          a.status,
          a.reason_for_visit,
          a.category_code,
          pu.name            AS patient_name,
          p.patient_id       AS patient_display_id,
          du.name            AS doctor_name
        FROM appointments a
        JOIN users pu ON pu.id = a.patient_id
        JOIN patients p ON p.id = a.patient_id
        LEFT JOIN users du ON du.id = a.doctor_id
        WHERE
          a.visit_date BETWEEN p_start_date AND p_end_date
          AND (p_doctor_id IS NULL OR a.doctor_id = p_doctor_id)
          AND (p_category IS NULL OR a.category_code = p_category)
        ORDER BY a.visit_date DESC, a.token_number
        LIMIT 500
      ) v
    ),
    'generated_at', NOW(),
    'filters', json_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date,
      'doctor_id', p_doctor_id,
      'category_code', p_category
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_admin_report(DATE, DATE, UUID, CHAR(2)) TO authenticated;

-- ─── 2. RLS: Doctors can read prescriptions for patients they've treated ────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'prescriptions'
      AND policyname = 'Doctors can read patient history if treated'
  ) THEN
    CREATE POLICY "Doctors can read patient history if treated"
      ON prescriptions FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM appointments a
          WHERE a.doctor_id = auth.uid()
            AND a.patient_id = prescriptions.patient_id
        )
        AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
            AND u.role = 'DOCTOR'
        )
      );
  END IF;
END $$;

-- ─── 3. RLS: Admins can read all prescriptions ─────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'prescriptions'
      AND policyname = 'Admins can read all prescriptions'
  ) THEN
    CREATE POLICY "Admins can read all prescriptions"
      ON prescriptions FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid()
            AND u.role = 'ADMIN'
        )
      );
  END IF;
END $$;

-- ─── 4. Performance Indexes ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_appointments_visit_date
  ON appointments(visit_date);

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_visit
  ON appointments(doctor_id, visit_date);

-- ============================================================================
-- ROLLBACK SQL (run manually if needed)
-- ============================================================================
-- DROP FUNCTION IF EXISTS get_admin_report(DATE, DATE, UUID, CHAR(2));
-- DROP POLICY IF EXISTS "Doctors can read patient history if treated" ON prescriptions;
-- DROP POLICY IF EXISTS "Admins can read all prescriptions" ON prescriptions;
-- DROP INDEX IF EXISTS idx_appointments_visit_date;
-- DROP INDEX IF EXISTS idx_appointments_doctor_visit;
