import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { TextInput, Button, Text, Title, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { secondarySupabase } from '../../services/supabaseSetup';
import { createUserProfile } from '../../services/userService';

export default function DoctorRegistrationScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigation = useNavigation();
  const theme = useTheme();

  const handleRegisterDoctor = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !phone.trim() || !specialty.trim()) {
      Alert.alert('Error', 'Please fill in all required fields including Specialty.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await secondarySupabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            displayName: name.trim()
          }
        }
      });
      if (error) throw error;
      if (!data.user) throw new Error("Could not create doctor account");

      // Generate a unique Doctor ID
      const docId = `DOC-${Math.floor(100000 + Math.random() * 900000)}`;

      await createUserProfile(data.user.id, {
        name: name.trim(),
        email: email.trim(),
        role: 'DOCTOR',
        phone: phone.trim(),
        specialty: specialty.trim(),
        doctorId: docId,
      });

      // Clean up the secondary app (sign out the newly created user from the secondary instance)
      await secondarySupabase.auth.signOut();

      Alert.alert('Success', `Dr. ${name.trim()} registered successfully!`, [
        { text: 'OK', onPress: () => {
          setName('');
          setEmail('');
          setPassword('');
          setPhone('');
          setSpecialty('');
          setShowPassword(false);
        }}
      ]);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'An error occurred.');
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
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
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

            <TextInput
              label="Specialty (e.g., General, Cardio)"
              value={specialty}
              onChangeText={setSpecialty}
              mode="outlined"
              style={styles.input}
            />

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
                  setName(''); setEmail(''); setPassword('');
                  setPhone(''); setSpecialty(''); setShowPassword(false);
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
    color: '#002a4d', // Using trust palette onPrimary
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
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
});
