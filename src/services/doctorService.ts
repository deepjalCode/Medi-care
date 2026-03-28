/**
 * Doctor Service (v2.0)
 *
 * Provides functions to fetch doctor categories and doctors from
 * the database dynamically. No hardcoded category lists.
 */

import { supabase } from './supabaseSetup';

export interface DoctorCategory {
  category: string;
  categoryCode: string;
}

export interface DoctorOption {
  id: string;
  name: string;
  specialty: string;
  category: string;
  categoryCode: string;
  availability: boolean;
  docId: string;
  photoUrl?: string;
}

/**
 * Fetches unique doctor categories from the doctors table.
 * Returns distinct category + category_code pairs.
 */
export async function getDoctorCategories(): Promise<DoctorCategory[]> {
  const { data, error } = await supabase
    .from('doctors')
    .select('category, category_code');

  if (error) throw error;

  // Deduplicate by category_code
  const seen = new Set<string>();
  const categories: DoctorCategory[] = [];

  for (const d of data ?? []) {
    const code = (d.category_code ?? 'GN').trim();
    if (!seen.has(code)) {
      seen.add(code);
      categories.push({
        category: d.category ?? 'General Physician',
        categoryCode: code,
      });
    }
  }

  return categories;
}

/**
 * Fetches doctors with optional category filter.
 * Joins with users table for name.
 */
export async function getDoctorsByCategory(
  categoryCode?: string,
): Promise<DoctorOption[]> {
  let query = supabase
    .from('doctors')
    .select('id, doc_id, speciality, category, category_code, availability, photo_url, users ( name )');

  if (categoryCode) {
    query = query.eq('category_code', categoryCode);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    name: ((d.users as Record<string, unknown>)?.name as string) ?? 'Doctor',
    specialty: (d.speciality as string) ?? 'General Physician',
    category: (d.category as string) ?? 'General Physician',
    categoryCode: ((d.category_code as string) ?? 'GN').trim(),
    availability: (d.availability as boolean) ?? true,
    docId: (d.doc_id as string) ?? '',
    photoUrl: d.photo_url as string | undefined,
  }));
}

/**
 * Fetches all available doctors (availability = true).
 */
export async function getAvailableDoctors(): Promise<DoctorOption[]> {
  const { data, error } = await supabase
    .from('doctors')
    .select('id, doc_id, speciality, category, category_code, availability, photo_url, users ( name )')
    .eq('availability', true);

  if (error) throw error;

  return (data ?? []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    name: ((d.users as Record<string, unknown>)?.name as string) ?? 'Doctor',
    specialty: (d.speciality as string) ?? 'General Physician',
    category: (d.category as string) ?? 'General Physician',
    categoryCode: ((d.category_code as string) ?? 'GN').trim(),
    availability: true,
    docId: (d.doc_id as string) ?? '',
    photoUrl: d.photo_url as string | undefined,
  }));
}
