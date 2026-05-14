/**
 * PatientNavigator (v3.0)
 *
 * Changes from v2.0:
 * - Added Prescriptions tab (PrescriptionsScreen) with pill icon
 * - Existing notification bell + profile panel logic unchanged
 */

import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import PatientDashboard from '../screens/patient/PatientDashboard';
import RenewTokenScreen from '../screens/patient/RenewTokenScreen';
import PrescriptionsScreen from '../screens/patient/PrescriptionsScreen';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import ProfilePanel from '../components/ProfilePanel';
import { useNotificationContext } from '../context/NotificationContext';
import NotificationScreen from '../screens/NotificationScreen';

export type PatientTabParamList = {
  Dashboard: undefined;
  Prescriptions: undefined;
  RenewToken: undefined;
};



const Tab = createBottomTabNavigator<PatientTabParamList>();

const TITLES: Record<string, string> = {
  Dashboard: 'My Tokens',
  Prescriptions: 'My Prescriptions',
  RenewToken: 'Renew Token',
};

export default function PatientNavigator() {
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
            else if (route.name === 'Prescriptions') iconName = 'pill';
            else if (route.name === 'RenewToken') iconName = 'ticket-confirmation';
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
        <Tab.Screen name="Dashboard" component={PatientDashboard} options={{ title: 'My Tokens' }} />
        <Tab.Screen name="Prescriptions" component={PrescriptionsScreen} options={{ title: 'Prescriptions' }} />
        <Tab.Screen name="RenewToken" component={RenewTokenScreen} options={{ title: 'Renew Token' }} />
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
