/**
 * Report Service (v1.0)
 *
 * Provides data fetching for the admin reporting module.
 * Calls the get_admin_report Supabase RPC and returns typed data.
 */

import { supabase } from './supabaseSetup';
import { AdminReportData, DoctorSummary, VisitDetail } from './pdfService';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ReportFilters {
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  doctorId?: string;   // UUID, optional
  categoryCode?: string; // 2-char, optional
}

// Re-export for convenience
export type { AdminReportData, DoctorSummary, VisitDetail };

// ─── Fetch Admin Report ────────────────────────────────────────────────────────

/**
 * Calls the get_admin_report RPC with the specified filters.
 * Returns structured report data for rendering and PDF generation.
 */
export async function fetchAdminReport(
  filters: ReportFilters,
): Promise<AdminReportData> {
  const { data, error } = await supabase.rpc('get_admin_report', {
    p_start_date: filters.startDate,
    p_end_date: filters.endDate,
    p_doctor_id: filters.doctorId || null,
    p_category: filters.categoryCode || null,
  });

  if (error) {
    console.error('ReportService: fetchAdminReport RPC failed', error);
    throw error;
  }

  // The RPC returns a JSON object directly
  const report = data as AdminReportData | null;

  return {
    summary: report?.summary ?? [],
    visits: report?.visits ?? [],
    generated_at: report?.generated_at ?? new Date().toISOString(),
    filters: report?.filters ?? {
      start_date: filters.startDate,
      end_date: filters.endDate,
      doctor_id: filters.doctorId ?? null,
      category_code: filters.categoryCode ?? null,
    },
  };
}
