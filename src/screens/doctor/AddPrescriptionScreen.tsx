/**
 * AddPrescriptionScreen (v1.0)
 *
 * Doctor-facing screen for creating a prescription for a patient.
 * Pushed as a stack screen from DoctorDashboard.
 *
 * Features:
 * - Patient info header (name + token)
 * - Diagnosis text input
 * - Dynamic medications list (add/remove rows)
 * - Doctor's notes
 * - Submit with validation
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Title,
  Text,
  TextInput,
  Button,
  Card,
  IconButton,
  useTheme,
  Divider,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  createPrescription,
  MedicationItem,
} from '../../services/prescriptionService';
import { createNotification } from '../../services/NotificationService';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RouteParams {
  patientId: string;
  patientName: string;
  appointmentId?: string;
  tokenNumber?: string;
}

const EMPTY_MEDICATION: MedicationItem = {
  name: '',
  dosage: '',
  frequency: '',
  duration: '',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AddPrescriptionScreen({ route, navigation }: any) {
  const theme = useTheme();
  const { userId, userName } = useSelector((state: RootState) => state.auth);

  const {
    patientId,
    patientName,
    appointmentId,
    tokenNumber,
  } = (route.params ?? {}) as RouteParams;

  // ── State ─────────────────────────────────────────────────────────────────

  const [diagnosis, setDiagnosis] = useState('');
  const [medications, setMedications] = useState<MedicationItem[]>([
    { ...EMPTY_MEDICATION },
  ]);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Medication Handlers ───────────────────────────────────────────────────

  const addMedication = () => {
    setMedications((prev) => [...prev, { ...EMPTY_MEDICATION }]);
  };

  const removeMedication = (index: number) => {
    if (medications.length <= 1) {
      Alert.alert('Required', 'At least one medication is required.');
      return;
    }
    setMedications((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMedication = (
    index: number,
    field: keyof MedicationItem,
    value: string,
  ) => {
    setMedications((prev) =>
      prev.map((med, i) => (i === index ? { ...med, [field]: value } : med)),
    );
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    if (!diagnosis.trim()) {
      Alert.alert('Validation', 'Please enter a diagnosis.');
      return false;
    }

    for (let i = 0; i < medications.length; i++) {
      const med = medications[i];
      if (!med.name.trim()) {
        Alert.alert(
          'Validation',
          `Please enter the medication name for item #${i + 1}.`,
        );
        return false;
      }
      if (!med.dosage.trim()) {
        Alert.alert(
          'Validation',
          `Please enter the dosage for "${med.name}".`,
        );
        return false;
      }
      if (!med.frequency.trim()) {
        Alert.alert(
          'Validation',
          `Please enter the frequency for "${med.name}".`,
        );
        return false;
      }
      if (!med.duration.trim()) {
        Alert.alert(
          'Validation',
          `Please enter the duration for "${med.name}".`,
        );
        return false;
      }
    }

    return true;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!userId || !patientId) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      await createPrescription({
        appointmentId,
        patientId,
        doctorId: userId,
        medications: medications.map((m) => ({
          name: m.name.trim(),
          dosage: m.dosage.trim(),
          frequency: m.frequency.trim(),
          duration: m.duration.trim(),
        })),
        diagnosis: diagnosis.trim(),
        doctorNotes: doctorNotes.trim(),
      });

      // Notify the patient
      createNotification(
        patientId,
        'New Prescription',
        `Dr. ${userName} has added a prescription for you.`,
      );

      Alert.alert(
        'Prescription Saved',
        `Prescription for ${patientName} has been saved successfully.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An error occurred.';
      console.error('AddPrescriptionScreen: submit failed', err);
      Alert.alert('Error', `Failed to save prescription: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Patient Info Header */}
        <Card style={styles.patientCard}>
          <Card.Content style={styles.patientCardContent}>
            <Icon
              name="account-circle"
              size={40}
              color={theme.colors.primary}
            />
            <View style={styles.patientInfo}>
              <Title style={styles.patientName}>{patientName}</Title>
              {tokenNumber ? (
                <Text style={styles.tokenText}>Token: {tokenNumber}</Text>
              ) : null}
            </View>
          </Card.Content>
        </Card>

        {/* Diagnosis */}
        <Text style={styles.sectionLabel}>Diagnosis *</Text>
        <TextInput
          mode="outlined"
          value={diagnosis}
          onChangeText={setDiagnosis}
          placeholder="e.g. Acute pharyngitis"
          maxLength={200}
          style={styles.textInput}
        />

        {/* Medications */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Medications *</Text>
          <Button
            mode="text"
            onPress={addMedication}
            icon="plus-circle"
            compact
            labelStyle={styles.addBtnLabel}
          >
            Add More
          </Button>
        </View>

        {medications.map((med, index) => (
          <Card key={index} style={styles.medicationCard}>
            <Card.Content>
              <View style={styles.medHeader}>
                <Text style={styles.medNumber}>#{index + 1}</Text>
                {medications.length > 1 && (
                  <IconButton
                    icon="close-circle"
                    iconColor="#e53935"
                    size={20}
                    onPress={() => removeMedication(index)}
                    style={styles.removeBtn}
                  />
                )}
              </View>

              <TextInput
                mode="outlined"
                label="Medication Name"
                value={med.name}
                onChangeText={(v) => updateMedication(index, 'name', v)}
                placeholder="e.g. Paracetamol"
                maxLength={100}
                style={styles.medInput}
                dense
              />
              <View style={styles.medRow}>
                <TextInput
                  mode="outlined"
                  label="Dosage"
                  value={med.dosage}
                  onChangeText={(v) => updateMedication(index, 'dosage', v)}
                  placeholder="e.g. 500mg"
                  maxLength={50}
                  style={[styles.medInput, styles.medInputHalf]}
                  dense
                />
                <TextInput
                  mode="outlined"
                  label="Frequency"
                  value={med.frequency}
                  onChangeText={(v) => updateMedication(index, 'frequency', v)}
                  placeholder="e.g. Twice daily"
                  maxLength={50}
                  style={[styles.medInput, styles.medInputHalf]}
                  dense
                />
              </View>
              <TextInput
                mode="outlined"
                label="Duration"
                value={med.duration}
                onChangeText={(v) => updateMedication(index, 'duration', v)}
                placeholder="e.g. 5 days"
                maxLength={50}
                style={styles.medInput}
                dense
              />
            </Card.Content>
          </Card>
        ))}

        {/* Doctor's Notes */}
        <Text style={styles.sectionLabel}>Doctor's Notes</Text>
        <TextInput
          mode="outlined"
          value={doctorNotes}
          onChangeText={setDoctorNotes}
          placeholder="Additional instructions or notes…"
          multiline
          numberOfLines={4}
          maxLength={500}
          style={styles.textInput}
        />
        <Text style={styles.charCounter}>
          {doctorNotes.length}/500
        </Text>

        <Divider style={styles.divider} />

        {/* Submit */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitBtn}
          loading={submitting}
          disabled={submitting}
          icon="content-save-check"
        >
          Save Prescription
        </Button>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  patientCard: {
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#03dac6',
    elevation: 2,
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
  tokenText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  addBtnLabel: {
    fontSize: 13,
  },
  textInput: {
    marginBottom: 12,
    fontSize: 14,
  },
  medicationCard: {
    marginBottom: 12,
    elevation: 1,
    backgroundColor: '#fafafa',
  },
  medHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  medNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3949ab',
  },
  removeBtn: {
    margin: 0,
  },
  medInput: {
    marginBottom: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  medRow: {
    flexDirection: 'row',
    gap: 8,
  },
  medInputHalf: {
    flex: 1,
  },
  charCounter: {
    fontSize: 11,
    color: '#888',
    textAlign: 'right',
    marginBottom: 8,
    marginTop: -8,
  },
  divider: {
    marginVertical: 16,
  },
  submitBtn: {
    paddingVertical: 8,
  },
});
