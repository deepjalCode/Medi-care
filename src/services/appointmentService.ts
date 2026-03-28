/**
 * Appointment Service (v2.0)
 *
 * Changes:
 * - createAppointment() now calls generate_token RPC for atomic token generation
 * - Added token_number, category_code, reason_for_visit, generated_at fields
 * - Updated type definitions to include new fields
 */

import { supabase } from './supabaseSetup';

export interface AppointmentData {
  id?: string;
  patientId: string;          // patients.id (UUID)
  doctorId?: string | null;   // doctors.id (UUID)
  token?: number;             // Legacy integer token (kept for backward compat)
  tokenNumber?: string;       // New formatted token: GN-22MAR-0001
  categoryCode?: string;      // 2-letter category code
  reason: string;             // Original reason field
  reasonForVisit?: string;    // New detailed reason
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  visit_date?: string;
  notes?: string;
  generatedAt?: string;       // When token was generated
  createdAt?: string;
}

const TABLE = 'appointments';

/**
 * Creates a new appointment with atomic token generation.
 * Calls the generate_token RPC to get a unique, sequential token number.
 */
export const createAppointment = async (data: {
  patientId: string;
  doctorId: string;
  categoryCode: string;
  reason: string;
  reasonForVisit: string;
}): Promise<AppointmentData> => {
  try {
    const todayDate = new Date().toISOString().split('T')[0];

    // Atomic token generation via RPC
    const { data: tokenNumber, error: tokenError } = await supabase.rpc(
      'generate_token',
      { p_category_code: data.categoryCode },
    );
    if (tokenError) throw tokenError;
    if (!tokenNumber) throw new Error('Failed to generate token');

    // Extract the sequence number for the legacy token field
    const seqMatch = tokenNumber.match(/-(\d{4})$/);
    const legacyToken = seqMatch ? parseInt(seqMatch[1], 10) : 0;

    const { data: inserted, error } = await supabase.from(TABLE).insert([{
      patient_id: data.patientId,
      doctor_id: data.doctorId,
      token: legacyToken,
      token_number: tokenNumber,
      category_code: data.categoryCode,
      reason: data.reason,
      reason_for_visit: data.reasonForVisit,
      status: 'WAITING',
      visit_date: todayDate,
      generated_at: new Date().toISOString(),
    }]).select().single();

    if (error) throw error;
    return mapAppointment(inserted);
  } catch (error) {
    console.error('Error creating appointment', error);
    throw error;
  }
};

export const updateAppointmentStatus = async (
  id: string,
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
) => {
  try {
    const { error } = await supabase.from(TABLE).update({ status }).eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error('Error updating appointment status', error);
    throw error;
  }
};

// Fetch all appointments for a specific doctor
export const getDoctorAppointments = async (doctorId: string): Promise<AppointmentData[]> => {
  try {
    const { data, error } = await supabase.from(TABLE)
      .select('*, patients(id, patient_id, users(name, phone))')
      .eq('doctor_id', doctorId)
      .order('visit_date', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapAppointment);
  } catch (error) {
    console.error('Error fetching doctor appointments', error);
    throw error;
  }
};

// Fetch all appointments for a specific patient
export const getPatientAppointments = async (patientId: string): Promise<AppointmentData[]> => {
  try {
    const { data, error } = await supabase.from(TABLE)
      .select('*, doctors(id, doc_id, users(name))')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapAppointment);
  } catch (error) {
    console.error('Error fetching patient appointments', error);
    throw error;
  }
};

// ─── Helper ─────────────────────────────────────────────────────────────────

function mapAppointment(a: Record<string, unknown>): AppointmentData {
  return {
    id: a.id as string,
    patientId: a.patient_id as string,
    doctorId: a.doctor_id as string | null,
    token: a.token as number,
    tokenNumber: (a.token_number as string) ?? undefined,
    categoryCode: (a.category_code as string) ?? undefined,
    reason: (a.reason as string) ?? '',
    reasonForVisit: (a.reason_for_visit as string) ?? '',
    status: a.status as AppointmentData['status'],
    visit_date: a.visit_date as string,
    notes: (a.notes as string) ?? undefined,
    generatedAt: (a.generated_at as string) ?? undefined,
    createdAt: a.created_at as string,
  };
}
