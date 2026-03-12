import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string; // generated
  name: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  phone?: string;
  age?: string;
  specialty?: string; // For doctors
  password?: string; // For mock auth
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string | null; // null if waiting in general queue, or assigned to specific doctor
  date: string; // ISO date string
  reason: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
}



interface DBState {
  users: User[];
  appointments: Appointment[];
}

// Default admin for initial login
const initialState: DBState = {
  users: [
    {
      id: 'admin_1',
      name: 'Super Admin',
      role: 'ADMIN',
      password: 'admin',
    },
  ],
  appointments: [],
};

const dbSlice = createSlice({
  name: 'db',
  initialState,
  reducers: {
    // Overwrite entire state (used when loading from AsyncStorage)
    setInitialDB: (state, action: PayloadAction<DBState>) => {
      return action.payload;
    },
    addUser: (state, action: PayloadAction<User>) => {
      state.users.push(action.payload);
    },
    addAppointment: (state, action: PayloadAction<Appointment>) => {
      state.appointments.push(action.payload);
    },
    updateAppointmentStatus: (
      state,
      action: PayloadAction<{ appointmentId: string; status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' }>
    ) => {
      const appt = state.appointments.find((a) => a.id === action.payload.appointmentId);
      if (appt) {
        appt.status = action.payload.status;
      }
    },
  },
});

export const { setInitialDB, addUser, addAppointment, updateAppointmentStatus } = dbSlice.actions;
export default dbSlice.reducer;
