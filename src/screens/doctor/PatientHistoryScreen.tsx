/**
 * PatientHistoryScreen (v1.0)
 *
 * Doctor-facing screen for viewing a returning patient's full
 * prescription history. Pushed as a stack screen from PatientSearchScreen
 * or DoctorDashboard.
 *
 * Features:
 * - Patient info header (name + display ID)
 * - Full prescription history from all doctors
 * - Each card shows doctor name, diagnosis, medications, notes, date
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Card,
  Title,
  Text,
  useTheme,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  getPatientPrescriptionHistory,
  PrescriptionData,
  MedicationItem,
} from '../../services/prescriptionService';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RouteParams {
  patientId: string;
  patientName: string;
  patientDisplayId: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function PatientHistoryScreen({ route }: any) {
  const theme = useTheme();
  const {
    patientId,
    patientName,
    patientDisplayId,
  } = (route.params ?? {}) as RouteParams;

  const [prescriptions, setPrescriptions] = useState<PrescriptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch history ─────────────────────────────────────────────────────────

  const fetchHistory = useCallback(async () => {
    if (!patientId) return;
    try {
      const data = await getPatientPrescriptionHistory(patientId);
      setPrescriptions(data);
    } catch (err) {
      console.error('PatientHistoryScreen: fetch failed', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
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
      {/* Patient Info Header */}
      <Card style={styles.patientCard}>
        <Card.Content style={styles.patientCardContent}>
          <Icon
            name="account-circle"
            size={44}
            color={theme.colors.primary}
          />
          <View style={styles.patientInfo}>
            <Title style={styles.patientName}>{patientName}</Title>
            <Text style={styles.patientIdText}>{patientDisplayId}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Prescription Count */}
      <View style={styles.headerInfo}>
        <Text style={styles.subtitle}>
          {prescriptions.length} prescription(s) on record
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
              <Icon name="pill-off" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No prescription history.</Text>
              <Text style={styles.emptySubtext}>
                This patient has no prescriptions on record.
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
  patientCard: {
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#03dac6',
    elevation: 2,
    borderRadius: 12,
  },
  patientCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientInfo: {
    marginLeft: 12,
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  patientIdText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  headerInfo: {
    marginBottom: 16,
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
