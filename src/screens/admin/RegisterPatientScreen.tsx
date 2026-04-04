/**
 * RegisterPatientScreen (v3.0)
 *
 * Changes from v2:
 * - Added "Assign Token" section below patient fields (Feature 1)
 * - Token section: category picker, doctor picker, reason-for-visit input
 * - On submit: registerUser() → createAppointment() chained using returned UID
 * - Notifies assigned doctor via createNotification()
 * - Combined success alert: "Patient registered and token #[N] assigned."
 * - Standalone RenewTokenScreen is NOT removed — still used for patient self-service
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Button,
  Title,
  useTheme,
  SegmentedButtons,
  Text,
  ActivityIndicator,
} from 'react-native-paper';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { registerUser } from '../../services/userService';
import { createAppointment } from '../../services/appointmentService';
import { createNotification } from '../../services/NotificationService';
import {
  getDoctorCategories,
  getDoctorsByCategory,
  DoctorCategory,
  DoctorOption,
} from '../../services/doctorService';
import { formatDisplayDate, formatForDB } from '../../utils/formatTokenDate';

// ─── Component ─────────────────────────────────────────────────────────────────

export default function RegisterPatientScreen() {
  // ── Patient fields ─────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState<Date>(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('Male');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  // --- ADDED: Token fields (Feature 1) ---
  const [categories, setCategories] = useState<DoctorCategory[]>([]);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>('');
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [reasonForVisit, setReasonForVisit] = useState<string>('');
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  // --- END ADDED ---

  const theme = useTheme();

  // ── Date picker handler ─────────────────────────────────────────────────────

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDob(selectedDate);
    }
  };

  // --- ADDED: Fetch categories + doctors on mount (Feature 1) ---
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const [cats, docs] = await Promise.all([
          getDoctorCategories(),
          getDoctorsByCategory(),
        ]);
        setCategories(cats);
        setDoctors(docs);
      } catch (err) {
        console.error('RegisterPatientScreen: failed to load doctors', err);
      } finally {
        setDoctorsLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  // Filter doctors by selected category
  useEffect(() => {
    if (!selectedCategoryCode) {
      setFilteredDoctors(doctors);
    } else {
      setFilteredDoctors(
        doctors.filter((d) => d.categoryCode === selectedCategoryCode),
      );
    }
    setSelectedDoctorId(''); // Reset doctor when category changes
  }, [selectedCategoryCode, doctors]);
  // --- END ADDED ---

  // ── Form submission ─────────────────────────────────────────────────────────

  const handleRegisterPatient = async () => {
    // Validate patient fields
    if (!name.trim() || !password.trim() || !age.trim() || !phone.trim()) {
      Alert.alert('Error', 'Please fill in all required patient fields.');
      return;
    }
    if (isNaN(parseInt(age.trim(), 10))) {
      Alert.alert('Error', 'Age must be a valid number.');
      return;
    }

    // --- ADDED: Validate token fields (Feature 1) ---
    if (!selectedDoctorId) {
      Alert.alert(
        'Doctor Required',
        'Please select a doctor to assign a token.',
      );
      return;
    }
    if (!reasonForVisit.trim() || reasonForVisit.trim().length < 5) {
      Alert.alert(
        'Reason Required',
        'Please enter a reason for visit (minimum 5 characters).',
      );
      return;
    }
    // --- END ADDED ---

    setLoading(true);
    try {
      // Step 1: Register the patient (creates auth account + profile)
      const { generatedId: newPatientId, user } = await registerUser(
        'PATIENT',
        password,
        {
          name: name.trim(),
          age: parseInt(age.trim(), 10),
          dob: formatForDB(dob),
          gender,
          phone: phone.trim(),
          bloodGroup: bloodGroup.trim() || undefined,
        },
      );

      setGeneratedId(newPatientId);

      // --- ADDED: Step 2 — Create appointment/token immediately (Feature 1) ---
      const selectedDoc = filteredDoctors.find(
        (d) => d.id === selectedDoctorId,
      );
      const categoryCode =
        selectedCategoryCode || selectedDoc?.categoryCode || 'GN';

      const appointment = await createAppointment({
        patientId: user.id, // Supabase auth UID (foreign key in appointments)
        doctorId: selectedDoctorId,
        categoryCode,
        reason: reasonForVisit.trim(),
        reasonForVisit: reasonForVisit.trim(),
      });

      // Step 3 — Notify the assigned doctor
      createNotification(
        selectedDoctorId,
        'New patient assigned',
        `Patient ${name.trim()} added to your queue. Token: ${appointment.tokenNumber}.`,
      );
      // --- END ADDED ---

      Alert.alert(
        'Patient Enrolled & Token Assigned!',
        // --- ADDED: Combined success message (Feature 1) ---
        `Name: ${name.trim()}\nPatient ID: ${newPatientId}\nTemp Password: ${password}\n\nToken Assigned: ${appointment.tokenNumber}\nDoctor: Dr. ${selectedDoc?.name ?? 'N/A'}\n\nPlease share the Patient ID and password with the patient.`,
        // --- END ADDED ---
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset all fields
              setName('');
              setPassword('');
              setAge('');
              setPhone('');
              setBloodGroup('');
              setGender('Male');
              setDob(new Date(2000, 0, 1));
              // --- ADDED: Reset token fields ---
              setSelectedCategoryCode('');
              setSelectedDoctorId('');
              setReasonForVisit('');
              // --- END ADDED ---
            },
          },
        ],
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'An error occurred.';
      Alert.alert('Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Title style={styles.title}>Enroll New Patient</Title>

      {/* ── Patient Details section ── */}
      <View style={styles.formContainer}>
        <TextInput
          label="Patient Full Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="account" />}
        />

        <TextInput
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="phone" />}
        />

        <TextInput
          label="Age"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="calendar-account" />}
        />

        {/* Date of Birth picker */}
        <Text style={styles.label}>Date of Birth</Text>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <TextInput
            label="Date of Birth"
            value={formatDisplayDate(dob)}
            mode="outlined"
            style={styles.input}
            editable={false}
            pointerEvents="none"
            left={<TextInput.Icon icon="calendar" />}
            right={<TextInput.Icon icon="chevron-down" />}
          />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dob}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
            maximumDate={new Date()}
            onChange={onDateChange}
          />
        )}

        <Text style={styles.label}>Gender</Text>
        <SegmentedButtons
          value={gender}
          onValueChange={setGender}
          style={styles.segmented}
          buttons={[
            { value: 'Male', label: 'Male' },
            { value: 'Female', label: 'Female' },
            { value: 'Other', label: 'Other' },
          ]}
        />

        <TextInput
          label="Blood Group (Optional, e.g. A+)"
          value={bloodGroup}
          onChangeText={setBloodGroup}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="water" />}
        />

        <TextInput
          label="Temporary Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="lock" />}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword((prev) => !prev)}
            />
          }
        />
      </View>

      {/* --- ADDED: Assign Token section (Feature 1) --- */}
      <View style={styles.tokenSection}>
        <View style={styles.tokenSectionHeader}>
          <Text style={styles.tokenSectionTitle}>Assign Token</Text>
          <Text style={styles.tokenSectionSubtitle}>
            Token is generated and assigned immediately on registration
          </Text>
        </View>

        {doctorsLoading ? (
          <ActivityIndicator
            animating
            size="small"
            style={styles.doctorLoader}
          />
        ) : (
          <View style={styles.tokenCard}>
            {/* Category Picker */}
            <Text style={styles.pickerLabel}>Doctor Category</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCategoryCode}
                onValueChange={(val) => setSelectedCategoryCode(val)}
                dropdownIconColor="#000"
              >
                <Picker.Item label="-- All Categories --" value="" />
                {categories.map((cat) => (
                  <Picker.Item
                    key={cat.categoryCode}
                    label={cat.category}
                    value={cat.categoryCode}
                  />
                ))}
              </Picker>
            </View>

            {/* Doctor Picker */}
            <Text style={styles.pickerLabel}>Assign Doctor *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedDoctorId}
                onValueChange={(val) => setSelectedDoctorId(val)}
                dropdownIconColor="#000"
              >
                <Picker.Item
                  label="-- Select Doctor --"
                  value=""
                  enabled={false}
                />
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

            {/* Reason for visit */}
            <Text style={styles.pickerLabel}>Reason for Visit *</Text>
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
          </View>
        )}
      </View>
      {/* --- END ADDED --- */}

      <Button
        mode="contained"
        onPress={handleRegisterPatient}
        style={styles.button}
        loading={loading}
        disabled={loading || doctorsLoading}
        icon="account-plus"
      >
        Enroll Patient & Assign Token
      </Button>

      {generatedId && (
        <View style={styles.successContainer}>
          <Title style={styles.successTitle}>Generated Patient ID</Title>
          <Title selectable style={styles.generatedId}>
            {generatedId}
          </Title>
          <Text style={styles.successHint}>Long-press to copy this ID</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  formContainer: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    elevation: 2,
    marginBottom: 16,
  },
  input: { marginBottom: 16 },
  label: { fontSize: 14, color: '#555', marginBottom: 6 },
  segmented: { marginBottom: 16 },
  button: { marginTop: 8, paddingVertical: 6, marginHorizontal: 0 },
  successContainer: {
    marginTop: 24,
    marginBottom: 32,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
  },
  successTitle: { fontSize: 16, color: '#2e7d32' },
  generatedId: {
    fontSize: 28,
    color: '#1b5e20',
    fontWeight: 'bold',
    marginTop: 8,
  },
  successHint: {
    fontSize: 12,
    color: '#4caf50',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // --- ADDED: Token section styles ---
  tokenSection: {
    marginBottom: 16,
  },
  tokenSectionHeader: {
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3d5afe',
  },
  tokenSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a237e',
  },
  tokenSectionSubtitle: {
    fontSize: 12,
    color: '#5c6bc0',
    marginTop: 2,
  },
  tokenCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    elevation: 2,
  },
  pickerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 20,
  },
  noDoctorsText: {
    color: '#e53935',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 16,
    marginTop: -12,
  },
  reasonInput: {
    marginBottom: 4,
    fontSize: 14,
  },
  charCounter: {
    fontSize: 11,
    color: '#888',
    textAlign: 'right',
    marginBottom: 8,
  },
  doctorLoader: {
    marginVertical: 24,
  },
  // --- END ADDED ---
});
