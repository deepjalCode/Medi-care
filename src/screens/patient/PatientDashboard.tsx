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
  Modal,
  Portal,
  Divider,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { supabase } from '../../services/supabaseSetup';
import { formatGeneratedAt } from '../../utils/formatTokenDate';
import {
  getPrescriptionsByAppointment,
  PrescriptionData,
  MedicationItem,
} from '../../services/prescriptionService';

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

  // Prescription modal state
  const [rxModalVisible, setRxModalVisible] = useState(false);
  const [rxLoading, setRxLoading] = useState(false);
  const [selectedRx, setSelectedRx] = useState<PrescriptionData | null>(null);
  const [selectedDoctorName, setSelectedDoctorName] = useState('');

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

  // ── View Prescription handler ─────────────────────────────────────────────

  const handleViewPrescription = async (appointmentId: string, doctorName: string) => {
    setSelectedDoctorName(doctorName);
    setRxModalVisible(true);
    setRxLoading(true);
    setSelectedRx(null);
    try {
      const prescriptions = await getPrescriptionsByAppointment(appointmentId);
      setSelectedRx(prescriptions.length > 0 ? prescriptions[0] : null);
    } catch (err) {
      console.error('PatientDashboard: fetch prescription failed', err);
    } finally {
      setRxLoading(false);
    }
  };

  const formatRxDate = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
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

                  {/* View Prescription button — visible for COMPLETED visits */}
                  {token.status === 'COMPLETED' && (
                    <Button
                      mode="outlined"
                      onPress={() => handleViewPrescription(token.id, token.doctorName)}
                      style={styles.rxButton}
                      icon="pill"
                      textColor="#7c4dff"
                      compact
                    >
                      View Prescription
                    </Button>
                  )}
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

    {/* ── Prescription Detail Modal ──────────────────────────────────────── */}
    <Portal>
      <Modal
        visible={rxModalVisible}
        onDismiss={() => setRxModalVisible(false)}
        contentContainerStyle={styles.rxModal}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.rxModalHeader}>
            <Icon name="pill" size={28} color="#7c4dff" />
            <Title style={styles.rxModalTitle}>Prescription</Title>
          </View>
          <Text style={styles.rxModalDoctor}>{selectedDoctorName}</Text>

          <Divider style={styles.rxDivider} />

          {rxLoading ? (
            <ActivityIndicator animating style={{ marginVertical: 30 }} />
          ) : selectedRx ? (
            <>
              {/* Diagnosis */}
              {selectedRx.diagnosis ? (
                <View style={styles.rxDiagnosisBox}>
                  <Icon name="clipboard-text" size={16} color="#e65100" style={{ marginRight: 6 }} />
                  <Text style={styles.rxDiagnosisText}>{selectedRx.diagnosis}</Text>
                </View>
              ) : null}

              {/* Medications */}
              <Text style={styles.rxSectionLabel}>
                <Icon name="pill" size={14} color="#2e7d32" />  Medications
              </Text>
              {selectedRx.medications.map((med: MedicationItem, idx: number) => (
                <View key={idx} style={styles.rxMedItem}>
                  <Text style={styles.rxMedName}>{idx + 1}. {med.name}</Text>
                  <Text style={styles.rxMedDetails}>
                    {med.dosage} · {med.frequency} · {med.duration}
                  </Text>
                </View>
              ))}

              {/* Doctor's Notes */}
              {selectedRx.doctorNotes ? (
                <>
                  <Divider style={styles.rxDivider} />
                  <View style={styles.rxNotesBox}>
                    <Icon name="note-text" size={16} color="#5e35b1" style={{ marginRight: 6 }} />
                    <Text style={styles.rxNotesText}>{selectedRx.doctorNotes}</Text>
                  </View>
                </>
              ) : null}

              {selectedRx.createdAt ? (
                <Text style={styles.rxDate}>Prescribed on {formatRxDate(selectedRx.createdAt)}</Text>
              ) : null}
            </>
          ) : (
            <View style={styles.rxEmptyState}>
              <Icon name="pill-off" size={40} color="#ccc" />
              <Text style={styles.rxEmptyText}>No prescription found for this visit.</Text>
            </View>
          )}

          <Button
            mode="contained"
            onPress={() => setRxModalVisible(false)}
            style={styles.rxCloseBtn}
          >
            Close
          </Button>
        </ScrollView>
      </Modal>
    </Portal>
  </>
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
  rxButton: {
    marginTop: 12,
    borderColor: '#7c4dff',
    alignSelf: 'flex-start',
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
  // ── Prescription Modal Styles ────────────────────────────────────────────
  rxModal: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  rxModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rxModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  rxModalDoctor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  rxDivider: {
    marginVertical: 12,
  },
  rxDiagnosisBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  rxDiagnosisText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e65100',
    flex: 1,
  },
  rxSectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  rxMedItem: {
    marginBottom: 8,
    paddingLeft: 8,
  },
  rxMedName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  rxMedDetails: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    paddingLeft: 16,
  },
  rxNotesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ede7f6',
    padding: 10,
    borderRadius: 8,
  },
  rxNotesText: {
    fontSize: 13,
    color: '#4527a0',
    flex: 1,
    fontStyle: 'italic',
  },
  rxDate: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
    marginTop: 12,
  },
  rxEmptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  rxEmptyText: {
    color: '#888',
    marginTop: 8,
    fontStyle: 'italic',
  },
  rxCloseBtn: {
    marginTop: 16,
  },
});
