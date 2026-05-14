/**
 * PrescriptionsScreen (v1.0)
 *
 * Patient-facing screen for viewing all prescriptions.
 * Displayed as a tab in PatientNavigator.
 *
 * Features:
 * - List of prescription cards sorted by date (newest first)
 * - Each card shows doctor name, diagnosis, medications, notes
 * - Pull-to-refresh
 * - Realtime subscription for new prescriptions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Text,
  useTheme,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { supabase } from '../../services/supabaseSetup';
import {
  getPatientPrescriptions,
  PrescriptionData,
  MedicationItem,
} from '../../services/prescriptionService';

// ─── Component ─────────────────────────────────────────────────────────────────

export default function PrescriptionsScreen() {
  const theme = useTheme();
  const { userId } = useSelector((state: RootState) => state.auth);

  const [prescriptions, setPrescriptions] = useState<PrescriptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch prescriptions ───────────────────────────────────────────────────

  const fetchPrescriptions = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getPatientPrescriptions(userId);
      setPrescriptions(data);
    } catch (err) {
      console.error('PrescriptionsScreen: fetch failed', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // ── Realtime subscription ─────────────────────────────────────────────────

  useEffect(() => {
    fetchPrescriptions();

    const channel = supabase
      .channel('patient-prescriptions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'prescriptions',
          filter: `patient_id=eq.${userId}`,
        },
        () => {
          // Re-fetch to get joined data (doctor name, etc.)
          fetchPrescriptions();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPrescriptions, userId]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────

  const onRefresh = () => {
    setRefreshing(true);
    fetchPrescriptions();
  };

  // ── Format date ───────────────────────────────────────────────────────────

  const formatDate = (isoString?: string): string => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.headerInfo}>
        <Text style={styles.subtitle}>
          {prescriptions.length} prescription(s)
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator animating size="large" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.listContainer}>
          {prescriptions.length > 0 ? (
            prescriptions.map((rx) => (
              <Card key={rx.id} style={styles.card}>
                <Card.Content>
                  {/* Header: Doctor + Date */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Icon
                        name="stethoscope"
                        size={20}
                        color={theme.colors.primary}
                        style={{ marginRight: 8 }}
                      />
                      <Title style={styles.doctorName}>
                        {rx.doctorName ?? 'Doctor'}
                      </Title>
                    </View>
                    <Text style={styles.dateText}>
                      {formatDate(rx.createdAt)}
                    </Text>
                  </View>

                  {/* Diagnosis */}
                  {rx.diagnosis ? (
                    <View style={styles.diagnosisContainer}>
                      <Icon
                        name="clipboard-text"
                        size={16}
                        color="#e65100"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.diagnosisText}>
                        {rx.diagnosis}
                      </Text>
                    </View>
                  ) : null}

                  <Divider style={styles.divider} />

                  {/* Medications */}
                  <Text style={styles.medsLabel}>
                    <Icon name="pill" size={14} color="#2e7d32" /> Medications
                  </Text>
                  {rx.medications.map((med: MedicationItem, idx: number) => (
                    <View key={idx} style={styles.medItem}>
                      <Text style={styles.medName}>
                        {idx + 1}. {med.name}
                      </Text>
                      <Text style={styles.medDetails}>
                        {med.dosage} · {med.frequency} · {med.duration}
                      </Text>
                    </View>
                  ))}

                  {/* Doctor's Notes */}
                  {rx.doctorNotes ? (
                    <>
                      <Divider style={styles.divider} />
                      <View style={styles.notesContainer}>
                        <Icon
                          name="note-text"
                          size={16}
                          color="#5e35b1"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.notesText}>
                          {rx.doctorNotes}
                        </Text>
                      </View>
                    </>
                  ) : null}
                </Card.Content>
              </Card>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="pill" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No prescriptions yet.</Text>
              <Text style={styles.emptySubtext}>
                Prescriptions from your doctor will appear here.
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
  headerInfo: {
    marginBottom: 16,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#7c4dff',
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  doctorName: {
    fontSize: 17,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    color: '#888',
  },
  diagnosisContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  diagnosisText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e65100',
    flex: 1,
  },
  divider: {
    marginVertical: 10,
  },
  medsLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  medItem: {
    marginBottom: 8,
    paddingLeft: 8,
  },
  medName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  medDetails: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    paddingLeft: 16,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ede7f6',
    padding: 10,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 13,
    color: '#4527a0',
    flex: 1,
    fontStyle: 'italic',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  emptyText: {
    color: '#333',
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
    fontSize: 16,
  },
  emptySubtext: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
