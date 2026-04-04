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

/**
 * Fetches global statistics via a secure Postgres function.
 * Uses a SECURITY DEFINER RPC (`get_public_stats`) that returns only
 * aggregated counts — works for both anon and authenticated users
 * without exposing row-level data through RLS.
 */
export const fetchGlobalStats = async (): Promise<GlobalStats> => {
  const { data, error } = await supabase.rpc('get_public_stats');

  if (error) {
    console.error('fetchGlobalStats RPC error:', error.message);
    return { totalPatients: 0, totalDoctors: 0, tokensToday: 0, activeDoctors: 0 };
  }

  // The RPC returns JSON. Supabase-js may deliver:
  //   - Direct object:  { total_patients, total_doctors, ... }
  //   - Nested wrapper: { get_public_stats: { total_patients, ... } }  (older clients)
  //   - Or null
  const stats = data?.get_public_stats ?? data;

  return {
    totalPatients: stats?.total_patients ?? 0,
    totalDoctors: stats?.total_doctors ?? 0,
    tokensToday: stats?.tokens_today ?? 0,
    activeDoctors: stats?.active_doctors ?? 0,
  };
};

// ─── Fetch Doctor List ─────────────────────────────────────────────────────────

/**
 * Returns a list of all doctors with name, specialty, and live availability.
 * Uses doctors.availability column directly.
 */
export const fetchDoctorList = async (): Promise<DoctorListItem[]> => {
  const { data, error } = await supabase
    .from('doctors')
    .select('id, speciality, availability, users ( name )')
    .order('availability', { ascending: false }); // available doctors first

  if (error) {
    console.error('fetchDoctorList error:', error.message);
    return [];
  }

  return (data ?? []).map((d: any) => ({
    id: d.id,
    name: d.users?.name ?? 'Doctor',
    specialty: d.speciality ?? 'General',
    isAvailable: d.availability ?? false,
  }));
};
