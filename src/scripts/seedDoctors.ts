/**
 * Seed Script — 5 Doctors (1 per category)
 *
 * This script is idempotent: it checks for existing accounts before creating.
 * Run this from a Node.js environment or embed it in an admin-triggered function.
 *
 * Usage:
 *   npx ts-node src/scripts/seedDoctors.ts
 *   OR call `seedDoctors()` from the Admin Dashboard.
 */

import { secondarySupabase } from '../services/supabaseSetup';
import { createUserProfile } from '../services/userService';

// ─── Seed Data ─────────────────────────────────────────────────────────────────

interface SeedDoctor {
  name: string;
  email: string;
  password: string;
  phone: string;
  specialty: string;
}

const SEED_DOCTORS: SeedDoctor[] = [
  {
    name: 'Aryan Mehta',
    email: 'aryan.mehta@medicare.com',
    password: 'Doctor@123',
    phone: '9876543001',
    specialty: 'General Physician',
  },
  {
    name: 'Kavita Rao',
    email: 'kavita.rao@medicare.com',
    password: 'Doctor@123',
    phone: '9876543002',
    specialty: 'ENT',
  },
  {
    name: 'Anjali Bose',
    email: 'anjali.bose@medicare.com',
    password: 'Doctor@123',
    phone: '9876543003',
    specialty: 'Pediatrics',
  },
  {
    name: 'Harish Reddy',
    email: 'harish.reddy@medicare.com',
    password: 'Doctor@123',
    phone: '9876543004',
    specialty: 'Orthopedics',
  },
  {
    name: 'Nisha Agarwal',
    email: 'nisha.agarwal@medicare.com',
    password: 'Doctor@123',
    phone: '9876543005',
    specialty: 'Dermatology',
  },
];

// ─── Main Function ─────────────────────────────────────────────────────────────

export async function seedDoctors(): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const doc of SEED_DOCTORS) {
    try {
      // Idempotency check: see if a user with this email already exists
      const { data: existing } = await secondarySupabase
        .from('users')
        .select('id')
        .eq('email', doc.email)
        .maybeSingle();

      if (existing) {
        console.log(`⏭ Skipped (already exists): Dr. ${doc.name} — ${doc.email}`);
        skipped++;
        continue;
      }

      // Create auth account
      const { data: authData, error: authError } = await secondarySupabase.auth.signUp({
        email: doc.email,
        password: doc.password,
        options: { data: { displayName: doc.name } },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error(`Auth signup returned no user for ${doc.email}`);

      const docId = `DOC-${Math.floor(100000 + Math.random() * 900000)}`;

      // Create profile (trigger will handle doctors sub-table row)
      await createUserProfile(authData.user.id, {
        name: doc.name,
        email: doc.email,
        role: 'DOCTOR',
        phone: doc.phone,
        specialty: doc.specialty,
        doctorId: docId,
      });

      // Sign out the secondary client
      await secondarySupabase.auth.signOut();

      console.log(`✅ Created: Dr. ${doc.name} — ${doc.email} — ${docId}`);
      created++;
    } catch (err: any) {
      console.error(`❌ Failed to seed Dr. ${doc.name}:`, err.message || err);
    }
  }

  console.log(`\nSeed complete: ${created} created, ${skipped} skipped.`);
  return { created, skipped };
}


