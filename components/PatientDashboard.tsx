import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

interface Patient {
  name: string;
  email: string;
  phone: string;
  age: string;
  gender: string;
}

interface PatientDashboardProps {
  patient: Patient;
  onLogout: () => void;
}

const PatientDashboard: React.FC<PatientDashboardProps> = ({ patient, onLogout }) => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Patient Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Welcome Card */}
      <View style={styles.welcomeCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {patient.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.welcomeText}>Welcome, {patient.name}!</Text>
        <Text style={styles.statusText}>Your account is active</Text>
      </View>

      {/* Patient Info */}
      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Your Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{patient.email}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone:</Text>
          <Text style={styles.infoValue}>{patient.phone}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Age:</Text>
          <Text style={styles.infoValue}>{patient.age} years</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Gender:</Text>
          <Text style={styles.infoValue}>{patient.gender}</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📅 Book Appointment</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📋 View Medical History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>💊 View Prescriptions</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default PatientDashboard;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f4f6f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  logoutButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  welcomeCard: {
    backgroundColor: '#3498db',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3498db',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 14,
    color: '#d5e8f7',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    backgroundColor: '#f4f6f8',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
});
