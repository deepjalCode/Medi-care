import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import {
  TextInput,
  Card,
  Title,
  Paragraph,
  Button,
  useTheme,
  Text,
  ActivityIndicator,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { supabase } from '../../services/supabaseSetup';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface PatientItem {
  id: string;
  name: string;
  phone?: string;
  age?: number;
  bloodGroup?: string;
  patientId?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function PatientSearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { userId } = useSelector((state: RootState) => state.auth);

  // Fetch ONLY patients who have had an appointment with THIS doctor
  const fetchPatients = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          patient_id,
          patients (
            id,
            patient_id,
            blood_group,
            users ( id, name, phone, age )
          )
        `)
        .eq('doctor_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Deduplicate: a patient can have multiple appointments with same doctor
      const seen = new Set<string>();
      const mapped: PatientItem[] = [];

      for (const row of (data ?? []) as any[]) {
        const pat = row.patients as any;
        const usr = pat?.users as any;
        const uid: string = usr?.id ?? pat?.id ?? '';
        if (!uid || seen.has(uid)) continue;
        seen.add(uid);
        mapped.push({
          id: uid,
          name: usr?.name ?? 'Unknown',
          phone: usr?.phone ?? undefined,
          age: usr?.age ?? undefined,
          bloodGroup: pat?.blood_group ?? undefined,
          patientId: pat?.patient_id ?? undefined,
        });
      }

      setPatients(mapped);
      setFilteredPatients(mapped);
      setSearchQuery('');
    } catch (err) {
      console.error('PatientSearchScreen: fetch failed', err);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]),
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

  const renderItem = ({ item }: { item: PatientItem }) => (
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

        {/* View History button */}
        <Button
          mode="outlined"
          onPress={() =>
            navigation.navigate('PatientHistory', {
              patientId: item.id,
              patientName: item.name,
              patientDisplayId: item.patientId || item.id,
            })
          }
          style={styles.historyBtn}
          icon="history"
          textColor="#5e35b1"
          compact
        >
          View History
        </Button>
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
                : 'No patients have visited your department yet.'}
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
  historyBtn: {
    marginTop: 10,
    borderColor: '#5e35b1',
    alignSelf: 'flex-start',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#888',
  },
});
