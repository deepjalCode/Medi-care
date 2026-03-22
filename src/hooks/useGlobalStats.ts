import { useState, useEffect, useCallback } from 'react';
import {
  GlobalStats,
  DoctorListItem,
  fetchGlobalStats,
  fetchDoctorList,
  subscribeToStatsChanges,
} from '../services/statsService';

/**
 * Custom hook that provides live global statistics and doctor list.
 * Subscribes to Supabase Realtime so values auto-refresh when
 * users or appointments change in the database.
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

  useEffect(() => {
    // Initial fetch
    refresh();

    // Realtime subscription — re-fetch whenever users or appointments change
    const sub = subscribeToStatsChanges(() => {
      refresh();
    });

    return () => {
      sub.unsubscribe();
    };
  }, [refresh]);

  return { stats, doctors, loading, refresh };
}
