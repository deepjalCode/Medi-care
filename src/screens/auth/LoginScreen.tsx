import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { TextInput, Button, Text, Title, useTheme, Snackbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { RootState } from '../../store';
import { supabase } from '../../services/supabaseSetup';

export default function LoginScreen() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const dispatch = useDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const theme = useTheme();

  const handleLogin = async () => {
    if (!userId.trim()) {
      setErrorMessage('Please enter a valid email.');
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
      const { error } = await supabase.auth.signInWithPassword({
        email: userId.trim(),
        password,
      });
      if (error) throw error;
      // Redux dispatch is now handled securely in App.tsx via onAuthStateChange
    } catch (error: any) {
      setErrorMessage(error.message || 'Invalid credentials');
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
            <Text style={styles.subtitle}>Sign in to continue</Text>

            <TextInput
              label="Email"
              value={userId}
              onChangeText={setUserId}
              autoCapitalize="none"
              keyboardType="email-address"
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="account" />}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="lock" />}
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
              Authentication now securely managed via Supabase.
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
