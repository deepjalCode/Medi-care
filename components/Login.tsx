import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

interface LoginProps {
  onLogin: (userType: 'admin' | 'patient' | 'doctor', email: string) => void;
  registeredPatients: { email: string; name: string }[];
}

const Login: React.FC<LoginProps> = ({ onLogin, registeredPatients }) => {
  const [userType, setUserType] = useState<'admin' | 'patient' | 'doctor'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const validateLogin = () => {
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return false;
    }

    if (userType === 'patient') {
      // Check if patient is registered
      const isRegistered = registeredPatients.some(
        (p) => p.email.toLowerCase() === email.toLowerCase()
      );
      if (!isRegistered) {
        setError('You are not registered. Please contact admin to register.');
        return false;
      }
    }

    return true;
  };

  const handleLogin = () => {
    if (validateLogin()) {
      onLogin(userType, email);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>OPD Application</Text>
      <Text style={styles.subtitle}>Login</Text>

      {/* User Type Selector */}
      <View style={styles.selectorContainer}>
        <TouchableOpacity
          style={[
            styles.selectorButton,
            userType === 'admin' && styles.selectorButtonActive,
          ]}
          onPress={() => setUserType('admin')}
        >
          <Text
            style={[
              styles.selectorText,
              userType === 'admin' && styles.selectorTextActive,
            ]}
          >
            Admin
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selectorButton,
            userType === 'patient' && styles.selectorButtonActive,
          ]}
          onPress={() => setUserType('patient')}
        >
          <Text
            style={[
              styles.selectorText,
              userType === 'patient' && styles.selectorTextActive,
            ]}
          >
            Patient
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selectorButton,
            userType === 'doctor' && styles.selectorButtonActive,
          ]}
          onPress={() => setUserType('doctor')}
        >
          <Text
            style={[
              styles.selectorText,
              userType === 'doctor' && styles.selectorTextActive,
            ]}
          >
            Doctor
          </Text>
        </TouchableOpacity>
      </View>

      {/* Login Form */}
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>
          {userType.charAt(0).toUpperCase() + userType.slice(1)} Login
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Enter Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        {userType === 'patient' && (
          <Text style={styles.infoText}>
            Only registered patients can login. Please contact admin to register.
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 25,
    backgroundColor: '#f4f6f8',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 30,
    color: '#34495e',
  },
  selectorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    padding: 5,
  },
  selectorButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  selectorButtonActive: {
    backgroundColor: '#3498db',
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  selectorTextActive: {
    color: '#fff',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 25,
    color: '#2c3e50',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  button: {
    height: 50,
    backgroundColor: '#3498db',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 15,
  },
});
