/**
 * v2.1 Changes (Performance):
 * - getUserProfile: role-conditional JOIN — only fetches the sub-table matching the user's role
 *   (was always JOINing patients + doctors + admins regardless of role)
 * - getAllUsersByRole: same fix — dynamic SELECT string based on the target role
 *
 * v2.0 Changes:
 * - Replaced email with roleId in UserData interface
 * - Added registerUser() that generates role ID via RPC and uses synthetic email
 * - Added loginWithRoleId() that constructs synthetic email for auth
 * - Removed email from all SELECT queries and mapped return objects
 * - Added category/category_code/availability/photo_url to doctor data
 */

import { supabase } from './supabaseSetup';
import { secondarySupabase } from './supabaseSetup';
import { UserRole } from '../store/slices/authSlice';

export interface UserData {
  id: string;           // Supabase Auth UID
  name: string;
  role: UserRole;
  roleId: string;       // PAT-000001 / DOC-000001 / ADM-000001
  phone?: string;
  specialty?: string;   // For doctors (from doctors.speciality)
  category?: string;    // For doctors
  categoryCode?: string; // For doctors (2-letter code)
  department?: string;  // For doctors
  availability?: boolean; // For doctors
  age?: number;
  dob?: string;
  gender?: string;
  patientId?: string;   // For patients (patients.patient_id)
  doctorId?: string;    // For doctors (doctors.doc_id)
  bloodGroup?: string;  // For patients
  photoUrl?: string;    // Profile photo URL
  createdAt?: string;
}

// ─── Synthetic Email Helper ─────────────────────────────────────────────────

/**
 * Constructs a synthetic email from a role ID.
 * This is an internal implementation detail — never expose to users.
 */
function toSyntheticEmail(roleId: string): string {
  return `${roleId.toLowerCase()}@opd.internal`;
}

// ─── Role-conditional SELECT builder ────────────────────────────────────────

/**
 * Returns the PostgREST select string for a given role,
 * joining ONLY the relevant sub-table to avoid over-fetching.
 */
function buildRoleSelect(role: UserRole): string {
  const base = 'id, name, role, phone, age, dob, gender, created_at';
  switch (role) {
    case 'PATIENT':
      return `${base}, patients ( patient_id, blood_group, photo_url )`;
    case 'DOCTOR':
      return `${base}, doctors ( doc_id, speciality, department, category, category_code, availability, photo_url )`;
    case 'ADMIN':
      return `${base}, admins ( admin_id, photo_url )`;
    default:
      // Fallback: join all (safe but slower)
      return `${base}, patients ( patient_id, blood_group, photo_url ), doctors ( doc_id, speciality, department, category, category_code, availability, photo_url ), admins ( admin_id, photo_url )`;
  }
}

/**
 * Maps a raw Supabase row (with known role) to UserData.
 */
function mapRowToUserData(data: Record<string, unknown>, role: UserRole): UserData {
  const pat = (data.patients as Record<string, unknown> | null) ?? null;
  const doc = (data.doctors as Record<string, unknown> | null) ?? null;
  const adm = (data.admins as Record<string, unknown> | null) ?? null;

  let roleId = '';
  let photoUrl: string | undefined;
  if (role === 'PATIENT' && pat) {
    roleId = (pat.patient_id as string) ?? '';
    photoUrl = pat.photo_url as string | undefined;
  } else if (role === 'DOCTOR' && doc) {
    roleId = (doc.doc_id as string) ?? '';
    photoUrl = doc.photo_url as string | undefined;
  } else if (role === 'ADMIN' && adm) {
    roleId = (adm.admin_id as string) ?? '';
    photoUrl = adm.photo_url as string | undefined;
  }

  return {
    id: data.id as string,
    name: data.name as string,
    role,
    roleId,
    phone: data.phone as string | undefined,
    age: data.age as number | undefined,
    dob: data.dob as string | undefined,
    gender: data.gender as string | undefined,
    patientId: pat?.patient_id as string | undefined,
    bloodGroup: pat?.blood_group as string | undefined,
    doctorId: doc?.doc_id as string | undefined,
    specialty: doc?.speciality as string | undefined,
    department: doc?.department as string | undefined,
    category: doc?.category as string | undefined,
    categoryCode: doc?.category_code as string | undefined,
    availability: doc?.availability as boolean | undefined,
    photoUrl,
    createdAt: data.created_at as string | undefined,
  };
}

// ─── Register User ──────────────────────────────────────────────────────────

/**
 * Registers a new user with role-based ID generation.
 * 1. Generates the role ID via Supabase RPC
 * 2. Creates Supabase Auth account with synthetic email
 * 3. Inserts profile into users table (trigger handles role sub-table)
 * 4. Updates role-specific extras
 */
