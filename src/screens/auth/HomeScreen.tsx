import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useGlobalStats } from '../../hooks/useGlobalStats';

export default function HomeScreen() {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [loginMenuVisible, setLoginMenuVisible] = useState(false);

  // Live stats from Supabase
  const { stats, doctors, loading } = useGlobalStats();

  const navigateToLogin = () => {
    setLoginMenuVisible(false);
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Icon
            name="hospital-building"
            size={32}
            color={theme.colors.primary}
          />
          <Title style={styles.logoText}>Medi Care</Title>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Card style={styles.heroCard} mode="elevated">
          <Card.Content>
            <Title style={styles.heroTitle}>Welcome to OPD System</Title>
            <Text style={styles.heroText}>
              Your centralized digital healthcare partner. Quick registration,
              easy appointments, and seamless token management.
            </Text>
          </Card.Content>
        </Card>

        {/* Live Statistics Section */}
        {loading ? (
          <ActivityIndicator
            animating
            size="large"
            style={{ marginVertical: 20 }}
          />
        ) : (
          <>
            <View style={styles.analyticsContainer}>
              <Card
                style={[
                  styles.statCard,
                  { backgroundColor: theme.colors.primaryContainer },
                ]}
                mode="contained"
              >
                <Card.Content style={styles.statContent}>
                  <Icon
                    name="doctor"
                    size={28}
                    color={theme.colors.onPrimaryContainer}
                  />
                  <Title
                    style={{
                      color: theme.colors.onPrimaryContainer,
                      marginTop: 4,
                      fontSize: 28,
                      fontWeight: 'bold',
                    }}
                  >
                    {stats.totalDoctors}
                  </Title>
                  <Text style={{ color: theme.colors.onPrimaryContainer, fontSize: 12 }}>
                    Total Doctors
                  </Text>
                </Card.Content>
              </Card>

              <Card
                style={[
                  styles.statCard,
                  { backgroundColor: theme.colors.secondaryContainer },
                ]}
                mode="contained"
              >
                <Card.Content style={styles.statContent}>
                  <Icon
                    name="account-group"
                    size={28}
                    color={theme.colors.onSecondaryContainer}
                  />
                  <Title
                    style={{
                      color: theme.colors.onSecondaryContainer,
                      marginTop: 4,
                      fontSize: 28,
                      fontWeight: 'bold',
                    }}
                  >
                    {stats.totalPatients}
                  </Title>
                  <Text style={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }}>
                    Total Patients
                  </Text>
                </Card.Content>
              </Card>
            </View>

            <View style={styles.analyticsContainer}>
              <Card
                style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}
                mode="contained"
              >
                <Card.Content style={styles.statContent}>
                  <Icon
                    name="ticket-confirmation-outline"
                    size={28}
                    color="#1b5e20"
                  />
                  <Title
                    style={{
                      color: '#1b5e20',
                      marginTop: 4,
                      fontSize: 28,
                      fontWeight: 'bold',
                    }}
                  >
                    {stats.tokensToday}
                  </Title>
                  <Text style={{ color: '#2e7d32', fontSize: 12 }}>
                    Tokens Today
                  </Text>
                </Card.Content>
              </Card>

              <Card
                style={[styles.statCard, { backgroundColor: '#fff3e0' }]}
                mode="contained"
              >
                <Card.Content style={styles.statContent}>
                  <Icon name="hospital-marker" size={28} color="#e65100" />
                  <Title
                    style={{
                      color: '#e65100',
                      marginTop: 4,
                      fontSize: 28,
                      fontWeight: 'bold',
                    }}
                  >
                    {stats.activeDoctors}
                  </Title>
                  <Text style={{ color: '#bf360c', fontSize: 12 }}>
                    Active Doctors
                  </Text>
                </Card.Content>
              </Card>
            </View>

            {/* Doctor List */}
            {doctors.length > 0 && (
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
                          color={doc.isAvailable ? '#2e7d32' : '#757575'}
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
                            {
                              backgroundColor: doc.isAvailable
                                ? '#c8e6c9'
                                : '#eeeeee',
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.availabilityDot,
                              {
                                backgroundColor: doc.isAvailable
                                  ? '#2e7d32'
                                  : '#9e9e9e',
                              },
                            ]}
                          />
                          <Text
                            style={[
                              styles.availabilityText,
                              {
                                color: doc.isAvailable ? '#2e7d32' : '#757575',
                              },
                            ]}
                          >
                            {doc.isAvailable ? 'Active' : 'Offline'}
                          </Text>
                        </View>
                      </Card.Content>
                    </Card>
                  ))}
                </ScrollView>
              </>
            )}
          </>
        )}

        {/* About Info */}
        <Card style={styles.infoCard} mode="elevated">
          <Card.Content>
            <Title style={styles.infoTitle}>About The App</Title>
            <Text style={styles.infoText}>
              This platform bridges the gap between patients, doctors, and
              administration. Features include patient registration, token
              generation, and appointment management.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Bottom Navbar & CTA */}
      <View
        style={[
          styles.bottomNav,
          {
            borderTopColor: theme.colors.outlineVariant,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setLoginMenuVisible(true)}
        >
          <Icon
            name="account-circle-outline"
            size={24}
            color={theme.colors.onSurface}
            style={styles.navIcon}
          />
          <Text style={{ fontSize: 12, color: theme.colors.onSurface }}>
            Profile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Icon
            name="newspaper-variant-outline"
            size={24}
            color={theme.colors.onSurface}
            style={styles.navIcon}
          />
          <Text style={{ fontSize: 12, color: theme.colors.onSurface }}>
            News
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Icon
            name="phone-outline"
            size={24}
            color={theme.colors.onSurface}
            style={styles.navIcon}
          />
          <Text style={{ fontSize: 12, color: theme.colors.onSurface }}>
            Contact
          </Text>
        </TouchableOpacity>

        <Button
          mode="contained"
          onPress={() => setLoginMenuVisible(true)}
          style={styles.loginCta}
        >
          Login
        </Button>
      </View>

      {/* Role Selection Modal */}
      <Portal>
        <Modal
          visible={loginMenuVisible}
          onDismiss={() => setLoginMenuVisible(false)}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Title style={styles.modalTitle}>Login As</Title>
          <Text style={styles.modalSubtitle}>
            Please select your user role to continue
          </Text>

          <Button
            mode="outlined"
            style={styles.roleButton}
            icon={({ color, size }) => (
              <Icon name="account-injury" size={size} color={color} />
            )}
            onPress={() => navigateToLogin()}
          >
            Patient
          </Button>
          <Button
            mode="outlined"
            style={styles.roleButton}
            icon={({ color, size }) => (
              <Icon name="doctor" size={size} color={color} />
            )}
            onPress={() => navigateToLogin()}
          >
            Doctor
          </Button>
          <Button
            mode="outlined"
            style={styles.roleButton}
            icon={({ color, size }) => (
              <Icon name="shield-account" size={size} color={color} />
            )}
            onPress={() => navigateToLogin()}
          >
            Admin
          </Button>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    marginBottom: 20,
    borderRadius: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  heroText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  analyticsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    flex: 0.48,
    borderRadius: 16,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  doctorScroll: {
    marginBottom: 20,
  },
  doctorCard: {
    width: 120,
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
    fontSize: 13,
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
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  availabilityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 4,
  },
  availabilityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoCard: {
    marginBottom: 20,
    borderRadius: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  navItem: {
    alignItems: 'center',
    marginRight: 24,
  },
  navIcon: {
    marginBottom: 4,
  },
  loginCta: {
    flex: 1,
    marginLeft: 'auto',
    borderRadius: 8,
  },
  modalContent: {
    padding: 24,
    margin: 20,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalSubtitle: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  roleButton: {
    marginBottom: 12,
    paddingVertical: 6,
  },
});
