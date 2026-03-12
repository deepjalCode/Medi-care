import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Title, Card, Paragraph, Button, Text, useTheme } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { updateAppointmentStatus } from '../../store/slices/dbSlice';

export default function DoctorDashboard() {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  const { userId, userName } = useSelector((state: RootState) => state.auth);
  const appointments = useSelector((state: RootState) => state.db.appointments);
  const users = useSelector((state: RootState) => state.db.users);

  // Get appointments assigned to this doctor that are not completed
  const myQueue = appointments.filter(
    (app) => app.doctorId === userId && app.status !== 'COMPLETED'
  );

  const handleUpdateStatus = (appointmentId: string, status: 'IN_PROGRESS' | 'COMPLETED') => {
    dispatch(updateAppointmentStatus({ appointmentId, status }));
  };

  const getPatientName = (pId: string) => {
    const patient = users.find(u => u.id === pId);
    return patient ? patient.name : 'Unknown';
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Title style={styles.greeting}>Dr. {userName}</Title>
        <Text style={styles.subtitle}>Your Patient Queue</Text>
      </View>

      <View style={styles.queueContainer}>
        {myQueue.length > 0 ? (
          myQueue.map((appt) => (
            <Card key={appt.id} style={styles.card}>
              <Card.Content>
                <Title>{getPatientName(appt.patientId)}</Title>
                <Paragraph><Text style={{fontWeight: 'bold'}}>Reason:</Text> {appt.reason}</Paragraph>
                <Paragraph><Text style={{fontWeight: 'bold'}}>Status:</Text> {appt.status}</Paragraph>
                
                <View style={styles.actionRow}>
                  {appt.status === 'WAITING' && (
                    <Button 
                      mode="contained" 
                      onPress={() => handleUpdateStatus(appt.id, 'IN_PROGRESS')}
                      style={styles.actionBtn}
                    >
                      Call In
                    </Button>
                  )}
                  {appt.status === 'IN_PROGRESS' && (
                    <Button 
                      mode="contained" 
                      color="#4caf50"
                      onPress={() => handleUpdateStatus(appt.id, 'COMPLETED')}
                      style={styles.actionBtn}
                    >
                      Mark Done
                    </Button>
                  )}
                </View>
              </Card.Content>
            </Card>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No patients waiting in your queue.</Text>
          </View>
        )}
      </View>

      <Button 
        mode="outlined" 
        onPress={() => dispatch(logout())}
        style={styles.logoutBtn}
      >
        Logout
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    marginTop: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  queueContainer: {
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#03dac6',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionBtn: {
    marginRight: 8,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
  },
  logoutBtn: {
    marginTop: 16,
    marginBottom: 40,
    alignSelf: 'center',
    width: '50%',
  }
});
