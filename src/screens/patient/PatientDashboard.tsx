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
import { formatGeneratedAt } from '../../utils/formatTokenDate';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TokenItem {
  id: string;
  token: number;
  tokenNumber: string;  // Formatted token: GN-22MAR-0001
  doctorId: string | null;
  doctorName: string;
  reason: string;
  reasonForVisit: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
  visitDate: string;
  generatedAt: string;
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
          id, token, token_number, reason, reason_for_visit, status, visit_date, generated_at,
          doctor_id,
          doctors ( users ( name ) )
        `)
        .eq('patient_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: TokenItem[] = (data ?? []).map((a: Record<string, unknown>) => ({
        id: a.id as string,
        token: (a.token as number) ?? 0,
        tokenNumber: (a.token_number as string) ?? `#${a.token ?? 0}`,
        doctorId: a.doctor_id as string | null,
        doctorName: (a.doctors as Record<string, unknown>)?.users
          ? `Dr. ${((a.doctors as Record<string, unknown>).users as Record<string, unknown>)?.name}`
          : 'Any Available Doctor',
        reason: (a.reason as string) ?? '',
        reasonForVisit: (a.reason_for_visit as string) ?? '',
        status: a.status as TokenItem['status'],
        visitDate: a.visit_date as string,
        generatedAt: (a.generated_at as string) ?? (a.created_at as string),
      }));

      setTokens(mapped);
    } catch (err) {
      console.error('PatientDashboard: fetch tokens failed', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // ── Realtime subscription (smart state patching — no full re-fetch per event) ──

  useEffect(() => {
    // Initial load
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
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload as any;

          if (eventType === 'INSERT') {
            // New token assigned — do a targeted fetch since we need the joined doctor name
            fetchTokens();
          } else if (eventType === 'UPDATE' && newRow) {
            // Status change — patch in place, no full re-fetch needed
            setTokens((prev) =>
              prev.map((t) =>
                t.id === newRow.id
                  ? { ...t, status: newRow.status as TokenItem['status'] }
                  : t,
              ),
            );
          } else if (eventType === 'DELETE' && oldRow) {
            setTokens((prev) => prev.filter((t) => t.id !== oldRow.id));
          }
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
                      <Text style={styles.tokenBadgeText}>{token.tokenNumber}</Text>
                    </View>
                    <Title style={styles.dateText}>
                      {formatGeneratedAt(token.generatedAt)}
                    </Title>
                  </View>

                  <Paragraph>
                    <Text style={{ fontWeight: 'bold' }}>Reason:</Text>{' '}
                    {token.reasonForVisit || token.reason}
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
