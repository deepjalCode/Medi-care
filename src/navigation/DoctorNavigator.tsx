import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DoctorDashboard from '../screens/doctor/DoctorDashboard';
import PatientSearchScreen from '../screens/doctor/PatientSearchScreen';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export type DoctorTabParamList = {
  Dashboard: undefined;
  SearchPatient: undefined; // placeholder
};

const Tab = createBottomTabNavigator<DoctorTabParamList>();

export default function DoctorNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home';
          if (route.name === 'Dashboard') iconName = 'view-dashboard';
          else if (route.name === 'SearchPatient') iconName = 'magnify';
          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DoctorDashboard} options={{ title: 'Daily Patients' }} />
      <Tab.Screen name="SearchPatient" component={PatientSearchScreen} options={{ title: 'Search Patient' }} />
    </Tab.Navigator>
  );
}
