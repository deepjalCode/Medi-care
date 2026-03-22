import { supabase } from './supabaseSetup';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface GlobalStats {
  totalDoctors: number;
  totalPatients: number;
  tokensToday: number;
  activeDoctors: number;
}

export interface DoctorListItem {
  id: string;
  name: string;
  specialty: string;
  isAvailable: boolean;
}

// ─── Fetch Stats ───────────────────────────────────────────────────────────────

/**
 * Fetches global statistics from Supabase in a single call.
 * Uses count queries for totals; derives tokensToday from today's appointments.
 */
export const fetchGlobalStats = async (): Promise<GlobalStats> => {
  const todayDate = new Date().toISOString().split('T')[0];

  const [patRes, docRes, tokenRes] = await Promise.all([
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'PATIENT'),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'DOCTOR'),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', `${todayDate}T00:00:00`)
      .lte('created_at', `${todayDate}T23:59:59`),
  ]);

  // Active doctors = doctors who have a WAITING or IN_PROGRESS appointment today
  const { data: activeData } = await supabase
    .from('appointments')
    .select('doctor_id')
    .eq('visit_date', todayDate)
    .in('status', ['WAITING', 'IN_PROGRESS']);

  const activeDoctorIds = new Set(
    (activeData ?? []).map((a: any) => a.doctor_id).filter(Boolean),
  );

  return {
    totalPatients: patRes.count ?? 0,
    totalDoctors: docRes.count ?? 0,
    tokensToday: tokenRes.count ?? 0,
    activeDoctors: activeDoctorIds.size,
  };
};

// ─── Fetch Doctor List ─────────────────────────────────────────────────────────

/**
 * Returns a list of all doctors with name, specialty, and availability.
 * Availability is derived from whether the doctor has active appointments today.
 */
export const fetchDoctorList = async (): Promise<DoctorListItem[]> => {
  const todayDate = new Date().toISOString().split('T')[0];

  const [docRes, activeRes] = await Promise.all([
    supabase
      .from('doctors')
      .select('id, speciality, users ( name )'),
    supabase
      .from('appointments')
      .select('doctor_id')
      .eq('visit_date', todayDate)
      .in('status', ['WAITING', 'IN_PROGRESS']),
  ]);

  const activeDoctorIds = new Set(
    (activeRes.data ?? []).map((a: any) => a.doctor_id).filter(Boolean),
  );

  return (docRes.data ?? []).map((d: any) => ({
    id: d.id,
    name: d.users?.name ?? 'Doctor',
    specialty: d.speciality ?? 'General',
    isAvailable: activeDoctorIds.has(d.id),
  }));
};

// ─── Realtime Subscriptions ────────────────────────────────────────────────────

/**
 * Subscribe to changes on the users and appointments tables so stats update live.
 * Returns an object with an `unsubscribe()` method for cleanup.
 */
export const subscribeToStatsChanges = (
  onUpdate: () => void,
) => {
  const channel = supabase
    .channel('global-stats')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users' },
      () => onUpdate(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'appointments' },
      () => onUpdate(),
    )
    .subscribe();

  // EXTEND: Add additional table listeners here if stats include more sources
  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
};
