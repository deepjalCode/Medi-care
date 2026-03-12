import { supabase } from './supabaseSetup';

export interface AppointmentData {
  id?: string;
  patientId: string;   // patients.id (UUID)
  doctorId?: string | null; // doctors.id (UUID)
  token?: number;
  reason: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
  visit_date?: string;
  notes?: string;
  createdAt?: string;
}

const TABLE = 'appointments';

export const createAppointment = async (data: Omit<AppointmentData, 'id' | 'createdAt'>) => {
  try {
    const { data: inserted, error } = await supabase.from(TABLE).insert([{
      patient_id: data.patientId,
      doctor_id: data.doctorId ?? null,
      token: data.token ?? 0,
      reason: data.reason,
      status: data.status,
      visit_date: data.visit_date ?? new Date().toISOString().split('T')[0],
      notes: data.notes ?? null,
    }]).select().single();

    if (error) throw error;
    return inserted;
  } catch (error) {
    console.error('Error creating appointment', error);
    throw error;
  }
};

export const updateAppointmentStatus = async (id: string, status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED') => {
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
    return (data || []).map((a: any) => ({
      id: a.id,
      patientId: a.patient_id,
      doctorId: a.doctor_id,
      token: a.token,
      reason: a.reason,
      status: a.status,
      visit_date: a.visit_date,
      notes: a.notes,
      createdAt: a.created_at,
    }));
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
    return (data || []).map((a: any) => ({
      id: a.id,
      patientId: a.patient_id,
      doctorId: a.doctor_id,
      token: a.token,
      reason: a.reason,
      status: a.status,
      visit_date: a.visit_date,
      notes: a.notes,
      createdAt: a.created_at,
    }));
  } catch (error) {
    console.error('Error fetching patient appointments', error);
    throw error;
  }
};
