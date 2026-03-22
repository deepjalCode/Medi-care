import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Title,
  Button,
  useTheme,
  Switch,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { supabase } from '../services/supabaseSetup';
import { useGlobalStats } from '../hooks/useGlobalStats';
import { useNavigation } from '@react-navigation/native';

interface ProfilePanelProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Role-aware profile panel displayed as a modal.
 *
 * Content adapts based on user role:
 * - Patient: name, email/phone, total tokens, current active token
 * - Doctor: name, specialty, queue size, availability toggle
 * - Admin: name, totals (doctors/patients/tokens), quick links
 */
export default function ProfilePanel({ visible, onDismiss }: ProfilePanelProps) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { userId, userName, role } = useSelector(
    (state: RootState) => state.auth,
  );

  const { stats } = useGlobalStats();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ── Fetch role-specific data ─────────────────────────────────────────────

  useEffect(() => {
    if (!visible || !userId) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        if (role === 'PATIENT') {
          const [userRes, tokenRes] = await Promise.all([
            supabase
              .from('users')
              .select('email, phone')
              .eq('id', userId)
              .single(),
            supabase
              .from('appointments')
              .select('id, token, status, doctor_id, doctors ( users ( name ) )')
              .eq('patient_id', userId)
              .order('created_at', { ascending: false }),
          ]);

          const activeToken = (tokenRes.data ?? []).find(
            (t: any) => t.status === 'WAITING' || t.status === 'IN_PROGRESS',
          );

          setProfileData({
            email: userRes.data?.email,
            phone: userRes.data?.phone,
            totalTokens: tokenRes.data?.length ?? 0,
            activeToken: activeToken
              ? {
                  number: activeToken.token,
                  status: activeToken.status,
                  doctor: activeToken.doctors?.users?.name ?? 'N/A',
                }
              : null,
          });
        } else if (role === 'DOCTOR') {
          const todayDate = new Date().toISOString().split('T')[0];

          const [docRes, queueRes] = await Promise.all([
            supabase
              .from('doctors')
              .select('speciality')
              .eq('id', userId)
              .single(),
            supabase
              .from('appointments')
              .select('id', { count: 'exact', head: true })
              .eq('doctor_id', userId)
              .eq('visit_date', todayDate)
              .in('status', ['WAITING', 'IN_PROGRESS']),
          ]);

          setProfileData({
            specialty: docRes.data?.speciality ?? 'General',
            queueSize: queueRes.count ?? 0,
          });
        }
        // Admin doesn't need extra fetching — uses globalStats
      } catch (err) {
        console.error('ProfilePanel: fetch failed', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [visible, userId, role]);

  // ── Logout ─────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error', err);
    }
    dispatch(logout());
    onDismiss();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Icon
              name="account-circle"
              size={56}
              color={theme.colors.primary}
            />
            <Title style={styles.name}>{userName}</Title>
            <Text style={styles.roleBadge}>
              {role === 'ADMIN'
                ? '🛡 Administrator'
                : role === 'DOCTOR'
                ? '🩺 Doctor'
                : '🏥 Patient'}
            </Text>
          </View>

          <Divider style={styles.divider} />

          {loading ? (
            <ActivityIndicator animating style={{ marginVertical: 20 }} />
          ) : (
            <>
              {/* Patient-specific info */}
              {role === 'PATIENT' && profileData && (
                <View style={styles.section}>
                  <InfoRow
                    icon="email-outline"
                    label="Email"
                    value={profileData.email ?? 'N/A'}
                  />
                  <InfoRow
                    icon="phone-outline"
                    label="Phone"
                    value={profileData.phone ?? 'N/A'}
                  />
                  <InfoRow
                    icon="ticket-outline"
                    label="Total Tokens"
                    value={String(profileData.totalTokens)}
                  />
                  {profileData.activeToken && (
                    <View style={styles.activeTokenCard}>
                      <Text style={styles.activeTokenLabel}>
                        Active Token
                      </Text>
                      <Text style={styles.activeTokenNumber}>
                        #{profileData.activeToken.number}
                      </Text>
                      <Text style={styles.activeTokenStatus}>
                        {profileData.activeToken.status.replace('_', ' ')} —
                        Dr. {profileData.activeToken.doctor}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Doctor-specific info */}
              {role === 'DOCTOR' && profileData && (
                <View style={styles.section}>
                  <InfoRow
                    icon="stethoscope"
                    label="Specialty"
                    value={profileData.specialty}
                  />
                  <InfoRow
                    icon="account-group"
                    label="Current Queue"
                    value={`${profileData.queueSize} patients`}
                  />
                </View>
              )}

              {/* Admin-specific info */}
              {role === 'ADMIN' && (
                <View style={styles.section}>
                  <InfoRow
                    icon="doctor"
                    label="Total Doctors"
                    value={String(stats.totalDoctors)}
                  />
                  <InfoRow
                    icon="account-group"
                    label="Total Patients"
                    value={String(stats.totalPatients)}
                  />
                  <InfoRow
                    icon="ticket-confirmation-outline"
                    label="Tokens Today"
                    value={String(stats.tokensToday)}
                  />
                </View>
              )}
            </>
          )}

          <Divider style={styles.divider} />

          <Button
            mode="outlined"
            onPress={handleLogout}
            style={styles.logoutBtn}
            icon="logout"
            textColor="#e53935"
          >
            Logout
          </Button>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

// ── Helper component ─────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} size={20} color="#666" style={{ marginRight: 10 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 8,
  },
  roleBadge: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
  },
  section: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    color: '#666',
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontWeight: '600',
    fontSize: 14,
    color: '#212121',
  },
  activeTokenCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  activeTokenLabel: {
    color: '#2e7d32',
    fontWeight: 'bold',
    fontSize: 12,
  },
  activeTokenNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginVertical: 4,
  },
  activeTokenStatus: {
    fontSize: 13,
    color: '#388e3c',
  },
  logoutBtn: {
    borderColor: '#e53935',
    marginTop: 4,
  },
});
