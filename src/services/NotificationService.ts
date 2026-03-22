import { supabase } from './supabaseSetup';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

// ─── Create ────────────────────────────────────────────────────────────────────

/**
 * Inserts a new notification for the target user.
 * Can be called by any authenticated user (e.g., a doctor notifying a patient).
 */
export const createNotification = async (
  userId: string,
  title: string,
  body: string,
): Promise<void> => {
  try {
    const { error } = await supabase.from('notifications').insert([
      {
        user_id: userId,
        title,
        body,
      },
    ]);
    if (error) throw error;
  } catch (err) {
    console.error('NotificationService: createNotification failed', err);
    // Non-blocking — don't throw, notifications are secondary to core flow
  }
};

// ─── Fetch Unread ──────────────────────────────────────────────────────────────

/**
 * Fetches all unread notifications for a user, newest first.
 */
export const getUnreadNotifications = async (
  userId: string,
): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Notification[];
  } catch (err) {
    console.error('NotificationService: getUnreadNotifications failed', err);
    return [];
  }
};

// ─── Mark as Read ──────────────────────────────────────────────────────────────

/**
 * Marks a single notification as read.
 */
export const markAsRead = async (notificationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    if (error) throw error;
  } catch (err) {
    console.error('NotificationService: markAsRead failed', err);
  }
};

// ─── Realtime Subscription ─────────────────────────────────────────────────────

/**
 * Subscribes to new notifications for a user via Supabase Realtime.
 * Returns the channel object for cleanup.
 */
export const subscribeToNotifications = (
  userId: string,
  onNewNotification: (notification: Notification) => void,
) => {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNewNotification(payload.new as Notification);
      },
    )
    .subscribe();

  return channel;
};
