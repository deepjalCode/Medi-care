/**
 * NotificationContext (optimized)
 *
 * Performance improvements:
 * - AsyncStorage writes are debounced (300ms) to prevent burst I/O
 * - isFirstLoad flag prevents writing back what we just read from storage
 * - unreadCount is memoized with useMemo
 * - Context value is memoized with useMemo to prevent unnecessary consumer re-renders
 *
 * Provides a global notification store for in-app notifications.
 * - Persists to AsyncStorage across app restarts.
 * - Subscribes to Supabase Realtime on:
 *     • `appointments` INSERT filtered by doctor_id  (DOCTOR role)
 *     • `appointments` UPDATE filtered by patient_id (PATIENT role)
 *     • `notifications` INSERT filtered by user_id   (all roles — DB-stored)
 * - Exposes: notifications[], unreadCount, markRead(id), markAllRead(), addNotification()
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { supabase } from '../services/supabaseSetup';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface InAppNotification {
  id: string;
  message: string;
  read: boolean;
  timestamp: string; // ISO string
}

interface NotificationContextValue {
  notifications: InAppNotification[];
  unreadCount: number;
  addNotification: (message: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markRead: () => {},
  markAllRead: () => {},
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = '@opd_notifications';
const DEBOUNCE_MS = 300;

function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, role } = useSelector(
    (state: RootState) => state.auth,
  );

  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  // Track whether we are still on the initial load from AsyncStorage.
  // We skip the write-back on first load to avoid writing what we just read.
  const isFirstLoad = useRef(true);

  // Debounce timer ref for AsyncStorage writes
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track channel refs for cleanup
  const appointmentChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const dbNotifChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Load persisted notifications on mount ─────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setNotifications(parsed);
          }
        }
      } catch (e) {
        console.warn('NotificationContext: failed to load from AsyncStorage', e);
      } finally {
        // Mark first load as done AFTER setting state so the write-effect skips this cycle
        isFirstLoad.current = false;
      }
    };
    load();
  }, []);

  // ── Debounced persist to AsyncStorage whenever notifications change ────────

  useEffect(() => {
    // Skip the write triggered immediately after loading from storage
    if (isFirstLoad.current) return;

    // Clear any pending write and schedule a new one
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications)).catch(
        (e) => console.warn('NotificationContext: failed to save to AsyncStorage', e),
      );
    }, DEBOUNCE_MS);

    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [notifications]);

  // ── Add a new notification ────────────────────────────────────────────────

  const addNotification = useCallback((message: string) => {
    const entry: InAppNotification = {
      id: generateId(),
      message,
      read: false,
      timestamp: new Date().toISOString(),
    };
    setNotifications((prev) => [entry, ...prev].slice(0, 50)); // cap at 50
  }, []);

  // ── Mark a single notification as read ───────────────────────────────────

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  // ── Mark all notifications as read ───────────────────────────────────────

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // ── Supabase Realtime Subscriptions ──────────────────────────────────────

  useEffect(() => {
    // Clean up previous subscriptions
    if (appointmentChannelRef.current) {
      supabase.removeChannel(appointmentChannelRef.current);
      appointmentChannelRef.current = null;
    }
    if (dbNotifChannelRef.current) {
      supabase.removeChannel(dbNotifChannelRef.current);
      dbNotifChannelRef.current = null;
    }

    if (!userId || !role) return;

    // ── DOCTOR: Subscribe to new appointments assigned to this doctor ────────
    if (role === 'DOCTOR') {
      const ch = supabase
        .channel(`appt_doctor_notif:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'appointments',
            filter: `doctor_id=eq.${userId}`,
          },
          (payload) => {
            const appt = payload.new as Record<string, unknown>;
            const tokenNum = (appt.token_number as string) ?? `#${appt.token ?? 0}`;
            addNotification(
              `New patient assigned: Token ${tokenNum}`,
            );
          },
        )
        .subscribe();

      appointmentChannelRef.current = ch;
    }

    // ── PATIENT: Subscribe to status changes on their own appointments ───────
    if (role === 'PATIENT') {
      const ch = supabase
        .channel(`appt_patient_notif:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'appointments',
            filter: `patient_id=eq.${userId}`,
          },
          (payload) => {
            const appt = payload.new as Record<string, unknown>;
            const tokenNum = (appt.token_number as string) ?? `#${appt.token ?? 0}`;
            const status = (appt.status as string) ?? '';
            addNotification(
              `Your token ${tokenNum}: now ${status.replace('_', ' ')}`,
            );
          },
        )
        .subscribe();

      appointmentChannelRef.current = ch;
    }

    // ── ALL ROLES: Subscribe to DB-stored notifications (existing system) ────
    const dbCh = supabase
      .channel(`db_notif:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notif = payload.new as Record<string, unknown>;
          const title = (notif.title as string) ?? '';
          const body = (notif.body as string) ?? '';
          addNotification(body ? `${title}: ${body}` : title);
        },
      )
      .subscribe();

    dbNotifChannelRef.current = dbCh;

    return () => {
      if (appointmentChannelRef.current) {
        supabase.removeChannel(appointmentChannelRef.current);
        appointmentChannelRef.current = null;
      }
      if (dbNotifChannelRef.current) {
        supabase.removeChannel(dbNotifChannelRef.current);
        dbNotifChannelRef.current = null;
      }
    };
  }, [userId, role, addNotification]);

  // ── Memoized derived values ───────────────────────────────────────────────

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  // Memoize the context value so consumers don't re-render on unrelated parent renders
  const contextValue = useMemo<NotificationContextValue>(
    () => ({ notifications, unreadCount, addNotification, markRead, markAllRead }),
    [notifications, unreadCount, addNotification, markRead, markAllRead],
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useNotificationContext(): NotificationContextValue {
  return useContext(NotificationContext);
}
