/**
 * PatientNavigator (v2.0)
 *
 * Changes:
 * - Imports useNotificationContext to get unreadCount
 * - Passes showNotificationBell, unreadCount, onNotificationPress to AppHeader
 * - Adds NotificationScreen modal triggered by bell tap
 */

import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import PatientDashboard from '../screens/patient/PatientDashboard';
import RenewTokenScreen from '../screens/patient/RenewTokenScreen';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import ProfilePanel from '../components/ProfilePanel';
// --- ADDED: Notification context + screen (Feature 2 & 3) ---
import { useNotificationContext } from '../context/NotificationContext';
import NotificationScreen from '../screens/NotificationScreen';
// --- END ADDED ---

export type PatientTabParamList = {
  Dashboard: undefined;
  RenewToken: undefined;
};

const Tab = createBottomTabNavigator<PatientTabParamList>();

const TITLES: Record<string, string> = {
  Dashboard: 'My Tokens',
  RenewToken: 'Renew Token',
};

export default function PatientNavigator() {
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
            else if (route.name === 'RenewToken') iconName = 'ticket-confirmation';
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
        <Tab.Screen name="Dashboard" component={PatientDashboard} options={{ title: 'My Tokens' }} />
        <Tab.Screen name="RenewToken" component={RenewTokenScreen} options={{ title: 'Renew Token' }} />
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
