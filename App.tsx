import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { PaperProvider, MD3LightTheme as DefaultTheme } from 'react-native-paper';
import { store, initDB } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { supabase } from './src/services/supabaseSetup';
import { getUserProfile, UserData } from './src/services/userService';
import { login, logout, setAuthLoading } from './src/store/slices/authSlice';


const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#a2d2ff', // Light Blue
    onPrimary: '#002a4d', // Dark text on light blue
    primaryContainer: '#bde0fe', // Lighter Blue
    onPrimaryContainer: '#002a4d',
    secondary: '#cdb4db', // Pastel Purple
    onSecondary: '#2b1040', // Dark text on pastel purple
    secondaryContainer: '#ebdff2', // Lighter Purple
    onSecondaryContainer: '#2b1040',
    background: '#f8fbff', // Tinted white
    surface: '#ffffff',
  },
};

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // Initialize DB from AsyncStorage and setup autosave
    initDB().then(() => setDbReady(true));
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      const user = session?.user;
      if (user) {
        try {
          let profile: UserData | null = null;

          // Force super-admin role if email matches the fixed admin
          const email = user.email?.toLowerCase();
          if (email === 'dee@gmail.com') {
            profile = {
              id: user.id,
              email: user.email,
              name: 'Admin',
              role: 'ADMIN',
            } as UserData;
          } else {
            // Fetch additional user profile data from Supabase
            profile = await getUserProfile(user.id);
          }

          if (profile) {
            store.dispatch(login({
              userId: user.id,
              role: profile.role,
              userName: profile.name,
            }));
          } else {
            // User exists in auth but no profile - rare, force logout or handle gracefully
            store.dispatch(logout());
          }
        } catch (e: any) {
          // Don't logout on transient/network errors
          const isTransient = e?.message?.includes('fetch') ||
            e?.message?.includes('network') ||
            e?.code === 'PGRST116';
          if (isTransient) {
            console.warn('Transient error on auth change, skipping logout:', e?.message);
          } else {
            console.error('Error fetching profile on auth change', e);
            store.dispatch(logout());
          }
        }
      } else {
        // User is signed out
        store.dispatch(logout());
      }
      store.dispatch(setAuthLoading(false));
    });

    return () => {
      subscription.unsubscribe();
    }; // Cleanup subscription on unmount
  }, []);

  if (!dbReady) {
    return null; // A proper app might have a splash screen here
  }

  return (
    <ReduxProvider store={store}>
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <RootNavigator />
        </SafeAreaProvider>
      </PaperProvider>
    </ReduxProvider>
  );
}
