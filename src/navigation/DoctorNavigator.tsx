import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DoctorDashboard from '../screens/doctor/DoctorDashboard';
import PatientSearchScreen from '../screens/doctor/PatientSearchScreen';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import ProfilePanel from '../components/ProfilePanel';

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
    </>
  );
}
