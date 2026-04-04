import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { PaperProvider, MD3LightTheme as DefaultTheme, ActivityIndicator } from 'react-native-paper';
import { View, StyleSheet } from 'react-native';
import { store, initDB } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { supabase } from './src/services/supabaseSetup';
import { getUserProfile, UserData } from './src/services/userService';
import { login, logout, setAuthLoading } from './src/store/slices/authSlice';
import InAppNotificationBanner from './src/components/InAppNotificationBanner';
import { NotificationProvider, useNotificationContext } from './src/context/NotificationContext';

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

// ─── Splash/Loading Screen (shown while auth check resolves) ─────────────────

function SplashScreen() {
  return (
    <View style={splashStyles.container}>
      <ActivityIndicator animating size="large" color="#a2d2ff" />
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fbff' },
});

// ─── Inner App (needs Redux + NotificationContext) ────────────────────────────

function AppInner() {
  // Driven by NotificationContext — eliminates the duplicate useNotifications subscription
  const { notifications, markRead } = useNotificationContext();

  // Show the latest unread notification as a banner
  const latestUnread = notifications.find(n => !n.read) ?? null;

  const handleDismiss = () => {
    if (latestUnread) {
      markRead(latestUnread.id);
    }
  };

  return (
    <>
      <RootNavigator />
      <InAppNotificationBanner
        notification={latestUnread}
        onDismiss={handleDismiss}
      />
    </>
  );
}

// ─── Root App ────────────────────────────────────────────────────────────────

export default function App() {
  const [authResolved, setAuthResolved] = useState(false);

  useEffect(() => {
    // Fire-and-forget: load legacy Redux DB from AsyncStorage.
    // No longer blocks the render — it happens in the background.
    initDB();
  }, []);

  useEffect(() => {
    let isMounted = true;
    let resolved = false;
    let fallbackTimer: ReturnType<typeof setTimeout>;

    const resolveAuth = () => {
      if (resolved) return;
      resolved = true;
      store.dispatch(setAuthLoading(false));
      if (isMounted) setAuthResolved(true);
      clearTimeout(fallbackTimer);
    };

    /**
     * Fetch profile and dispatch login/logout.
     *
     * IMPORTANT: This must run OUTSIDE the onAuthStateChange callback.
     * Supabase JS internally locks getSession() until the auth callback
     * returns.  If we await a REST call (which calls getSession()) inside
     * the callback, we get a deadlock:
     *   callback awaits REST → REST awaits getSession() → getSession()
     *   awaits callback → 💀
     *
     * Using setTimeout(0) breaks out of the lock context.
     */
    const fetchProfileAndResolve = async (user: any) => {
      if (!isMounted) { resolveAuth(); return; }
      try {
        if (user) {
          const profile: UserData | null = await getUserProfile(user.id);
          if (!isMounted) return;
          if (profile) {
            store.dispatch(
              login({
                userId: user.id,
                role: profile.role,
                userName: profile.name,
                roleId: profile.roleId ?? '',
              }),
            );
          } else {
            store.dispatch(logout());
          }
        } else {
          store.dispatch(logout());
        }
      } catch (e: any) {
        console.error('Error fetching profile on auth change', e);
        if (isMounted) store.dispatch(logout());
      } finally {
        resolveAuth();
      }
    };

    // Subscribe to auth state changes.
    // The callback does NOT await any Supabase REST calls — it defers
    // the profile fetch via setTimeout(0) to avoid the getSession() deadlock.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      // Defer to next tick so the auth lock is released before we call REST APIs
      setTimeout(() => fetchProfileAndResolve(session?.user), 0);
    });

    // Absolute fallback — prevents permanent splash screen
    fallbackTimer = setTimeout(() => {
      if (isMounted && !resolved) {
        console.warn('Auth resolve timed out, forcing unlock.');
        store.dispatch(setAuthLoading(false));
        setAuthResolved(true);
      }
    }, 10_000);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  if (!authResolved) {
    // Show a branded splash instead of a blank/null screen
    return (
      <PaperProvider theme={theme}>
        <SplashScreen />
      </PaperProvider>
    );
  }

  return (
    <ReduxProvider store={store}>
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          {/* NotificationProvider wraps AppInner so useNotificationContext works inside */}
          <NotificationProvider>
            <AppInner />
          </NotificationProvider>
        </SafeAreaProvider>
      </PaperProvider>
    </ReduxProvider>
  );
}
