/**
 * RenewTokenScreen (v2.0)
 *
 * Changes:
 * - Removed hardcoded DOCTOR_CATEGORIES — categories fetched from DB
 * - Token generation now uses atomic generate_token RPC via appointmentService
 * - Added reason_for_visit text input (mandatory, min 5 chars)
 * - Uses doctorService for dynamic doctor/category data
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Title, Button, Text, TextInput, useTheme, ActivityIndicator } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { createAppointment } from '../../services/appointmentService';
import { createNotification } from '../../services/NotificationService';
import { getDoctorCategories, getDoctorsByCategory, DoctorCategory, DoctorOption } from '../../services/doctorService';

// ─── Component ─────────────────────────────────────────────────────────────────

export default function RenewTokenScreen() {
  const [categories, setCategories] = useState<DoctorCategory[]>([]);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [reasonForVisit, setReasonForVisit] = useState<string>('');
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const theme = useTheme();
  const { userId, userName } = useSelector((state: RootState) => state.auth);

  // ── Fetch categories and doctors from Supabase ─────────────────────────────

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cats, docs] = await Promise.all([
          getDoctorCategories(),
          getDoctorsByCategory(),
        ]);
        setCategories(cats);
        setDoctors(docs);
      } catch (err) {
        console.error('RenewTokenScreen: fetch data failed', err);
        Alert.alert('Error', 'Could not load doctors. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ── Filter doctors by category ─────────────────────────────────────────────

  useEffect(() => {
    if (!selectedCategoryCode) {
      setFilteredDoctors(doctors);
    } else {
      setFilteredDoctors(
        doctors.filter((d) => d.categoryCode === selectedCategoryCode),
      );
    }
    setSelectedDoctorId(''); // Reset doctor selection when category changes
  }, [selectedCategoryCode, doctors]);

  // ── Create token ───────────────────────────────────────────────────────────

  const handleCreateToken = async () => {
    if (!userId) return;

    if (!selectedDoctorId) {
      Alert.alert(
        'Selection Required',
        'Please select a specific doctor to generate a token.',
      );
      return;
    }

    if (!reasonForVisit.trim() || reasonForVisit.trim().length < 5) {
      Alert.alert(
        'Reason Required',
        'Please enter a reason for your visit (minimum 5 characters).',
      );
      return;
    }

    setCreating(true);
    try {
      // Determine category code — use selected or fall back to doctor's category
      const selectedDoc = filteredDoctors.find((d) => d.id === selectedDoctorId);
      const categoryCode = selectedCategoryCode || selectedDoc?.categoryCode || 'GN';

      const appointment = await createAppointment({
        patientId: userId,
        doctorId: selectedDoctorId,
        categoryCode,
        reason: reasonForVisit.trim(),
        reasonForVisit: reasonForVisit.trim(),
      });

      // Notify the doctor about the new patient in their queue
      createNotification(
        selectedDoctorId,
        'New patient queued',
        `Patient ${userName} added to your queue. Token: ${appointment.tokenNumber}.`,
      );

      Alert.alert(
        'Token Created',
        `Your token: ${appointment.tokenNumber}\n\nPlease check your Dashboard for updates.`,
      );

      setReasonForVisit('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred.';
      console.error('RenewTokenScreen: token creation failed', err);
      Alert.alert('Token Creation Failed', message);
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
        {/* Category Picker — dynamically loaded from DB */}
        <Text style={styles.label}>Select Doctor Category</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCategoryCode}
            onValueChange={(val) => setSelectedCategoryCode(val)}
            dropdownIconColor="#000"
          >
            <Picker.Item label="-- All Categories --" value="" />
            {categories.map((cat) => (
              <Picker.Item key={cat.categoryCode} label={cat.category} value={cat.categoryCode} />
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

        {filteredDoctors.length === 0 && selectedCategoryCode !== '' && (
          <Text style={styles.noDoctorsText}>
            No doctors available in this category.
          </Text>
        )}

        {/* Reason for Visit — mandatory free-text input */}
        <Text style={styles.label}>Reason for Visit</Text>
        <TextInput
          mode="outlined"
          value={reasonForVisit}
          onChangeText={setReasonForVisit}
          placeholder="e.g. Persistent headache for 3 days"
          multiline
          numberOfLines={3}
          maxLength={200}
          style={styles.reasonInput}
        />
        <Text style={styles.charCounter}>
          {reasonForVisit.length}/200 (min 5)
        </Text>

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
  reasonInput: {
    marginBottom: 4,
    fontSize: 14,
  },
  charCounter: {
    fontSize: 11,
    color: '#888',
    textAlign: 'right',
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  },
});
