import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import dbReducer, { setInitialDB } from './slices/dbSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    db: dbReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Simple persistence middleware-like function
export const initDB = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem('@opd_db');
    if (jsonValue != null) {
      store.dispatch(setInitialDB(JSON.parse(jsonValue)));
    }
  } catch (e) {
    console.error('Failed to fetch DB from storage', e);
  }

  // Subscribe to changes and save DB slice
  store.subscribe(() => {
    const state = store.getState();
    const dbState = state.db;
    AsyncStorage.setItem('@opd_db', JSON.stringify(dbState)).catch((e) => {
      console.error('Failed to save DB', e);
    });
  });
};
