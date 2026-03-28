/**
 * LoginScreen (v2.0)
 *
 * Changes: Email-based login replaced with Role ID-based login.
 * Users enter their role ID (PAT-000001, DOC-000001, ADM-000001) + password.
 * Synthetic email is constructed internally — never exposed to user.
 */

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { TextInput, Button, Text, Title, useTheme, Snackbar } from 'react-native-paper';
import { loginWithRoleId } from '../../services/userService';

// Validates that input matches role ID format: PAT-000001, DOC-000001, ADM-000001
const ROLE_ID_REGEX = /^(PAT|DOC|ADM)-\d{6}$/i;

export default function LoginScreen() {
  const [roleId, setRoleId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const theme = useTheme();

  const handleLogin = async () => {
    const trimmedId = roleId.trim().toUpperCase();

    if (!trimmedId) {
      setErrorMessage('Please enter your Role ID.');
      setSnackbarVisible(true);
      return;
    }

    if (!ROLE_ID_REGEX.test(trimmedId)) {
      setErrorMessage('Invalid ID format. Use PAT-000001, DOC-000001, or ADM-000001.');
      setSnackbarVisible(true);
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      setSnackbarVisible(true);
      return;
    }

    setLoading(true);
    try {
      await loginWithRoleId(trimmedId, password);
      // Redux dispatch is handled securely in App.tsx via onAuthStateChange
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid credentials';
      setErrorMessage(message);
      setSnackbarVisible(true);
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
            <Title style={styles.title}>Welcome to OPD System</Title>
            <Text style={styles.subtitle}>Sign in with your Role ID</Text>

            <TextInput
              label="Role ID (e.g. PAT-000001)"
              value={roleId}
              onChangeText={setRoleId}
              autoCapitalize="characters"
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="account" />}
            />

            <TextInput
              label="Password"
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
              onPress={handleLogin}
              style={styles.button}
              contentStyle={styles.buttonContent}
              loading={loading}
              disabled={loading}
            >
              Login
            </Button>
            
            <Text style={styles.hint}>
              Enter your assigned ID (PAT / DOC / ADM) and password.
            </Text>
          </View>

          <Snackbar
            visible={snackbarVisible}
            onDismiss={() => setSnackbarVisible(false)}
            duration={3000}
            style={{ backgroundColor: theme.colors.error || '#d32f2f' }}
            action={{
              label: 'Close',
              labelStyle: { color: '#fff' },
              onPress: () => setSnackbarVisible(false),
            }}
          >
            <Text style={{ color: '#fff' }}>{errorMessage}</Text>
          </Snackbar>

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
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  hint: {
    marginTop: 24,
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
  }
});
