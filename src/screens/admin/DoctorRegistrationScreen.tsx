/**
 * DoctorRegistrationScreen (v2.0)
 *
 * Changes:
 * - Removed email field — uses synthetic email internally
 * - Doctor ID generated via Supabase RPC (generate_doctor_id)
 * - Uses registerUser() from userService
 * - Added category and category_code derived from specialty
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { TextInput, Button, Text, Title, useTheme } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { registerUser } from '../../services/userService';

// ─── Specialty → Category Code Mapping ──────────────────────────────────────

const SPECIALTIES = [
  { label: 'General Physician', code: 'GN' },
  { label: 'ENT', code: 'EN' },
  { label: 'Pediatrics', code: 'PE' },
  { label: 'Orthopedics', code: 'OR' },
  { label: 'Dermatology', code: 'DE' },
] as const;

export default function DoctorRegistrationScreen() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState(SPECIALTIES[0].label);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  
  const theme = useTheme();

  const getCategoryCode = (specialty: string): string => {
    return SPECIALTIES.find(s => s.label === specialty)?.code ?? 'GN';
  };

  const handleRegisterDoctor = async () => {
    if (!name.trim() || !password.trim() || !phone.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const categoryCode = getCategoryCode(selectedSpecialty);

      const { generatedId: docId } = await registerUser('DOCTOR', password, {
        name: name.trim(),
        phone: phone.trim(),
        specialty: selectedSpecialty,
        category: selectedSpecialty,
        categoryCode,
      });

      setGeneratedId(docId);
      Alert.alert('Success', `Dr. ${name.trim()} registered!\n\nDoctor ID: ${docId}\nTemp Password: ${password}`, [
        { text: 'OK', onPress: () => {
          setName('');
          setPassword('');
          setPhone('');
          setSelectedSpecialty(SPECIALTIES[0].label);
          setShowPassword(false);
        }}
      ]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred.';
      Alert.alert('Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <View style={styles.formContainer}>
            <Title style={styles.title}>Register Doctor</Title>
            <Text style={styles.subtitle}>Create an official hospital Doctor profile</Text>

            <TextInput
              label="Doctor Full Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              mode="outlined"
              style={styles.input}
            />

            <Text style={styles.label}>Specialty</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedSpecialty}
                onValueChange={(val) => setSelectedSpecialty(val)}
                dropdownIconColor="#000"
              >
                {SPECIALTIES.map(s => (
                  <Picker.Item key={s.code} label={s.label} value={s.label} />
                ))}
              </Picker>
            </View>

            <TextInput
              label="Temp Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(prev => !prev)}
                />
              }
            />

            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={() => {
                  setName(''); setPassword('');
                  setPhone(''); setSelectedSpecialty(SPECIALTIES[0].label); setShowPassword(false);
                }}
                style={[styles.button, styles.resetBtn]}
                icon="refresh"
                disabled={loading}
              >
                Reset
              </Button>
              <Button
                mode="contained"
                onPress={handleRegisterDoctor}
                style={[styles.button, styles.submitBtn]}
                loading={loading}
                disabled={loading}
                icon="account-plus"
              >
                Add Doctor
              </Button>
            </View>
          </View>

          {generatedId && (
            <View style={styles.successContainer}>
              <Title style={styles.successTitle}>Generated Doctor ID</Title>
              <Title selectable style={styles.generatedId}>{generatedId}</Title>
              <Text style={styles.successHint}>Long-press to copy this ID</Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    padding: 20,
    borderRadius: 12,
    elevation: 4,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#002a4d',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    fontWeight: 'bold',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  resetBtn: {
    flex: 0.4,
  },
  submitBtn: {
    flex: 0.6,
  },
  successContainer: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
  },
  successTitle: { fontSize: 16, color: '#2e7d32' },
  generatedId: { fontSize: 28, color: '#1b5e20', fontWeight: 'bold', marginTop: 8 },
  successHint: { fontSize: 12, color: '#4caf50', marginTop: 4, fontStyle: 'italic' },
});
