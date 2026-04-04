import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UserRole = 'ADMIN' | 'DOCTOR' | 'PATIENT' | null;

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  role: UserRole;
  userName: string | null;
  roleId: string | null;  // PAT-000001, DOC-000001, ADM-000001
  loading: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  userId: null,
  role: null,
  userName: null,
  roleId: null,
  loading: true, // true by default since we must check Supabase auth state on load
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (
      state,
      action: PayloadAction<{ userId: string; role: UserRole; userName: string; roleId: string }>
    ) => {
      state.isAuthenticated = true;
      state.userId = action.payload.userId;
      state.role = action.payload.role;
      state.userName = action.payload.userName;
      state.roleId = action.payload.roleId;
      state.loading = false;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.userId = null;
      state.role = null;
      state.userName = null;
      state.roleId = null;
      state.loading = false;
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { login, logout, setAuthLoading } = authSlice.actions;
export default authSlice.reducer;
