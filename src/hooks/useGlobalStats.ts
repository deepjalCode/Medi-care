import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GlobalStats,
  DoctorListItem,
  fetchGlobalStats,
  fetchDoctorList,
} from '../services/statsService';
import { supabase } from '../services/supabaseSetup';

/**
 * Custom hook that provides global statistics and doctor list.
 * Now dynamically updates via Supabase Realtime subscriptions.
 */
export function useGlobalStats() {
  const [stats, setStats] = useState<GlobalStats>({
    totalDoctors: 0,
    totalPatients: 0,
    tokensToday: 0,
    activeDoctors: 0,
  });
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [newStats, newDoctors] = await Promise.all([
        fetchGlobalStats(),
        fetchDoctorList(),
      ]);
      setStats(newStats);
      setDoctors(newDoctors);
    } catch (err) {
      console.error('useGlobalStats: refresh failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerRealtimeRefresh = useCallback(() => {
    if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
    fetchTimeout.current = setTimeout(() => {
      refresh();
    }, 500); // Debounce burst events
  }, [refresh]);

  useEffect(() => {
    refresh(); // Initial fetch

    const channel = supabase
      .channel('global_stats_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        triggerRealtimeRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        triggerRealtimeRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'doctors' },
        triggerRealtimeRefresh
      )
      .subscribe();

    return () => {
      if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
      supabase.removeChannel(channel);
    };
  }, [refresh, triggerRealtimeRefresh]);

  return { stats, doctors, loading, refresh };
}
