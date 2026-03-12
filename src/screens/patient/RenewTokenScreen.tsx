import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Title, Button, Text, useTheme } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { addAppointment } from '../../store/slices/dbSlice';

export default function RenewTokenScreen() {
  const [reason, setReason] = useState('Consultation');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  
  const theme = useTheme();
  const dispatch = useDispatch();
  
  const { userId } = useSelector((state: RootState) => state.auth);
  const doctors = useSelector((state: RootState) => 
    state.db.users.filter(u => u.role === 'DOCTOR')
  );
  const appointments = useSelector((state: RootState) => state.db.appointments);

  const handleCreateToken = () => {
    if (!userId) return;

    if (!selectedDoctorId) {
      Alert.alert('Selection Required', 'Please select a specific doctor to generate a systematic token.');
      return;
    }

    // 1. Get today's start and end timestamps to only count today's tokens
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 2. Filter all existing appointments for THIS SPECIFIC DOCTOR for TODAY
    const doctorTokensToday = appointments.filter(app => {
      const appDate = new Date(app.date);
      return app.doctorId === selectedDoctorId && 
             appDate >= today && 
             appDate < tomorrow;
    });

    // 3. The new token number is strictly the number of existing tokens + 1.
    // E.g., If the doctor has 4 patients today, this user gets Token #5.
    const tokenQueueNumber = doctorTokensToday.length + 1;

    // 4. Format visually: TKN-{DoctorIDFirst4Chars}-{QueueNumber}
    const shortDocId = selectedDoctorId.substring(0, 4).toUpperCase();
    const newTokenId = `TKN-${shortDocId}-${tokenQueueNumber}`;
    
    dispatch(
      addAppointment({
        id: newTokenId,
        patientId: userId,
        doctorId: selectedDoctorId,
        date: new Date().toISOString(),
        reason: reason,
        status: 'WAITING',
      })
    );

    Alert.alert(
      'Token Created', 
      `You are patient #${tokenQueueNumber} today for this doctor.\n\nYour visit token (${newTokenId}) has been successfully created. Please check your Dashboard.`
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Title style={styles.title}>Renew Visit Token</Title>
      
      <View style={styles.card}>
        <Text style={styles.label}>Select Doctor (Optional)</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedDoctorId}
            onValueChange={(val) => setSelectedDoctorId(val)}
            /** Set prompt/placeholder color for Android */
            dropdownIconColor="#000"
          >
            <Picker.Item label="-- Choose your Doctor --" value="" enabled={false} />
            {doctors.map(doc => (
              <Picker.Item 
                key={doc.id} 
                label={`Dr. ${doc.name} ${doc.specialty ? '(' + doc.specialty + ')' : ''}`} 
                value={doc.id} 
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Reason for Visit</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={reason}
            onValueChange={(val) => setReason(val)}
          >
            <Picker.Item label="General Consultation" value="Consultation" />
            <Picker.Item label="Follow-up" value="Follow-up" />
            <Picker.Item label="Prescription Renewal" value="Prescription Renewal" />
            <Picker.Item label="Report Checking" value="Report Checking" />
          </Picker>
        </View>

        <Button 
          mode="contained" 
          onPress={handleCreateToken}
          style={styles.button}
        >
          Generate Token
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    marginTop: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 24,
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  }
});
