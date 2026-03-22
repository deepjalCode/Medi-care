import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Title,
  Card,
  Paragraph,
  Button,
  Text,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { supabase } from '../../services/supabaseSetup';
import { createNotification } from '../../services/NotificationService';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface QueueItem {
  id: string;
  patientId: string;
  patientName: string;
  token: number;
  reason: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function DoctorDashboard() {
  const theme = useTheme();
  const dispatch = useDispatch();

  const { userId, userName } = useSelector((state: RootState) => state.auth);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // ── Fetch queue from Supabase ──────────────────────────────────────────────

  const fetchQueue = useCallback(async () => {
    if (!userId) return;
    try {
      const todayDate = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, token, reason, status, created_at,
          patient_id,
          patients ( users ( name ) )
        `)
        .eq('doctor_id', userId)
        .eq('visit_date', todayDate)
        .neq('status', 'COMPLETED')
        .order('created_at', { ascending: true }); // FCFS

      if (error) throw error;

      const mapped: QueueItem[] = (data ?? []).map((a: any) => ({
        id: a.id,
        patientId: a.patient_id,
        patientName: a.patients?.users?.name ?? 'Unknown',
        token: a.token ?? 0,
        reason: a.reason ?? '',
        status: a.status,
        createdAt: a.created_at,
      }));

      setQueue(mapped);
    } catch (err) {
      console.error('DoctorDashboard: fetch queue failed', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // ── Realtime subscription ──────────────────────────────────────────────────

  useEffect(() => {
    fetchQueue();

    const channel = supabase
      .channel('doctor-queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${userId}`,
        },
        () => {
          fetchQueue(); // Re-fetch on any change to this doctor's appointments
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchQueue, userId]);

  // ── Status update ──────────────────────────────────────────────────────────

  const handleUpdateStatus = async (
    appointmentId: string,
    patientUserId: string,
    newStatus: 'IN_PROGRESS' | 'COMPLETED',
  ) => {
    setUpdating(appointmentId);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      // Send notification to patient when called in
      if (newStatus === 'IN_PROGRESS') {
        createNotification(
          patientUserId,
          'Your turn is next',
          `Please proceed to Dr. ${userName}'s room.`,
        );
      }
    } catch (err) {
      console.error('DoctorDashboard: status update failed', err);
    } finally {
      setUpdating(null);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ── Pull-to-refresh ────────────────────────────────────────────────────────

  const onRefresh = () => {
    setRefreshing(true);
    fetchQueue();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.queueInfo}>
        <Text style={styles.subtitle}>{queue.length} patient(s) waiting</Text>
      </View>

      {loading ? (
        <ActivityIndicator animating size="large" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.queueContainer}>
          {queue.length > 0 ? (
            queue.map((appt) => (
              <Card key={appt.id} style={styles.card}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={styles.tokenBadge}>
                      <Text style={styles.tokenBadgeText}>#{appt.token}</Text>
                    </View>
                    <Title style={styles.patientName}>
                      {appt.patientName}
                    </Title>
                  </View>

                  <Paragraph>
                    <Text style={{ fontWeight: 'bold' }}>Reason:</Text>{' '}
                    {appt.reason}
                  </Paragraph>
                  <Paragraph>
                    <Text style={{ fontWeight: 'bold' }}>Registered:</Text>{' '}
                    {formatTime(appt.createdAt)}
                  </Paragraph>
                  <Paragraph>
                    <Text style={{ fontWeight: 'bold' }}>Status:</Text>{' '}
                    {appt.status.replace('_', ' ')}
                  </Paragraph>

                  <View style={styles.actionRow}>
                    {appt.status === 'WAITING' && (
                      <Button
                        mode="contained"
                        onPress={() =>
                          handleUpdateStatus(appt.id, appt.patientId, 'IN_PROGRESS')
                        }
                        style={styles.actionBtn}
                        loading={updating === appt.id}
                        disabled={updating === appt.id}
                      >
                        Call In
                      </Button>
                    )}
                    {appt.status === 'IN_PROGRESS' && (
                      <Button
                        mode="contained"
                        buttonColor="#4caf50"
                        onPress={() =>
                          handleUpdateStatus(appt.id, appt.patientId, 'COMPLETED')
                        }
                        style={styles.actionBtn}
                        loading={updating === appt.id}
                        disabled={updating === appt.id}
                      >
                        Mark Done
                      </Button>
                    )}
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No patients waiting in your queue.
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  queueInfo: {
    marginBottom: 16,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  queueContainer: {
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#03dac6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tokenBadge: {
    backgroundColor: '#e8eaf6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
  },
  tokenBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3949ab',
  },
  patientName: {
    fontSize: 18,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionBtn: {
    marginRight: 8,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
  },
});
