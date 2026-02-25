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
  registeredAt?: Date;
}

interface AdminPanelProps {
  patients: Patient[];
  onRegisterPatient: () => void;
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  patients,
  onRegisterPatient,
  onLogout,
}) => {
  const renderPatientCard = ({ item }: { item: Patient }) => (
    <View style={styles.patientCard}>
      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{item.name}</Text>
        <Text style={styles.patientDetail}>📧 {item.email}</Text>
        <Text style={styles.patientDetail}>📱 {item.phone}</Text>
      </View>
      <View style={styles.patientMeta}>
        <Text style={styles.patientAge}>Age: {item.age}</Text>
        <Text style={styles.patientGender}>{item.gender}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{patients.length}</Text>
          <Text style={styles.statLabel}>Total Patients</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>5</Text>
          <Text style={styles.statLabel}>Total Doctors</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onRegisterPatient}
        >
          <Text style={styles.actionButtonText}>+ Register New Patient</Text>
        </TouchableOpacity>
      </View>

      {/* Patients List */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Registered Patients</Text>
        {patients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No patients registered yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Click "Register New Patient" to add patients
            </Text>
          </View>
        ) : (
          patients.map((patient, index) => (
            <View key={index}>{renderPatientCard({ item: patient })}</View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

export default AdminPanel;

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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  actionsContainer: {
    marginBottom: 25,
  },
  actionButton: {
    backgroundColor: '#27ae60',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2c3e50',
  },
  patientCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  patientDetail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 3,
  },
  patientMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  patientAge: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
  patientGender: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 3,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#bdc3c7',
    marginTop: 10,
    textAlign: 'center',
  },
});
