import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AdminDashboard from '../screens/admin/AdminDashboard';
import RegisterPatientScreen from '../screens/admin/RegisterPatientScreen';
import DoctorRegistrationScreen from '../screens/admin/DoctorRegistrationScreen';
import SearchPatientScreen from '../screens/admin/SearchPatientScreen';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppHeader from '../components/AppHeader';
import ProfilePanel from '../components/ProfilePanel';

export type AdminTabParamList = {
  Dashboard: undefined;
  RegisterUser: undefined;
  RegisterDoctor: undefined;
  SearchPatient: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

const TITLES: Record<string, string> = {
  Dashboard: 'Admin Dashboard',
  RegisterUser: 'Register Patient',
  RegisterDoctor: 'Add Doctor',
  SearchPatient: 'Search Patient',
};

export default function AdminNavigator() {
  const [profileVisible, setProfileVisible] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName = 'home';
            if (route.name === 'Dashboard') iconName = 'view-dashboard';
            else if (route.name === 'RegisterUser') iconName = 'account-plus';
            else if (route.name === 'RegisterDoctor') iconName = 'doctor';
            else if (route.name === 'SearchPatient') iconName = 'account-search';
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
        <Tab.Screen name="Dashboard" component={AdminDashboard} options={{ title: 'Dashboard' }} />
        <Tab.Screen name="RegisterUser" component={RegisterPatientScreen} options={{ title: 'Register Patient' }} />
        <Tab.Screen name="RegisterDoctor" component={DoctorRegistrationScreen} options={{ title: 'Add Doctor' }} />
        <Tab.Screen name="SearchPatient" component={SearchPatientScreen} options={{ title: 'Search Patient' }} />
      </Tab.Navigator>

      <ProfilePanel
        visible={profileVisible}
        onDismiss={() => setProfileVisible(false)}
      />
    </>
  );
}
