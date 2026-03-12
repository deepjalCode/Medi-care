import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { TextInput, Button, Title, useTheme, SegmentedButtons, Text } from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { secondarySupabase } from '../../services/supabaseSetup';
import { createUserProfile } from '../../services/userService';

export default function RegisterPatientScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState<Date>(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('Male');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const theme = useTheme();

  // Format Date → "DD/MM/YYYY" for display
  const formatDisplay = (date: Date) =>
    `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

  // Format Date → "YYYY-MM-DD" for Supabase
  const formatForDB = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // keep open on iOS, close on Android
    if (selectedDate) {
      setDob(selectedDate);
    }
  };

  const handleRegisterPatient = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !age.trim() || !phone.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    if (isNaN(parseInt(age.trim(), 10))) {
      Alert.alert('Error', 'Age must be a valid number.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await secondarySupabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { displayName: name.trim() }
        }
      });
      if (error) throw error;
      if (!data.user) throw new Error('Could not create user account');

      const newId = `PAT-${Math.floor(100000 + Math.random() * 900000)}`;

      await createUserProfile(data.user.id, {
        name: name.trim(),
        email: email.trim(),
        role: 'PATIENT',
        age: parseInt(age.trim(), 10),
        dob: formatForDB(dob),
        gender,
        phone: phone.trim(),
        patientId: newId,
        bloodGroup: bloodGroup.trim() || undefined,
      });

      await secondarySupabase.auth.signOut();

      setGeneratedId(newId);
      Alert.alert(
        'Patient Enrolled!',
        `Name: ${name.trim()}\nEmail: ${email.trim()}\nTemp Password: ${password}\nPatient ID: ${newId}\n\nPlease share these credentials.`,
        [{
          text: 'OK', onPress: () => {
            setName(''); setEmail(''); setPassword('');
            setAge(''); setPhone('');
            setBloodGroup(''); setGender('Male');
            setDob(new Date(2000, 0, 1));
          }
        }]
      );
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Title style={styles.title}>Enroll New Patient</Title>

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
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="email" />}
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
            value={formatDisplay(dob)}
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
              onPress={() => setShowPassword(prev => !prev)}
            />
          }
        />

        <Button
          mode="contained"
          onPress={handleRegisterPatient}
          style={styles.button}
          loading={loading}
          disabled={loading}
          icon="account-plus"
        >
          Enroll Patient
        </Button>
      </View>

      {generatedId && (
        <View style={styles.successContainer}>
          <Title style={styles.successTitle}>Last Created Patient ID</Title>
          <Title selectable style={styles.generatedId}>{generatedId}</Title>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center', marginTop: 16 },
  formContainer: { padding: 16, borderRadius: 8, backgroundColor: '#fff', elevation: 2 },
  input: { marginBottom: 16 },
  label: { fontSize: 14, color: '#555', marginBottom: 6 },
  segmented: { marginBottom: 16 },
  button: { marginTop: 8, paddingVertical: 6 },
  successContainer: { marginTop: 32, padding: 16, borderRadius: 8, backgroundColor: '#e8f5e9', alignItems: 'center' },
  successTitle: { fontSize: 16, color: '#2e7d32' },
  generatedId: { fontSize: 32, color: '#1b5e20', fontWeight: 'bold', marginTop: 8 },
});
