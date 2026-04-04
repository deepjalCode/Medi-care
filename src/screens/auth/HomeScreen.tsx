import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import {
  Text,
  Title,
  useTheme,
  Card,
  Portal,
  Modal,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useGlobalStats } from '../../hooks/useGlobalStats';

// ─── Live Pulse Dot ──────────────────────────────────────────────────────────

function LiveDot() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
  );
}

// ─── Stat Tile ───────────────────────────────────────────────────────────────

interface StatTileProps {
  icon: string;
  value: number | string;
  label: string;
  bg: string;
  iconColor: string;
  valueColor: string;
  labelColor: string;
}

function StatTile({ icon, value, label, bg, iconColor, valueColor, labelColor }: StatTileProps) {
  return (
    <Card style={[styles.statCard, { backgroundColor: bg }]} mode="contained">
      <Card.Content style={styles.statContent}>
        <Icon name={icon} size={26} color={iconColor} />
        <Title style={[styles.statValue, { color: valueColor }]}>{value}</Title>
        <Text style={[styles.statLabel, { color: labelColor }]}>{label}</Text>
      </Card.Content>
    </Card>
  );
}

// ─── HomeScreen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [loginMenuVisible, setLoginMenuVisible] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { stats, doctors, loading, refresh } = useGlobalStats();

  // Track last update time whenever stats change
  useEffect(() => {
    if (!loading) setLastUpdated(new Date());
  }, [stats, loading]);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    return lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const navigateToLogin = () => {
    setLoginMenuVisible(false);
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Icon name="hospital-building" size={30} color={theme.colors.primary} />
          <Title style={styles.logoText}>Medi Care</Title>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="refresh" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <Card style={styles.heroCard} mode="elevated">
          <Card.Content>
            <Title style={styles.heroTitle}>Welcome to OPD System</Title>
            <Text style={styles.heroText}>
              Your centralized digital healthcare partner. Quick registration,
              easy appointments, and seamless token management.
            </Text>
          </Card.Content>
        </Card>

        {/* ── Live Stats Header ────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.liveRow}>
            <LiveDot />
            <Text style={styles.liveLabel}>LIVE STATISTICS</Text>
          </View>
          {lastUpdated && (
            <Text style={styles.lastUpdated}>Updated {formatLastUpdated()}</Text>
          )}
        </View>

        {/* ── Stats Grid ───────────────────────────────────────────────── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator animating size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Fetching live data…</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatTile
                icon="doctor"
                value={stats.totalDoctors}
                label="Total Doctors"
                bg={theme.colors.primaryContainer}
                iconColor={theme.colors.onPrimaryContainer}
                valueColor={theme.colors.onPrimaryContainer}
                labelColor={theme.colors.onPrimaryContainer}
              />
              <StatTile
                icon="account-group"
                value={stats.totalPatients}
                label="Total Patients"
                bg={theme.colors.secondaryContainer}
                iconColor={theme.colors.onSecondaryContainer}
                valueColor={theme.colors.onSecondaryContainer}
                labelColor={theme.colors.onSecondaryContainer}
              />
            </View>

            <View style={styles.statsRow}>
              <StatTile
                icon="ticket-confirmation-outline"
                value={stats.tokensToday}
                label="Tokens Today"
                bg="#e8f5e9"
                iconColor="#1b5e20"
                valueColor="#1b5e20"
                labelColor="#2e7d32"
              />
              <StatTile
                icon="hospital-marker"
                value={stats.activeDoctors}
                label="Active Doctors"
                bg="#fff3e0"
                iconColor="#e65100"
                valueColor="#e65100"
                labelColor="#bf360c"
              />
            </View>
          </>
        )}

        {/* ── Doctor List ──────────────────────────────────────────────── */}
        {!loading && doctors.length > 0 && (
          <>
            <Title style={styles.sectionTitle}>Our Doctors</Title>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.doctorScroll}
            >
              {doctors.map((doc) => (
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
                        styles.availabilityBadge,
                        { backgroundColor: doc.isAvailable ? '#c8e6c9' : '#eeeeee' },
                      ]}
                    >
                      <View
                        style={[
                          styles.availabilityDot,
                          { backgroundColor: doc.isAvailable ? '#2e7d32' : '#9e9e9e' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.availabilityText,
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
          </>
        )}

        {/* ── About ─────────────────────────────────────────────────────── */}
        <Card style={styles.infoCard} mode="elevated">
          <Card.Content>
            <Title style={styles.infoTitle}>About The App</Title>
            <Text style={styles.infoText}>
              This platform bridges the gap between patients, doctors, and
              administration. Features include patient registration, token
              generation, and real-time appointment management.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* ── Bottom Navbar ─────────────────────────────────────────────────── */}
      <View
        style={[
          styles.bottomNav,
          { borderTopColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface },
        ]}
      >
        <TouchableOpacity style={styles.navItem} onPress={() => setLoginMenuVisible(true)}>
          <Icon name="account-circle-outline" size={24} color={theme.colors.onSurface} style={styles.navIcon} />
          <Text style={{ fontSize: 12, color: theme.colors.onSurface }}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Icon name="newspaper-variant-outline" size={24} color={theme.colors.onSurface} style={styles.navIcon} />
          <Text style={{ fontSize: 12, color: theme.colors.onSurface }}>News</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Icon name="phone-outline" size={24} color={theme.colors.onSurface} style={styles.navIcon} />
          <Text style={{ fontSize: 12, color: theme.colors.onSurface }}>Contact</Text>
        </TouchableOpacity>

        <Button
          mode="contained"
          onPress={() => setLoginMenuVisible(true)}
          style={styles.loginCta}
        >
          Login
        </Button>
      </View>

      {/* ── Role Selection Modal ───────────────────────────────────────────── */}
      <Portal>
        <Modal
          visible={loginMenuVisible}
          onDismiss={() => setLoginMenuVisible(false)}
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
        >
          <Title style={styles.modalTitle}>Login As</Title>
          <Text style={styles.modalSubtitle}>Please select your user role to continue</Text>

          <Button
            mode="outlined"
            style={styles.roleButton}
            icon={({ color, size }) => <Icon name="account-injury" size={size} color={color} />}
            onPress={navigateToLogin}
          >
            Patient
          </Button>
          <Button
            mode="outlined"
            style={styles.roleButton}
            icon={({ color, size }) => <Icon name="doctor" size={size} color={color} />}
            onPress={navigateToLogin}
          >
            Doctor
          </Button>
          <Button
            mode="outlined"
            style={styles.roleButton}
            icon={({ color, size }) => <Icon name="shield-account" size={size} color={color} />}
            onPress={navigateToLogin}
          >
            Admin
          </Button>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 24, // Increased padding from top
    paddingBottom: 8,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoText: { fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
  refreshBtn: { padding: 4 },

  // Scroll
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Hero
  heroCard: { marginBottom: 20, borderRadius: 16 },
  heroTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  heroText: { fontSize: 14, color: '#555', lineHeight: 22 },

  // Live stats header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveRow: { flexDirection: 'row', alignItems: 'center' },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#43a047',
    marginRight: 6,
  },
  liveLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#43a047',
    letterSpacing: 1,
  },
  lastUpdated: { fontSize: 10, color: '#9e9e9e' },

  // Stats grid
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: { flex: 0.48, borderRadius: 16 },
  statContent: { alignItems: 'center', paddingVertical: 14 },
  statValue: {
    marginTop: 6,
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 38,
  },
  statLabel: { fontSize: 12, textAlign: 'center', marginTop: 2 },

  // Loading
  loadingBox: { alignItems: 'center', paddingVertical: 32 },
  loadingText: { marginTop: 12, color: '#9e9e9e', fontSize: 13 },

  // Section title
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 4 },

  // Doctor list
  doctorScroll: { marginBottom: 20 },
  doctorCard: {
    width: 120,
    marginRight: 10,
    borderRadius: 12,
    elevation: 3,
    backgroundColor: '#ffffff',
  },
  doctorCardContent: { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  doctorName: { fontSize: 12, fontWeight: '600', color: '#212121', marginTop: 6, textAlign: 'center' },
  doctorSpecialty: { fontSize: 11, color: '#757575', marginBottom: 6, textAlign: 'center' },
  availabilityBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  availabilityDot: { width: 7, height: 7, borderRadius: 4, marginRight: 4 },
  availabilityText: { fontSize: 10, fontWeight: '600' },

  // About
  infoCard: { marginBottom: 20, borderRadius: 16 },
  infoTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  infoText: { fontSize: 14, color: '#666', lineHeight: 22 },

  // Bottom nav
  bottomNav: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1,
  },
  navItem: { alignItems: 'center', marginRight: 24 },
  navIcon: { marginBottom: 4 },
  loginCta: { flex: 1, marginLeft: 'auto', borderRadius: 8 },

  // Modal
  modalContent: { padding: 24, margin: 20, borderRadius: 16 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  modalSubtitle: { textAlign: 'center', marginBottom: 20, color: '#666' },
  roleButton: { marginBottom: 12, paddingVertical: 6 },
});