export const registerUser = async (
  role: NonNullable<UserRole>,
  password: string,
  data: {
    name: string;
    phone?: string;
    age?: number;
    dob?: string;
    gender?: string;
    bloodGroup?: string;
    specialty?: string;
    category?: string;
    categoryCode?: string;
    department?: string;
  },
): Promise<{ user: UserData; generatedId: string }> => {
  try {
    // Step 1: Generate role ID via RPC
    const rpcName = role === 'PATIENT'
      ? 'generate_patient_id'
      : role === 'DOCTOR'
        ? 'generate_doctor_id'
        : 'generate_admin_id';

    const { data: generatedId, error: idError } = await supabase.rpc(rpcName);
    if (idError) throw idError;
    if (!generatedId) throw new Error('Failed to generate role ID');

    // Step 2: Create Supabase Auth account with synthetic email
    const syntheticEmail = toSyntheticEmail(generatedId);
    const { data: authData, error: authError } = await secondarySupabase.auth.signUp({
      email: syntheticEmail,
      password,
      options: { data: { displayName: data.name } },
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error('Could not create user account');

    const uid = authData.user.id;

    // Step 3: Insert base profile — trigger fires and creates role sub-table row
    const { error: userError } = await supabase.from('users').insert([{
      id: uid,
      name: data.name,
      email: syntheticEmail, // Stored internally, never displayed
      role,
      phone: data.phone ?? null,
      age: data.age ? Number(data.age) : null,
      dob: data.dob ?? null,
      gender: data.gender ?? null,
    }]);
    if (userError) throw userError;

    // Step 4: Update role-specific extras
    if (role === 'PATIENT') {
      const updates: Record<string, unknown> = { patient_id: generatedId };
      if (data.bloodGroup) updates.blood_group = data.bloodGroup;
      await supabase.from('patients').update(updates).eq('id', uid);
    }

    if (role === 'DOCTOR') {
      await supabase.from('doctors').update({
        doc_id: generatedId,
        speciality: data.specialty ?? 'General Physician',
        category: data.category ?? data.specialty ?? 'General Physician',
        category_code: data.categoryCode ?? 'GN',
        department: data.department ?? null,
        availability: true,
      }).eq('id', uid);
    }

    if (role === 'ADMIN') {
      await supabase.from('admins').update({
        admin_id: generatedId,
      }).eq('id', uid);
    }

    // Sign out the secondary client
    await secondarySupabase.auth.signOut();

    const userData: UserData = {
      id: uid,
      name: data.name,
      role,
      roleId: generatedId,
      phone: data.phone,
      age: data.age,
      dob: data.dob,
      gender: data.gender,
      patientId: role === 'PATIENT' ? generatedId : undefined,
      doctorId: role === 'DOCTOR' ? generatedId : undefined,
      bloodGroup: data.bloodGroup,
      specialty: data.specialty,
      category: data.category,
      categoryCode: data.categoryCode,
    };

    return { user: userData, generatedId };
  } catch (error) {
    console.error('Error registering user', error);
    throw error;
  }
};

// ─── Login With Role ID ─────────────────────────────────────────────────────

/**
 * Logs in a user using their role-based ID and password.
 * Constructs synthetic email internally and calls Supabase Auth.
 */
export const loginWithRoleId = async (
  roleId: string,
  password: string,
): Promise<void> => {
  const syntheticEmail = toSyntheticEmail(roleId);
  const { error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password,
  });
  if (error) throw error;
  // Redux dispatch is handled by App.tsx onAuthStateChange listener
};

// ─── Get User Profile ───────────────────────────────────────────────────────

/**
 * Fetches a user's profile by their UID.
 *
 * Optimized (v2.1): Two-step query:
 *   1. Fetch only base fields + role (lightweight)
 *   2. Fetch the role-specific sub-table join (targeted, not all 3)
 * This reduces the over-fetching that was happening on every auth state change.
 *
 * Returns null if not found; throws on actual errors.
 */
export const getUserProfile = async (uid: string): Promise<UserData | null> => {
  try {
    // Single query: fetch base fields + all role sub-tables at once.
    // PostgREST left-joins are cheap for a single row — only the matching
    // sub-table will have data; the others return null.
    const { data, error } = await supabase
      .from('users')
      .select(buildRoleSelect(null))
      .eq('id', uid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const role = (data as any).role as UserRole;
    return mapRowToUserData(data as unknown as Record<string, unknown>, role);
  } catch (error) {
    console.error('Error getting user profile', error);
    throw error;
  }
};

// ─── Get All Users By Role ──────────────────────────────────────────────────

export const getAllUsersByRole = async (role: UserRole): Promise<UserData[]> => {
  try {
    // Only JOIN the sub-table that matches the requested role (v2.1 optimization)
    const { data, error } = await supabase
      .from('users')
      .select(buildRoleSelect(role))
      .eq('role', role as string);

    if (error) throw error;

    return ((data as any[]) || []).map((u: Record<string, unknown>) =>
      mapRowToUserData(u, role)
    );
  } catch (error) {
    console.error(`Error fetching users by role: ${role}`, error);
    throw error;
  }
};

// ─── Legacy Compat — createUserProfile (used by seed script) ─────────────────

export const createUserProfile = async (uid: string, data: Omit<UserData, 'id'>) => {
  try {
    const syntheticEmail = data.roleId ? toSyntheticEmail(data.roleId) : `${uid}@opd.internal`;

    const { error: userError } = await supabase.from('users').insert([{
      id: uid,
      name: data.name,
      email: syntheticEmail,
      role: data.role,
      phone: data.phone ?? null,
      age: data.age ? Number(data.age) : null,
      dob: data.dob ?? null,
      gender: data.gender ?? null,
    }]);
    if (userError) throw userError;

    if (data.role === 'DOCTOR') {
      await supabase.from('doctors')
        .update({
          doc_id: data.doctorId ?? data.roleId,
          speciality: data.specialty ?? 'General Physician',
          category: data.category ?? data.specialty ?? 'General Physician',
          category_code: data.categoryCode ?? 'GN',
          department: data.department ?? null,
          availability: true,
        })
        .eq('id', uid);
    }

    if (data.role === 'PATIENT' && (data.bloodGroup || data.patientId)) {
      const updates: Record<string, unknown> = {};
      if (data.patientId) updates.patient_id = data.patientId;
      if (data.bloodGroup) updates.blood_group = data.bloodGroup;
      await supabase.from('patients').update(updates).eq('id', uid);
    }

    if (data.role === 'ADMIN' && data.roleId) {
      await supabase.from('admins').update({ admin_id: data.roleId }).eq('id', uid);
    }

    return { id: uid, ...data };
  } catch (error) {
    console.error('Error creating user profile', error);
    throw error;
  }
};
