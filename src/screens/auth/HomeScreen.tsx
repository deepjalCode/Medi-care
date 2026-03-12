import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Title, useTheme, Card, Portal, Modal, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

export default function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [loginMenuVisible, setLoginMenuVisible] = useState(false);

  // Stats from mock DB (prepared for Firebase later)
  const users = useSelector((state: RootState) => state.db.users);
  const totalDoctors = users.filter(u => u.role === 'DOCTOR').length;
  const totalPatients = users.filter(u => u.role === 'PATIENT').length;

  const navigateToLogin = (role: 'PATIENT' | 'DOCTOR' | 'ADMIN') => {
    setLoginMenuVisible(false);
    navigation.navigate('Login'); // We could optionally pass { role } if LoginScreen is updated to accept it
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Icon name="hospital-building" size={32} color={theme.colors.primary} />
          <Title style={styles.logoText}>Medi Care</Title>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={() => { }}>
          <Icon name="bell-outline" size={28} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <Card style={styles.heroCard} mode="elevated">
          <Card.Content>
            <Title style={styles.heroTitle}>Welcome to OPD System</Title>
            <Text style={styles.heroText}>
              Your centralized digital healthcare partner. Quick registration, easy appointments, and seamless token management.
            </Text>
          </Card.Content>
        </Card>

        {/* Analytics Section */}
        <View style={styles.analyticsContainer}>
          <Card style={[styles.statCard, { backgroundColor: theme.colors.primaryContainer }]} mode="contained">
            <Card.Content style={styles.statContent}>
              <Icon name="doctor" size={32} color={theme.colors.onPrimaryContainer} />
              <Title style={{ color: theme.colors.onPrimaryContainer, marginTop: 4 }}>{totalDoctors}</Title>
              <Text style={{ color: theme.colors.onPrimaryContainer }}>Doctors</Text>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: theme.colors.secondaryContainer }]} mode="contained">
            <Card.Content style={styles.statContent}>
              <Icon name="account-injury" size={32} color={theme.colors.onSecondaryContainer} />
              <Title style={{ color: theme.colors.onSecondaryContainer, marginTop: 4 }}>{totalPatients}</Title>
              <Text style={{ color: theme.colors.onSecondaryContainer }}>Patients</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Additional Info */}
        <Card style={styles.infoCard} mode="elevated">
          <Card.Content>
            <Title style={styles.infoTitle}>About The App</Title>
            <Text style={styles.infoText}>
              This platform bridges the gap between patients, doctors, and administration. Features include patient registration, token generation, and appointment management.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Bottom Navbar & CTA */}
      <View style={[styles.bottomNav, { borderTopColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
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

      {/* Role Selection Modal */}
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
            onPress={() => navigateToLogin('PATIENT')}
          >
            Patient
          </Button>
          <Button
            mode="outlined"
            style={styles.roleButton}
            icon={({ color, size }) => <Icon name="doctor" size={size} color={color} />}
            onPress={() => navigateToLogin('DOCTOR')}
          >
            Doctor
          </Button>
          <Button
            mode="outlined"
            style={styles.roleButton}
            icon={({ color, size }) => <Icon name="shield-account" size={size} color={color} />}
            onPress={() => navigateToLogin('ADMIN')}
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
  iconButton: {
    padding: 8,
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
    marginBottom: 20,
  },
  statCard: {
    flex: 0.48,
    borderRadius: 16,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 12,
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
  }
});
