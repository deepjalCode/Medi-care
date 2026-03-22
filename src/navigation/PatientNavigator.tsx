import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import PatientDashboard from '../screens/patient/PatientDashboard';
import RenewTokenScreen from '../screens/patient/RenewTokenScreen';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import ProfilePanel from '../components/ProfilePanel';

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
    </>
  );
}
