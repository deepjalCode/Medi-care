import { useState, useEffect, useCallback } from 'react';
import {
  GlobalStats,
  DoctorListItem,
  fetchGlobalStats,
  fetchDoctorList,
} from '../services/statsService';

/**
 * Custom hook that provides global statistics and doctor list.
 * Fetches data statically on mount (non-realtime).
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
    refresh();
  }, [refresh]);

  return { stats, doctors, loading, refresh };
}
