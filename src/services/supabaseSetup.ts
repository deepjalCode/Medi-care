import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Supabase project credentials (OPD-App project)
const supabaseUrl = 'https://houuwfihumnrudczjynl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdXV3ZmlodW1ucnVkY3pqeW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzg2NTAsImV4cCI6MjA4ODgxNDY1MH0.gy5c7tuDTPvp8cuo9aAi0wnzRP4NRz1O13JWzCCywD0';

/** Primary client — persists the user session in AsyncStorage */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Secondary client — no session persistence.
 * Use this when creating new user accounts from an admin context
 * so the current admin session is not overwritten.
 */
export const secondarySupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
