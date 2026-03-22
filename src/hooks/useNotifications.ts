import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  Notification,
  getUnreadNotifications,
  subscribeToNotifications,
  markAsRead as markNotificationAsRead,
} from '../services/NotificationService';
import { supabase } from '../services/supabaseSetup';

/**
 * Custom hook that manages in-app notifications for the logged-in user.
 *
 * Provides:
 * - `notifications` — list of unread notifications
 * - `unreadCount` — convenience count
 * - `latestNotification` — the most recently received notification (for banner)
 * - `markAsRead` — marks a notification as read and removes it from the list
 * - `clearLatest` — clears the latestNotification (after banner dismissal)
 */
export function useNotifications() {
  const { userId, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [latestNotification, setLatestNotification] =
    useState<Notification | null>(null);

  // ── Fetch existing unread on mount ─────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setNotifications([]);
      return;
    }

    const fetchExisting = async () => {
      const existing = await getUnreadNotifications(userId);
      setNotifications(existing);
    };

    fetchExisting();

    // Subscribe to new notifications via Supabase Realtime
    const channel = subscribeToNotifications(userId, (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setLatestNotification(newNotif);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isAuthenticated]);

  // ── Mark as read ───────────────────────────────────────────────────────────

  const markAsRead = useCallback(async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  // ── Clear latest (after banner auto-dismiss) ──────────────────────────────

  const clearLatest = useCallback(() => {
    setLatestNotification(null);
  }, []);

  return {
    notifications,
    unreadCount: notifications.length,
    latestNotification,
    markAsRead,
    clearLatest,
  };
}
