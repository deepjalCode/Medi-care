import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import PatientDashboard from '../screens/patient/PatientDashboard';
import RenewTokenScreen from '../screens/patient/RenewTokenScreen';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export type PatientTabParamList = {
  Dashboard: undefined;
  RenewToken: undefined; // placeholder
};

const Tab = createBottomTabNavigator<PatientTabParamList>();

export default function PatientNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName = 'home';
          if (route.name === 'Dashboard') iconName = 'view-dashboard';
          else if (route.name === 'RenewToken') iconName = 'ticket-confirmation';
          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={PatientDashboard} options={{ title: 'My Tokens' }} />
      <Tab.Screen name="RenewToken" component={RenewTokenScreen} options={{ title: 'Renew Token' }} />
    </Tab.Navigator>
  );
}
