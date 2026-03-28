/**
 * Seed Script — 5 Doctors (1 per category) (v2.0)
 *
 * Changes:
 * - Removed email — uses synthetic email for auth
 * - Added category, category_code, availability
 * - Uses sequential IDs via RPC (generate_doctor_id)
 * - Idempotency: checks by doc_id pattern instead of email
 *
 * Usage:
 *   npx ts-node src/scripts/seedDoctors.ts
 *   OR call `seedDoctors()` from the Admin Dashboard.
 */

import { secondarySupabase } from '../services/supabaseSetup';
import { supabase } from '../services/supabaseSetup';
import { createUserProfile } from '../services/userService';

// ─── Seed Data ─────────────────────────────────────────────────────────────────

interface SeedDoctor {
  name: string;
  password: string;
  phone: string;
  specialty: string;
  category: string;
  categoryCode: string;
}

const SEED_DOCTORS: SeedDoctor[] = [
  {
    name: 'Aryan Mehta',
    password: 'Doctor@1234',
    phone: '9876543001',
    specialty: 'General Physician',
    category: 'General Physician',
    categoryCode: 'GN',
  },
  {
    name: 'Kavita Rao',
    password: 'Doctor@1234',
    phone: '9876543002',
    specialty: 'ENT',
    category: 'ENT',
    categoryCode: 'EN',
  },
  {
    name: 'Anjali Bose',
    password: 'Doctor@1234',
    phone: '9876543003',
    specialty: 'Pediatrics',
    category: 'Pediatrics',
    categoryCode: 'PE',
  },
  {
    name: 'Harish Reddy',
    password: 'Doctor@1234',
    phone: '9876543004',
    specialty: 'Orthopedics',
    category: 'Orthopedics',
    categoryCode: 'OR',
  },
  {
    name: 'Nisha Agarwal',
    password: 'Doctor@1234',
    phone: '9876543005',
    specialty: 'Dermatology',
    category: 'Dermatology',
    categoryCode: 'DE',
  },
];

// ─── Main Function ─────────────────────────────────────────────────────────────

export async function seedDoctors(): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const doc of SEED_DOCTORS) {
    try {
      // Generate sequential doctor ID via RPC
      const { data: docId, error: idError } = await supabase.rpc('generate_doctor_id');
      if (idError) throw idError;
      if (!docId) throw new Error('Failed to generate doctor ID');

      // Construct synthetic email (never displayed to users)
      const syntheticEmail = `${docId.toLowerCase()}@opd.internal`;

      // Idempotency check: see if a user with this synthetic email already exists
      const { data: existing } = await secondarySupabase
        .from('users')
        .select('id')
        .eq('email', syntheticEmail)
        .maybeSingle();

      if (existing) {
        console.log(`⏭ Skipped (already exists): Dr. ${doc.name} — ${docId}`);
        skipped++;
        continue;
      }

      // Create auth account with synthetic email
      const { data: authData, error: authError } = await secondarySupabase.auth.signUp({
        email: syntheticEmail,
        password: doc.password,
        options: { data: { displayName: doc.name } },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error(`Auth signup returned no user for ${docId}`);

      // Create profile (trigger will handle doctors sub-table row)
      await createUserProfile(authData.user.id, {
        name: doc.name,
        role: 'DOCTOR',
        roleId: docId,
        phone: doc.phone,
        specialty: doc.specialty,
        doctorId: docId,
        category: doc.category,
        categoryCode: doc.categoryCode,
      });

      // Sign out the secondary client
      await secondarySupabase.auth.signOut();

      console.log(`✅ Created: Dr. ${doc.name} — ${docId} — ${doc.specialty} (${doc.categoryCode})`);
      created++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ Failed to seed Dr. ${doc.name}:`, message);
    }
  }

  console.log(`\nSeed complete: ${created} created, ${skipped} skipped.`);
  return { created, skipped };
}
