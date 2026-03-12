import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AdminDashboard from '../screens/admin/AdminDashboard';
import RegisterPatientScreen from '../screens/admin/RegisterPatientScreen';
import DoctorRegistrationScreen from '../screens/admin/DoctorRegistrationScreen';
import SearchPatientScreen from '../screens/admin/SearchPatientScreen';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export type AdminTabParamList = {
  Dashboard: undefined;
  RegisterUser: undefined; // placeholder for Patient
  RegisterDoctor: undefined;
  SearchPatient: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

export default function AdminNavigator() {
  return (
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
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboard} options={{ title: 'Dashboard', headerShown: false }} />
      <Tab.Screen name="RegisterUser" component={RegisterPatientScreen} options={{ title: 'Register Patient' }} />
      <Tab.Screen name="RegisterDoctor" component={DoctorRegistrationScreen} options={{ title: 'Add Doctor' }} />
      <Tab.Screen name="SearchPatient" component={SearchPatientScreen} options={{ title: 'Search Patient' }} />
    </Tab.Navigator>
  );
}
