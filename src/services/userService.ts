import { supabase } from './supabaseSetup';
import { UserRole } from '../store/slices/authSlice';

export interface UserData {
  id: string;           // Supabase Auth UID
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  specialty?: string;   // For doctors (from doctors.speciality)
  department?: string;  // For doctors
  age?: number;
  dob?: string;
  gender?: string;
  patientId?: string;   // For patients (patients.patient_id)
  doctorId?: string;    // For doctors (doctors.doc_id)
  bloodGroup?: string;  // For patients
  createdAt?: string;
}

// Create a complete user profile.
// The DB trigger `handle_new_user_role` auto-inserts the role-specific row
// (patients / doctors / admins) when a row is added to public.users.
// We only INSERT into public.users here, then UPDATE role-specific extras.
export const createUserProfile = async (uid: string, data: Omit<UserData, 'id'>) => {
  try {
    // Insert base profile — trigger fires and inserts the role sub-table row
    const { error: userError } = await supabase.from('users').insert([{
      id: uid,
      name: data.name,
      email: data.email,
      role: data.role,
      phone: data.phone ?? null,
      age: data.age ? Number(data.age) : null,
      dob: data.dob ?? null,
      gender: data.gender ?? null,
    }]);
    if (userError) throw userError;

    // Update role-specific extras that the trigger doesn't set
    if (data.role === 'DOCTOR') {
      await supabase.from('doctors')
        .update({
          speciality: data.specialty ?? 'General',
          department: data.department ?? null,
        })
        .eq('id', uid);
    }

    if (data.role === 'PATIENT' && data.bloodGroup) {
      await supabase.from('patients')
        .update({ blood_group: data.bloodGroup })
        .eq('id', uid);
    }

    return { id: uid, ...data };
  } catch (error) {
    console.error('Error creating user profile', error);
    throw error;
  }
};

// Fetch a user's profile by their UID (joins role-specific table)
export const getUserProfile = async (uid: string): Promise<UserData | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id, name, email, role, phone, age, dob, gender, created_at,
        patients ( patient_id, blood_group ),
        doctors ( doc_id, speciality, department )
      `)
      .eq('id', uid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const pat = (data as any).patients;
    const doc = (data as any).doctors;

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role as UserRole,
      phone: data.phone,
      age: data.age,
      dob: data.dob,
      gender: data.gender,
      patientId: pat?.patient_id,
      bloodGroup: pat?.blood_group,
      doctorId: doc?.doc_id,
      specialty: doc?.speciality,
      department: doc?.department,
      createdAt: data.created_at,
    } as UserData;
  } catch (error) {
    console.error('Error getting user profile', error);
    throw error;
  }
};

// Fetch all users by role (joins the corresponding sub-table)
export const getAllUsersByRole = async (role: UserRole): Promise<UserData[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id, name, email, role, phone, age, dob, gender, created_at,
        patients ( patient_id, blood_group ),
        doctors ( doc_id, speciality, department )
      `)
      .eq('role', role as string);

    if (error) throw error;

    return (data || []).map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as UserRole,
      phone: u.phone,
      age: u.age,
      dob: u.dob,
      gender: u.gender,
      patientId: u.patients?.patient_id,
      bloodGroup: u.patients?.blood_group,
      doctorId: u.doctors?.doc_id,
      specialty: u.doctors?.speciality,
      department: u.doctors?.department,
      createdAt: u.created_at,
    }));
  } catch (error) {
    console.error(`Error fetching users by role: ${role}`, error);
    throw error;
  }
};
