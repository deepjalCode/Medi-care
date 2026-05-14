/**
 * DoctorNavigator (v3.0)
 *
 * Changes from v2.0:
 * - Wraps bottom tabs in a NativeStackNavigator so AddPrescriptionScreen
 *   can be pushed as a full-screen stack route from DoctorDashboard.
 * - Existing notification bell + profile panel logic unchanged.
 */

import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DoctorDashboard from '../screens/doctor/DoctorDashboard';
import PatientSearchScreen from '../screens/doctor/PatientSearchScreen';
import AddPrescriptionScreen from '../screens/doctor/AddPrescriptionScreen';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import ProfilePanel from '../components/ProfilePanel';
import { useNotificationContext } from '../context/NotificationContext';
import NotificationScreen from '../screens/NotificationScreen';

// ─── Param lists ────────────────────────────────────────────────────────────────

export type DoctorTabParamList = {
  Dashboard: undefined;
  SearchPatient: undefined;
};

export type DoctorStackParamList = {
  DoctorTabs: undefined;
  AddPrescription: {
    patientId: string;
    patientName: string;
    appointmentId?: string;
    tokenNumber?: string;
  };
};

const Tab = createBottomTabNavigator<DoctorTabParamList>();
const Stack = createNativeStackNavigator<DoctorStackParamList>();

const TITLES: Record<string, string> = {
  Dashboard: 'Patient Queue',
  SearchPatient: 'Search Patient',
};

// ─── Tabs (inner) ───────────────────────────────────────────────────────────────

function DoctorTabs() {
  const [profileVisible, setProfileVisible] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const { unreadCount } = useNotificationContext();

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName = 'home';
            if (route.name === 'Dashboard') iconName = 'view-dashboard';
            else if (route.name === 'SearchPatient') iconName = 'magnify';
            return <Icon name={iconName} size={size} color={color} />;
          },
          header: () => (
            <AppHeader
              title={TITLES[route.name] ?? route.name}
              onProfilePress={() => setProfileVisible(true)}
              showNotificationBell={true}
              unreadCount={unreadCount}
              onNotificationPress={() => setNotifVisible(true)}
            />
          ),
        })}
      >
        <Tab.Screen name="Dashboard" component={DoctorDashboard} options={{ title: 'Daily Patients' }} />
        <Tab.Screen name="SearchPatient" component={PatientSearchScreen} options={{ title: 'Search Patient' }} />
      </Tab.Navigator>

      <ProfilePanel
        visible={profileVisible}
        onDismiss={() => setProfileVisible(false)}
      />

      <NotificationScreen
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
      />
    </>
  );
}

// ─── Stack (outer) ──────────────────────────────────────────────────────────────

export default function DoctorNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DoctorTabs" component={DoctorTabs} />
      <Stack.Screen
        name="AddPrescription"
        component={AddPrescriptionScreen}
        options={{
          headerShown: true,
          title: 'Add Prescription',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
}
