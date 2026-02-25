import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import PatientRegistration from './components/PatientRegistration';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';

// Types
type UserType = 'admin' | 'patient' | 'doctor';
type Screen = 'login' | 'adminPanel' | 'patientRegistration' | 'patientDashboard' | 'doctorDashboard';

interface Patient {
  name: string;
  email: string;
  password?: string;
  phone: string;
  age: string;
  gender: string;
  registeredAt?: Date;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [currentUserType, setCurrentUserType] = useState<UserType | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  // Registered patients storage (simulated database)
  const [patients, setPatients] = useState<Patient[]>([
    {
      name: 'John Doe',
      email: 'patient@example.com',
      password: 'password123',
      phone: '1234567890',
      age: '30',
      gender: 'Male',
    },
  ]);

  // Handle login
  const handleLogin = (userType: UserType, email: string) => {
    setCurrentUserType(userType);
    setCurrentUserEmail(email);

    switch (userType) {
      case 'admin':
        setCurrentScreen('adminPanel');
        break;
      case 'patient':
        setCurrentScreen('patientDashboard');
        break;
      case 'doctor':
        setCurrentScreen('doctorDashboard');
        break;
    }
  };

  // Handle logout
  const handleLogout = () => {
    setCurrentUserType(null);
    setCurrentUserEmail('');
    setCurrentScreen('login');
  };

  // Handle patient registration
  const handleRegisterPatient = (patient: Patient) => {
    setPatients([...patients, patient]);
  };

  // Get current patient data
  const getCurrentPatient = (): Patient | undefined => {
    return patients.find(
      (p) => p.email.toLowerCase() === currentUserEmail.toLowerCase()
    );
  };

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return (
          <Login
            onLogin={handleLogin}
            registeredPatients={patients.map((p) => ({ email: p.email, name: p.name }))}
          />
        );

      case 'adminPanel':
        return (
          <AdminPanel
            patients={patients}
            onRegisterPatient={() => setCurrentScreen('patientRegistration')}
            onLogout={handleLogout}
          />
        );

      case 'patientRegistration':
        return (
          <PatientRegistration
            onRegister={handleRegisterPatient}
            onBack={() => setCurrentScreen('adminPanel')}
            existingPatients={patients.map((p) => ({ email: p.email }))}
          />
        );

      case 'patientDashboard': {
        const currentPatient = getCurrentPatient();
        if (!currentPatient) {
          return (
            <Login
              onLogin={handleLogin}
              registeredPatients={patients.map((p) => ({ email: p.email, name: p.name }))}
            />
          );
        }
        return (
          <PatientDashboard
            patient={currentPatient}
            onLogout={handleLogout}
          />
        );
      }

      case 'doctorDashboard':
        return (
          <DoctorDashboard
            email={currentUserEmail}
            onLogout={handleLogout}
          />
        );

      default:
        return (
          <Login
            onLogin={handleLogin}
            registeredPatients={patients.map((p) => ({ email: p.email, name: p.name }))}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f6f8" />
      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop:25 ,
    backgroundColor: '#f4f6f8',
  },
});
