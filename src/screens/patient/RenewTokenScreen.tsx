import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Title, Button, Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { supabase } from '../../services/supabaseSetup';
import { createAppointment } from '../../services/appointmentService';
import { createNotification } from '../../services/NotificationService';

// ─── Constants ─────────────────────────────────────────────────────────────────

const DOCTOR_CATEGORIES = [
  'General Physician',
  'ENT',
  'Pediatrics',
  'Orthopedics',
  'Dermatology',
] as const;

const VISIT_REASONS = [
  'General Consultation',
  'Follow-up',
  'Prescription Renewal',
  'Report Checking',
] as const;

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DoctorOption {
  id: string;
  name: string;
  specialty: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function RenewTokenScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [reason, setReason] = useState<string>(VISIT_REASONS[0]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const theme = useTheme();
  const { userId, userName } = useSelector((state: RootState) => state.auth);

  // ── Fetch doctors from Supabase ────────────────────────────────────────────

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data, error } = await supabase
          .from('doctors')
          .select('id, speciality, users ( name )');

        if (error) throw error;

        const mapped: DoctorOption[] = (data ?? []).map((d: any) => ({
          id: d.id,
          name: d.users?.name ?? 'Doctor',
          specialty: d.speciality ?? 'General Physician',
        }));

        setDoctors(mapped);
      } catch (err) {
        console.error('RenewTokenScreen: fetch doctors failed', err);
        Alert.alert('Error', 'Could not load doctors. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  // ── Filter doctors by category ─────────────────────────────────────────────

  useEffect(() => {
    if (!selectedCategory) {
      setFilteredDoctors(doctors);
    } else {
      setFilteredDoctors(
        doctors.filter((d) => d.specialty === selectedCategory),
      );
    }
    setSelectedDoctorId(''); // Reset doctor selection when category changes
  }, [selectedCategory, doctors]);

  // ── Create token ───────────────────────────────────────────────────────────

  const handleCreateToken = async () => {
    if (!userId) return;

    if (!selectedDoctorId) {
      Alert.alert(
        'Selection Required',
        'Please select a specific doctor to generate a systematic token.',
      );
      return;
    }

    setCreating(true);
    try {
      const todayDate = new Date().toISOString().split('T')[0];

      // Count existing today's tokens for this doctor to derive the next token number
      const { count, error: countError } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('doctor_id', selectedDoctorId)
        .eq('visit_date', todayDate);

      if (countError) throw countError;

      const tokenQueueNumber = (count ?? 0) + 1;

      // Create the appointment via the service layer
      await createAppointment({
        patientId: userId,
        doctorId: selectedDoctorId,
        token: tokenQueueNumber,
        reason,
        status: 'WAITING',
        visit_date: todayDate,
      });

      // Notify the doctor about the new patient in their queue
      const selectedDoc = filteredDoctors.find((d) => d.id === selectedDoctorId);
      createNotification(
        selectedDoctorId,
        'New patient queued',
        `Patient ${userName} added to your queue. Token #${tokenQueueNumber}.`,
      );

      Alert.alert(
        'Token Created',
        `You are patient #${tokenQueueNumber} today for this doctor.\n\nYour visit token has been successfully created. Please check your Dashboard.`,
      );
    } catch (err: any) {
      console.error('RenewTokenScreen: token creation failed', err);
      Alert.alert(
        'Token Creation Failed',
        err.message || 'An error occurred. Please try again.',
      );
    } finally {
      setCreating(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background, justifyContent: 'center' },
        ]}
      >
        <ActivityIndicator animating size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Title style={styles.title}>Renew Visit Token</Title>

      <View style={styles.card}>
        {/* Category Picker */}
        <Text style={styles.label}>Select Doctor Category</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCategory}
            onValueChange={(val) => setSelectedCategory(val)}
            dropdownIconColor="#000"
          >
            <Picker.Item label="-- All Categories --" value="" />
            {DOCTOR_CATEGORIES.map((cat) => (
              <Picker.Item key={cat} label={cat} value={cat} />
            ))}
          </Picker>
        </View>

        {/* Doctor Picker */}
        <Text style={styles.label}>Select Doctor</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedDoctorId}
            onValueChange={(val) => setSelectedDoctorId(val)}
            dropdownIconColor="#000"
          >
            <Picker.Item label="-- Choose your Doctor --" value="" enabled={false} />
            {filteredDoctors.map((doc) => (
              <Picker.Item
                key={doc.id}
                label={`Dr. ${doc.name} (${doc.specialty})`}
                value={doc.id}
              />
            ))}
          </Picker>
        </View>

        {filteredDoctors.length === 0 && selectedCategory !== '' && (
          <Text style={styles.noDoctorsText}>
            No doctors available in this category.
          </Text>
        )}

        {/* Reason Picker */}
        <Text style={styles.label}>Reason for Visit</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={reason}
            onValueChange={(val) => setReason(val)}
          >
            {VISIT_REASONS.map((r) => (
              <Picker.Item key={r} label={r} value={r} />
            ))}
          </Picker>
        </View>

        <Button
          mode="contained"
          onPress={handleCreateToken}
          style={styles.button}
          loading={creating}
          disabled={creating}
        >
          Generate Token
        </Button>
      </View>
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    marginTop: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 24,
  },
  noDoctorsText: {
    color: '#e53935',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 16,
    marginTop: -16,
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  },
});
