import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Card, Title, Paragraph, useTheme } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export default function PatientSearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedPatient, setSearchedPatient] = useState<any>(null);

  const users = useSelector((state: RootState) => state.db.users);
  const theme = useTheme();

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    const patient = users.find((u) => u.id === searchQuery.trim() && u.role === 'PATIENT');

    if (patient) {
      setSearchedPatient(patient);
    } else {
      Alert.alert('Not Found', 'No patient found in the database with this ID.');
      setSearchedPatient(null);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Title style={styles.title}>Search Patient</Title>

      <View style={styles.searchContainer}>
        <TextInput
          label="Enter Patient ID (e.g. PAT-123456)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          style={styles.searchInput}
          right={<TextInput.Icon icon="magnify" onPress={handleSearch} />}
        />
        <Button mode="contained" onPress={handleSearch} style={styles.searchBtn}>
          Search Database
        </Button>
      </View>

      {searchedPatient && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Patient: {searchedPatient.name}</Title>
            <Paragraph>Age: {searchedPatient.age} | Phone: {searchedPatient.phone}</Paragraph>
            <Paragraph>Role: {searchedPatient.role}</Paragraph>
          </Card.Content>
        </Card>
      )}
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
    marginBottom: 16,
    marginTop: 8,
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchInput: {
    marginBottom: 8,
  },
  searchBtn: {
    alignSelf: 'flex-start',
  },
  card: {
    backgroundColor: '#e0f7fa',
  },
});
