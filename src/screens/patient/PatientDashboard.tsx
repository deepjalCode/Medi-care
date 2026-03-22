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

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TokenItem {
  id: string;
  token: number;
  doctorId: string | null;
  doctorName: string;
  reason: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
  visitDate: string;
  createdAt: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function PatientDashboard() {
  const theme = useTheme();
  const dispatch = useDispatch();

  const { userId, userName } = useSelector((state: RootState) => state.auth);

  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch tokens from Supabase ─────────────────────────────────────────────

  const fetchTokens = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id, token, reason, status, visit_date, created_at,
          doctor_id,
          doctors ( users ( name ) )
        `)
        .eq('patient_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: TokenItem[] = (data ?? []).map((a: any) => ({
        id: a.id,
        token: a.token ?? 0,
        doctorId: a.doctor_id,
        doctorName: a.doctors?.users?.name
          ? `Dr. ${a.doctors.users.name}`
          : 'Any Available Doctor',
        reason: a.reason ?? '',
        status: a.status,
        visitDate: a.visit_date,
        createdAt: a.created_at,
      }));

      setTokens(mapped);
    } catch (err) {
      console.error('PatientDashboard: fetch tokens failed', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // ── Realtime subscription ──────────────────────────────────────────────────

  useEffect(() => {
    fetchTokens();

    const channel = supabase
      .channel('patient-tokens')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${userId}`,
        },
        () => {
          fetchTokens(); // Re-fetch on any change to this patient's tokens
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTokens, userId]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING':
        return '#ffb300';
      case 'IN_PROGRESS':
        return '#1e88e5';
      case 'COMPLETED':
        return '#4caf50';
      default:
        return '#888';
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTokens();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.tokenInfo}>
        <Text style={styles.subtitle}>{tokens.length} token(s) total</Text>
      </View>

      {loading ? (
        <ActivityIndicator animating size="large" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.tokensContainer}>
          {tokens.length > 0 ? (
            tokens.map((token) => (
              <Card key={token.id} style={styles.card}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={styles.tokenBadge}>
                      <Text style={styles.tokenBadgeText}>#{token.token}</Text>
                    </View>
                    <Title style={styles.dateText}>
                      {new Date(token.visitDate).toLocaleDateString()}
                    </Title>
                  </View>

                  <Paragraph>
                    <Text style={{ fontWeight: 'bold' }}>Reason:</Text>{' '}
                    {token.reason}
                  </Paragraph>
                  <Paragraph>
                    <Text style={{ fontWeight: 'bold' }}>Assigned to:</Text>{' '}
                    {token.doctorName}
                  </Paragraph>

                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(token.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {token.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                You don't have any visit tokens.
              </Text>
              <Text style={styles.emptySubtext}>
                Use the Renew Token tab to generate one.
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
  tokenInfo: {
    marginBottom: 16,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  tokensContainer: {
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#6200ee',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tokenBadge: {
    backgroundColor: '#ede7f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
  },
  tokenBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5e35b1',
  },
  dateText: {
    fontSize: 16,
  },
  statusRow: {
    marginTop: 12,
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  emptyText: {
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
