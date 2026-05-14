/**
 * Prescription Service (v1.1)
 *
 * Provides CRUD operations for the prescriptions table.
 * Follows the same patterns as appointmentService.ts and NotificationService.ts.
 *
 * v1.1 fixes:
 * - Removed JSON.stringify on medications (Supabase handles JSONB automatically)
 * - Simplified SELECT queries to avoid PostgREST FK hint issues
 */

import { supabase } from './supabaseSetup';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface PrescriptionData {
  id?: string;
  appointmentId?: string | null;
  patientId: string;
  doctorId: string;
  medications: MedicationItem[];
  diagnosis: string;
  doctorNotes: string;
  photoUrl?: string | null;
  patientName?: string;   // From join
  doctorName?: string;    // From join
  createdAt?: string;
}

const TABLE = 'prescriptions';

// ─── Create Prescription ────────────────────────────────────────────────────────

/**
 * Creates a new prescription record.
 * Doctor must be the authenticated user (enforced by RLS).
 */
export const createPrescription = async (data: {
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  medications: MedicationItem[];
  diagnosis: string;
  doctorNotes: string;
}): Promise<PrescriptionData> => {
  try {
    const { data: inserted, error } = await supabase
      .from(TABLE)
      .insert([{
        appointment_id: data.appointmentId ?? null,
        patient_id: data.patientId,
        doctor_id: data.doctorId,
        medications: data.medications,
        diagnosis: data.diagnosis.trim(),
        doctor_notes: data.doctorNotes.trim(),
      }])
      .select()
      .single();

    if (error) throw error;
    return mapPrescription(inserted);
  } catch (error) {
    console.error('PrescriptionService: createPrescription failed', error);
    throw error;
  }
};

// ─── Fetch Patient Prescriptions ────────────────────────────────────────────────

/**
 * Fetches all prescriptions for a patient, newest first.
 * Joins with users table (via doctor_id) to get doctor name.
 */
export const getPatientPrescriptions = async (
  patientId: string,
): Promise<PrescriptionData[]> => {
  try {
    // Fetch prescriptions (no complex joins — avoids PostgREST FK ambiguity)
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Enrich with doctor names via a separate lightweight query
    const prescriptions = (data ?? []).map(mapPrescription);
    await enrichDoctorNames(prescriptions);
    return prescriptions;
  } catch (error) {
    console.error('PrescriptionService: getPatientPrescriptions failed', error);
    return []; // Non-blocking fallback
  }
};

// ─── Fetch Doctor Prescriptions ─────────────────────────────────────────────────

/**
 * Fetches all prescriptions authored by a doctor, newest first.
 * Joins with users table (via patient_id) to get patient name.
 */
export const getDoctorPrescriptions = async (
  doctorId: string,
): Promise<PrescriptionData[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const prescriptions = (data ?? []).map(mapPrescription);
    await enrichPatientNames(prescriptions);
    return prescriptions;
  } catch (error) {
    console.error('PrescriptionService: getDoctorPrescriptions failed', error);
    return [];
  }
};

// ─── Fetch Prescriptions by Appointment ─────────────────────────────────────────

/**
 * Fetches prescriptions for a specific appointment.
 */
export const getPrescriptionsByAppointment = async (
  appointmentId: string,
): Promise<PrescriptionData[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapPrescription);
  } catch (error) {
    console.error('PrescriptionService: getPrescriptionsByAppointment failed', error);
    return [];
  }
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function mapPrescription(row: Record<string, unknown>): PrescriptionData {
  // Parse medications — Supabase returns JSONB as native JS array
  let medications: MedicationItem[] = [];
  try {
    const rawMeds = row.medications;
    if (typeof rawMeds === 'string') {
      medications = JSON.parse(rawMeds);
    } else if (Array.isArray(rawMeds)) {
      medications = rawMeds as MedicationItem[];
    }
  } catch {
    medications = [];
  }

  return {
    id: row.id as string,
    appointmentId: (row.appointment_id as string) ?? null,
    patientId: row.patient_id as string,
    doctorId: row.doctor_id as string,
    medications,
    diagnosis: (row.diagnosis as string) ?? '',
    doctorNotes: (row.doctor_notes as string) ?? '',
    photoUrl: (row.photo_url as string) ?? null,
    doctorName: (row.doctorName as string) ?? undefined,
    patientName: (row.patientName as string) ?? undefined,
    createdAt: row.created_at as string,
  };
}

/**
 * Enriches prescriptions with doctor names via a single batch query.
 * Avoids the PostgREST ambiguous FK issue by querying the users table directly.
 */
async function enrichDoctorNames(prescriptions: PrescriptionData[]): Promise<void> {
  const doctorIds = [...new Set(prescriptions.map((p) => p.doctorId).filter(Boolean))];
  if (doctorIds.length === 0) return;

  try {
    const { data } = await supabase
      .from('users')
      .select('id, name')
      .in('id', doctorIds);

    const nameMap = new Map((data ?? []).map((u: any) => [u.id, u.name]));
    for (const rx of prescriptions) {
      const name = nameMap.get(rx.doctorId);
      if (name) rx.doctorName = `Dr. ${name}`;
    }
  } catch (err) {
    console.error('PrescriptionService: enrichDoctorNames failed', err);
  }
}

/**
 * Enriches prescriptions with patient names via a single batch query.
 */
async function enrichPatientNames(prescriptions: PrescriptionData[]): Promise<void> {
  const patientIds = [...new Set(prescriptions.map((p) => p.patientId).filter(Boolean))];
  if (patientIds.length === 0) return;

  try {
    const { data } = await supabase
      .from('users')
      .select('id, name')
      .in('id', patientIds);

    const nameMap = new Map((data ?? []).map((u: any) => [u.id, u.name]));
    for (const rx of prescriptions) {
      const name = nameMap.get(rx.patientId);
      if (name) rx.patientName = name;
    }
  } catch (err) {
    console.error('PrescriptionService: enrichPatientNames failed', err);
  }
}
