/**
 * DoctorNavigator (v2.0)
 *
 * Changes:
 * - Imports useNotificationContext to get unreadCount
 * - Passes showNotificationBell, unreadCount, onNotificationPress to AppHeader
 * - Adds NotificationScreen modal triggered by bell tap
 */

import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DoctorDashboard from '../screens/doctor/DoctorDashboard';
import PatientSearchScreen from '../screens/doctor/PatientSearchScreen';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import ProfilePanel from '../components/ProfilePanel';
// --- ADDED: Notification context + screen (Feature 2 & 3) ---
import { useNotificationContext } from '../context/NotificationContext';
import NotificationScreen from '../screens/NotificationScreen';
// --- END ADDED ---

export type DoctorTabParamList = {
  Dashboard: undefined;
  SearchPatient: undefined;
};

const Tab = createBottomTabNavigator<DoctorTabParamList>();

const TITLES: Record<string, string> = {
  Dashboard: 'Patient Queue',
  SearchPatient: 'Search Patient',
};

export default function DoctorNavigator() {
  const [profileVisible, setProfileVisible] = useState(false);

  // --- ADDED: Notification bell state (Feature 2 & 3) ---
  const [notifVisible, setNotifVisible] = useState(false);
  const { unreadCount } = useNotificationContext();
  // --- END ADDED ---

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
              // --- ADDED: Notification bell props (Feature 3) ---
              showNotificationBell={true}
              unreadCount={unreadCount}
              onNotificationPress={() => setNotifVisible(true)}
              // --- END ADDED ---
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

      {/* --- ADDED: Notification modal (Feature 2 & 3) --- */}
      <NotificationScreen
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
      />
      {/* --- END ADDED --- */}
    </>
  );
}
