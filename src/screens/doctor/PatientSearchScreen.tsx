import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import {
  TextInput,
  Card,
  Title,
  Paragraph,
  useTheme,
  Text,
  ActivityIndicator,
} from 'react-native-paper';
import { getAllUsersByRole, UserData } from '../../services/userService';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function PatientSearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<UserData[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();

  const fetchPatients = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getAllUsersByRole('PATIENT');
      setPatients(data);
      setFilteredPatients(data);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to fetch patients', error);
      Alert.alert('Error', 'Could not load patient records. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refetch every time this tab is focused
  useFocusEffect(
    useCallback(() => {
      fetchPatients();
    }, []),
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredPatients(patients);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = patients.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        (p.phone && p.phone.includes(lowerQuery)) ||
        (p.patientId && p.patientId.toLowerCase().includes(lowerQuery)),
    );
    setFilteredPatients(filtered);
  };

  const renderItem = ({ item }: { item: UserData }) => (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <View style={styles.cardHeader}>
          <Icon
            name="account-circle"
            size={28}
            color={theme.colors.primary}
          />
          <Title style={styles.cardTitle}>{item.name}</Title>
        </View>
        <Paragraph>📞 {item.phone || 'N/A'}</Paragraph>
        <Paragraph>🎂 Age: {item.age ?? 'N/A'}</Paragraph>
        {item.bloodGroup && (
          <Paragraph>🩸 Blood Group: {item.bloodGroup}</Paragraph>
        )}
        <View style={styles.idBadge}>
          <Text style={styles.patientId}>
            🪪 {item.patientId || item.id}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <TextInput
        label="Search by Name, Phone or Patient ID…"
        value={searchQuery}
        onChangeText={handleSearch}
        mode="outlined"
        left={<TextInput.Icon icon="magnify" />}
        right={
          searchQuery ? (
            <TextInput.Icon icon="close" onPress={() => handleSearch('')} />
          ) : undefined
        }
        style={styles.searchInput}
      />

      {loading ? (
        <ActivityIndicator animating size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'No patients match your search.'
                : 'No patients enrolled yet.'}
            </Text>
          }
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchPatients(true)}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  searchInput: { marginBottom: 12 },
  loader: { flex: 1, marginTop: 40 },
  listContainer: { paddingBottom: 20 },
  card: { marginBottom: 12, borderRadius: 12 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: { marginLeft: 8, fontSize: 18 },
  idBadge: {
    marginTop: 10,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  patientId: { fontWeight: 'bold', color: '#1b5e20', fontSize: 13 },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#888',
  },
});
