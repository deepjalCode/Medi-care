import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import AuthNavigator from './AuthNavigator';
import AdminNavigator from './AdminNavigator';
import DoctorNavigator from './DoctorNavigator';
import PatientNavigator from './PatientNavigator';

export default function RootNavigator() {
  const { isAuthenticated, role } = useSelector((state: RootState) => state.auth);

  let Navigator = AuthNavigator;

  if (isAuthenticated && role) {
    switch (role) {
      case 'ADMIN':
        Navigator = AdminNavigator;
        break;
      case 'DOCTOR':
        Navigator = DoctorNavigator;
        break;
      case 'PATIENT':
        Navigator = PatientNavigator;
        break;
    }
  }

  return (
    <NavigationContainer>
      <Navigator />
    </NavigationContainer>
  );
}
