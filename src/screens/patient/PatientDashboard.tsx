import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Title, Card, Paragraph, Button, Text, useTheme } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';

export default function PatientDashboard() {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  const { userId, userName } = useSelector((state: RootState) => state.auth);
  const appointments = useSelector((state: RootState) => state.db.appointments);
  const users = useSelector((state: RootState) => state.db.users);

  // Get tokens for the logged in patient
  const myTokens = appointments.filter((app) => app.patientId === userId);

  const getDoctorName = (docId: string | null) => {
    if (!docId) return 'Any Available Doctor';
    const doc = users.find(u => u.id === docId);
    return doc ? `Dr. ${doc.name}` : 'Unknown Doctor';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WAITING': return '#ffb300';
      case 'IN_PROGRESS': return '#1e88e5';
      case 'COMPLETED': return '#4caf50';
      default: return '#888';
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Title style={styles.greeting}>Hello, {userName}</Title>
        <Text style={styles.subtitle}>Your Visit Tokens</Text>
      </View>

      <View style={styles.tokensContainer}>
        {myTokens.length > 0 ? (
          myTokens.map((token) => (
            <Card key={token.id} style={styles.card}>
              <Card.Content>
                <Title>Date: {new Date(token.date).toLocaleDateString()}</Title>
                <Paragraph><Text style={{fontWeight: 'bold'}}>Reason:</Text> {token.reason}</Paragraph>
                <Paragraph><Text style={{fontWeight: 'bold'}}>Assigned to:</Text> {getDoctorName(token.doctorId)}</Paragraph>
                
                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(token.status) }]}>
                    <Text style={styles.statusText}>{token.status.replace('_', ' ')}</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>You don't have any visit tokens.</Text>
            <Text style={styles.emptySubtext}>Use the Renew Token tab to generate one.</Text>
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
  tokensContainer: {
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#6200ee',
  },
  statusRow: {
    marginTop: 12,
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  emptyText: {
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  logoutBtn: {
    marginTop: 16,
    marginBottom: 40,
    alignSelf: 'center',
    width: '50%',
  }
});
