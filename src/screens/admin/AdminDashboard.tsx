import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  useTheme,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabaseSetup';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TodayAppointment {
  id: string;
  patientDisplayId: string;
  patientName: string;
  token: number;
  tokenNumber: string;
  status: string;
  doctorName: string;
}

interface DoctorInfo {
  id: string;
  name: string;
  docId: string;
  specialty: string;
  isAvailable: boolean;
}

interface QueueEntry {
  doctorId: string;
  doctorName: string;
  waitingCount: number;
}

interface ActivityItem {
  id: string;
  icon: string;
  action: string;
  timestamp: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const { userId } = useSelector((state: RootState) => state.auth);

  // ── Existing state ────────────────────────────────────────────────────────
  const [adminName, setAdminName] = useState('Admin');
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [todayTokens, setTodayTokens] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── New state ─────────────────────────────────────────────────────────────
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([]);
  const [patientsWaiting, setPatientsWaiting] = useState(0);
  const [avgWaitTime, setAvgWaitTime] = useState(0);
  const [patientsSeenToday, setPatientsSeenToday] = useState(0);
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueEntry[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  // TTL cache ref — prevents re-running 7 queries on every back-navigation.
  // Pull-to-refresh always bypasses this.
  const lastFetchedAt = useRef<number>(0);
  const CACHE_TTL_MS = 15_000; // 15 seconds

  const fetchStats = async () => {
    try {
      const todayDate = new Date().toISOString().split('T')[0];

      // ── All queries fired in one parallel batch ─────────────────────────
      const [adminRes, patRes, docRes, tokenRes, apptResult, docListResult, recentResult] =
        await Promise.all([
          supabase.from('users').select('name').eq('id', userId).single(),
          supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'PATIENT'),
          supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'DOCTOR'),
          supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('visit_date', todayDate),
          supabase
            .from('appointments')
            .select(`
              id, token, token_number, status,
              patients ( patient_id, users ( name ) ),
              doctors ( id, users ( name ) )
            `)
            .eq('visit_date', todayDate)
            .order('token', { ascending: true }),
          supabase
            .from('doctors')
            .select(`id, doc_id, speciality, availability, users ( name )`),
          supabase
            .from('appointments')
            .select(`id, status, token, created_at, patients ( users ( name ) )`)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

      if (adminRes.data?.name) {
        setAdminName(adminRes.data.name);
      }
      setTotalPatients(patRes.count ?? 0);
      setTotalDoctors(docRes.count ?? 0);
      setTodayTokens(tokenRes.count ?? 0);

      const apptData = apptResult.data;

      // 1 · Map today's appointments
      const mappedAppts: TodayAppointment[] = (apptData ?? []).map((a: any) => ({
        id: a.id,
        patientDisplayId: a.patients?.patient_id ?? '—',
        patientName: a.patients?.users?.name ?? 'Unknown',
        token: a.token ?? 0,
        tokenNumber: a.token_number ?? `#${a.token ?? 0}`,
        status: a.status ?? 'WAITING',
        doctorName: a.doctors?.users?.name ?? 'Unassigned',
      }));
      setTodayAppointments(mappedAppts);

      // 2 · Waiting / Seen counts
      const waiting = mappedAppts.filter(a => a.status === 'WAITING').length;
      const seen = mappedAppts.filter(a => a.status === 'COMPLETED').length;
      setPatientsWaiting(waiting);
      setPatientsSeenToday(seen);
      setAvgWaitTime(waiting > 0 ? Math.round((waiting * 8)) : 0);

      // 3 · All doctors (name + derive active status from today's appointments)
      const activeDoctorIds = new Set(
        mappedAppts
          .filter(a => a.status === 'WAITING' || a.status === 'IN_PROGRESS')
          .map((_a: any) => {
            const raw = (apptData ?? []).find((r: any) => r.id === _a.id) as any;
            return (raw?.doctors as any)?.id ?? null;
          })
          .filter(Boolean)
      );

      const mappedDoctors: DoctorInfo[] = (docListResult.data ?? []).map((d: any) => ({
        id: d.id,
        name: d.users?.name ?? 'Doctor',
        docId: d.doc_id ?? '',
        specialty: d.speciality ?? 'General',
        isAvailable: d.availability ?? false,
      }));
      setDoctors(mappedDoctors);

      // 4 · Queue status — waiting count per doctor
      const queueMap: Record<string, { name: string; count: number }> = {};
      mappedAppts
        .filter(a => a.status === 'WAITING')
        .forEach(a => {
          const raw = (apptData ?? []).find((r: any) => r.id === a.id) as any;
          const docId = (raw?.doctors as any)?.id;
          if (docId) {
            if (!queueMap[docId]) {
              queueMap[docId] = { name: a.doctorName, count: 0 };
            }
            queueMap[docId].count += 1;
          }
        });
      setQueueStatus(
        Object.entries(queueMap).map(([doctorId, v]) => ({
          doctorId,
          doctorName: v.name,
          waitingCount: v.count,
        }))
      );

      // 5 · Recent activity — last 5 appointment events
      const activityItems: ActivityItem[] = (recentResult.data ?? []).map((r: any) => {
        let icon = 'ticket-confirmation-outline';
        let action = `Token #${r.token} Generated`;
        if (r.status === 'COMPLETED') {
          icon = 'check-circle-outline';
          action = `Patient Seen — ${r.patients?.users?.name ?? 'Unknown'}`;
        } else if (r.status === 'IN_PROGRESS') {
          icon = 'doctor';
          action = `Consultation Started — ${r.patients?.users?.name ?? 'Unknown'}`;
        } else {
          action = `Token #${r.token} Generated — ${r.patients?.users?.name ?? 'Unknown'}`;
        }
        return {
          id: r.id,
          icon,
          action,
          timestamp: r.created_at,
        };
      });
      setRecentActivity(activityItems);

    } catch (err) {
      console.error('Failed to fetch stats', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const isStale = now - lastFetchedAt.current > CACHE_TTL_MS;
      if (isStale) {
        setLoading(true);
        fetchStats().then(() => {
          lastFetchedAt.current = Date.now();
        });
      }
    }, [])
  );

  const onRefresh = () => {
    // Pull-to-refresh always forces a fresh fetch regardless of TTL
    setRefreshing(true);
    fetchStats().then(() => {
      lastFetchedAt.current = Date.now();
    });
  };

  const highWaitAlert = avgWaitTime > 30;
  const noDoctorAlert = doctors.length > 0 && doctors.every(d => !d.isAvailable);
  const largeQueueAlert = queueStatus.some(q => q.waitingCount > 10);
  const hasAlerts = highWaitAlert || noDoctorAlert || largeQueueAlert;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ── Existing Header ───────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Title style={styles.greeting}>Hello, {adminName} 👋</Title>
        <Text style={styles.subtitle}>Here is the current overview</Text>
      </View>

      {loading ? (
        <ActivityIndicator animating size="large" style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* ── Existing Stat Cards ──────────────────────────────────────── */}
          <View style={styles.statsContainer}>
            <Card style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}>
              <Card.Content style={styles.cardContent}>
                <Icon name="account-injury" size={32} color={theme.colors.onPrimaryContainer} />
                <Title style={[styles.statNumber, { color: theme.colors.onPrimaryContainer }]}>
                  {totalPatients}
                </Title>
                <Paragraph style={{ color: theme.colors.onPrimaryContainer }}>Total Patients</Paragraph>
              </Card.Content>
            </Card>

            <Card style={[styles.card, { backgroundColor: theme.colors.secondaryContainer }]}>
              <Card.Content style={styles.cardContent}>
                <Icon name="doctor" size={32} color={theme.colors.onSecondaryContainer} />
                <Title style={[styles.statNumber, { color: theme.colors.onSecondaryContainer }]}>
                  {totalDoctors}
                </Title>
                <Paragraph style={{ color: theme.colors.onSecondaryContainer }}>Total Doctors</Paragraph>
              </Card.Content>
            </Card>
          </View>

          {/* ── Existing Token Card ──────────────────────────────────────── */}
          <Card style={styles.tokenCard}>
            <Card.Content style={styles.tokenContent}>
              <Icon name="ticket-confirmation-outline" size={34} color="#1b5e20" />
              <View style={styles.tokenTextBlock}>
                <Title style={styles.tokenNumber}>{todayTokens}</Title>
                <Paragraph style={styles.tokenLabel}>Tokens Generated Today</Paragraph>
              </View>
            </Card.Content>
          </Card>

          {/* ════════════════════════════════════════════════════════════════
              NEW SECTIONS START HERE
          ════════════════════════════════════════════════════════════════ */}

          {/* ── 1 · Today's Overview ─────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>Today's Overview</Text>

          <View style={styles.miniStatRow}>
            <Card style={[styles.miniStatCard, { backgroundColor: '#e3f2fd' }]}>
              <Card.Content style={styles.miniStatContent}>
                <Icon name="account-clock-outline" size={24} color="#1565c0" />
                <Text style={[styles.miniStatNumber, { color: '#1565c0' }]}>{patientsWaiting}</Text>
                <Text style={[styles.miniStatLabel, { color: '#1565c0' }]}>Waiting</Text>
              </Card.Content>
            </Card>
            <Card style={[styles.miniStatCard, { backgroundColor: '#fff8e1' }]}>
              <Card.Content style={styles.miniStatContent}>
                <Icon name="timer-outline" size={24} color="#f57f17" />
                <Text style={[styles.miniStatNumber, { color: '#f57f17' }]}>{avgWaitTime}</Text>
                <Text style={[styles.miniStatLabel, { color: '#f57f17' }]}>Avg Wait (min)</Text>
              </Card.Content>
            </Card>
            <Card style={[styles.miniStatCard, { backgroundColor: '#e8f5e9' }]}>
              <Card.Content style={styles.miniStatContent}>
                <Icon name="check-circle-outline" size={24} color="#2e7d32" />
                <Text style={[styles.miniStatNumber, { color: '#2e7d32' }]}>{patientsSeenToday}</Text>
                <Text style={[styles.miniStatLabel, { color: '#2e7d32' }]}>Seen Today</Text>
              </Card.Content>
            </Card>
          </View>

          {todayAppointments.length === 0 ? (
            <Text style={styles.emptyText}>No appointments today.</Text>
          ) : (
            <Card style={styles.listCard}>
              <Card.Content>
                {todayAppointments.map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.appointmentRow,
                      index < todayAppointments.length - 1 && styles.rowDivider,
                    ]}
                  >
                    <View style={styles.tokenBadge}>
                      <Text style={styles.tokenBadgeText}>{item.tokenNumber}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.apptPatientName}>{item.patientName}</Text>
                      <Text style={styles.apptSubtext}>ID: {item.patientDisplayId} · Dr. {item.doctorName}</Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: item.status === 'COMPLETED' ? '#c8e6c9' : item.status === 'IN_PROGRESS' ? '#fff9c4' : '#e3f2fd' }]}>
                      <Text style={[styles.statusChipText, { color: item.status === 'COMPLETED' ? '#2e7d32' : item.status === 'IN_PROGRESS' ? '#f57f17' : '#1565c0' }]}>
                        {item.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}

          {/* ── 2 · Doctor Availability ──────────────────────────────────── */}
          <Text style={styles.sectionHeader}>Doctor Availability</Text>

          {doctors.length === 0 ? (
            <Text style={styles.emptyText}>No doctors registered yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {doctors.map(doc => (
                <Card key={doc.id} style={styles.doctorCard}>
                  <Card.Content style={styles.doctorCardContent}>
                    <Icon
                      name="doctor"
                      size={28}
                      color={doc.isAvailable ? '#2e7d32' : '#9e9e9e'}
                    />
                    <Text style={styles.doctorName} numberOfLines={1}>
                      Dr. {doc.name}
                    </Text>
                    <Text style={styles.doctorSpecialty} numberOfLines={1}>
                      {doc.specialty}
                    </Text>
                    <View
                      style={[
                        styles.doctorBadge,
                        { backgroundColor: doc.isAvailable ? '#c8e6c9' : '#eeeeee' },
                      ]}
                    >
                      <View
                        style={[
                          styles.badgeDot,
                          { backgroundColor: doc.isAvailable ? '#2e7d32' : '#9e9e9e' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.doctorBadgeText,
                          { color: doc.isAvailable ? '#2e7d32' : '#757575' },
                        ]}
                      >
                        {doc.isAvailable ? 'Available' : 'Offline'}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </ScrollView>
          )}

          {/* ── 3 · Queue Status ─────────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>Queue Status</Text>

          {queueStatus.length === 0 ? (
            <Text style={styles.emptyText}>No active queues right now.</Text>
          ) : (
            <Card style={styles.listCard}>
              <Card.Content>
                {queueStatus.map((q, index) => {
                  const progress = Math.min(q.waitingCount / 10, 1);
                  return (
                    <View
                      key={q.doctorId}
                      style={[
                        styles.queueRow,
                        index < queueStatus.length - 1 && styles.rowDivider,
                      ]}
                    >
                      <Icon name="doctor" size={20} color="#5c6bc0" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <View style={styles.queueRowTop}>
                          <Text style={styles.queueDoctorName}>Dr. {q.doctorName}</Text>
                          <Text style={styles.queueCount}>{q.waitingCount} waiting</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${progress * 100}%` as any,
                                backgroundColor: progress >= 1 ? '#e53935' : progress >= 0.7 ? '#fb8c00' : '#43a047',
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </Card.Content>
            </Card>
          )}

          {/* ── 4 · Recent Activity ──────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>Recent Activity</Text>

          {recentActivity.length === 0 ? (
            <Text style={styles.emptyText}>No recent activity.</Text>
          ) : (
            <Card style={styles.listCard}>
              <Card.Content>
                {recentActivity.map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.activityRow,
                      index < recentActivity.length - 1 && styles.rowDivider,
                    ]}
                  >
                    <View style={styles.activityIconWrap}>
                      <Icon name={item.icon} size={22} color="#5c6bc0" />
                    </View>
                    <Text style={styles.activityText} numberOfLines={1}>{item.action}</Text>
                    <Text style={styles.activityTime}>{timeAgo(item.timestamp)}</Text>
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}

          {/* ── 5 · Quick Actions ────────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>Quick Actions</Text>

          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: '#1565c0' }]}
              onPress={() => navigation.navigate('RegisterUser')}
              activeOpacity={0.8}
            >
              <Icon name="ticket-confirmation-outline" size={22} color="#fff" />
              <Text style={styles.quickBtnText}>Generate{'\n'}Token</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: '#2e7d32' }]}
              onPress={() => navigation.navigate('SearchPatient')}
              activeOpacity={0.8}
            >
              <Icon name="format-list-numbered" size={22} color="#fff" />
              <Text style={styles.quickBtnText}>View{'\n'}Queue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: '#c62828' }]}
              onPress={() => navigation.navigate('RegisterUser')}
              activeOpacity={0.8}
            >
              <Icon name="ambulance" size={22} color="#fff" />
              <Text style={styles.quickBtnText}>Emergency{'\n'}Register</Text>
            </TouchableOpacity>
          </View>

          {/* ── 6 · Alerts ───────────────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>Alerts</Text>

          {!hasAlerts ? (
            <Text style={styles.noAlertText}>✓  No active alerts</Text>
          ) : (
            <View style={{ marginBottom: 16 }}>
              {highWaitAlert && (
                <Card style={[styles.alertCard, { backgroundColor: '#fffde7', borderLeftColor: '#f9a825' }]}>
                  <Card.Content style={styles.alertContent}>
                    <Icon name="clock-alert-outline" size={24} color="#f9a825" />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={[styles.alertTitle, { color: '#f57f17' }]}>High Wait Time</Text>
                      <Text style={styles.alertBody}>
                        Average wait time is {avgWaitTime} min — exceeds 30 min threshold.
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              )}

              {noDoctorAlert && (
                <Card style={[styles.alertCard, { backgroundColor: '#ffebee', borderLeftColor: '#e53935' }]}>
                  <Card.Content style={styles.alertContent}>
                    <Icon name="doctor" size={24} color="#e53935" />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={[styles.alertTitle, { color: '#c62828' }]}>No Doctor Active</Text>
                      <Text style={styles.alertBody}>
                        All doctors are currently offline. Patients cannot be attended.
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              )}

              {largeQueueAlert && (
                <Card style={[styles.alertCard, { backgroundColor: '#fff3e0', borderLeftColor: '#fb8c00' }]}>
                  <Card.Content style={styles.alertContent}>
                    <Icon name="account-group-outline" size={24} color="#fb8c00" />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={[styles.alertTitle, { color: '#e65100' }]}>Queue Overload</Text>
                      <Text style={styles.alertBody}>
                        A doctor's queue exceeds 10 patients. Consider adding more doctors.
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              )}
            </View>
          )}

          {/* ── Logout (moved to bottom) ──────────────────────────────────── */}
          <Button
            mode="outlined"
            onPress={async () => {
              // Must sign out of Supabase first so the persisted session is cleared
              try { await supabase.auth.signOut(); } catch (e) { console.error('Logout error', e); }
              dispatch(logout());
            }}
            style={styles.logoutBtn}
            icon="logout"
          >
            Logout
          </Button>
        </>
      )}
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Existing ──────────────────────────────────────────────────────────────
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 24, marginTop: 16 },
  greeting: { fontSize: 26, fontWeight: 'bold' },
  subtitle: { fontSize: 15, color: '#666', marginTop: 4 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  card: { flex: 1, marginHorizontal: 4, elevation: 4, borderRadius: 12 },
  cardContent: { alignItems: 'center', paddingVertical: 16 },
  statNumber: { fontSize: 36, fontWeight: 'bold', marginTop: 4 },
  tokenCard: { backgroundColor: '#e8f5e9', borderRadius: 12, elevation: 3, marginBottom: 24 },
  tokenContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 16 },
  tokenTextBlock: { marginLeft: 16 },
  tokenNumber: { fontSize: 36, fontWeight: 'bold', color: '#1b5e20' },
  tokenLabel: { color: '#2e7d32', fontSize: 14 },
  logoutBtn: { marginTop: 8, marginBottom: 32, alignSelf: 'center', width: '50%' },

  // ── New — shared ──────────────────────────────────────────────────────────
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#37474f',
    marginBottom: 10,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  emptyText: {
    fontSize: 13,
    color: '#9e9e9e',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  listCard: {
    borderRadius: 12,
    elevation: 3,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 8,
    paddingBottom: 8,
  },

  // ── Today's Overview ──────────────────────────────────────────────────────
  miniStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  miniStatCard: {
    flex: 1,
    borderRadius: 12,
    elevation: 2,
  },
  miniStatContent: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  miniStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  miniStatLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tokenBadge: {
    backgroundColor: '#e8eaf6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  tokenBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3949ab',
  },
  apptPatientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  apptSubtext: {
    fontSize: 11,
    color: '#757575',
    marginTop: 2,
  },
  statusChip: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Doctor Availability ───────────────────────────────────────────────────
  doctorCard: {
    width: 110,
    marginRight: 10,
    borderRadius: 12,
    elevation: 3,
    backgroundColor: '#ffffff',
  },
  doctorCardContent: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  doctorName: {
    fontSize: 12, // Matched with HomeScreen
    fontWeight: '600',
    color: '#212121',
    marginTop: 6,
    textAlign: 'center',
  },
  doctorSpecialty: {
    fontSize: 11,
    color: '#757575',
    marginBottom: 6,
    textAlign: 'center',
  },
  doctorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 4,
  },
  doctorBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Queue Status ──────────────────────────────────────────────────────────
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  queueRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  queueDoctorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  queueCount: {
    fontSize: 13,
    color: '#5c6bc0',
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },

  // ── Recent Activity ───────────────────────────────────────────────────────
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ede7f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityText: {
    flex: 1,
    fontSize: 13,
    color: '#37474f',
  },
  activityTime: {
    fontSize: 11,
    color: '#9e9e9e',
    marginLeft: 6,
  },

  // ── Quick Actions ─────────────────────────────────────────────────────────
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 3,
  },
  quickBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 16,
  },


  alertCard: {
    borderRadius: 12,
    elevation: 2,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  alertBody: {
    fontSize: 12,
    color: '#555',
    lineHeight: 17,
  },
  noAlertText: {
    fontSize: 14,
    color: '#9e9e9e',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
});
