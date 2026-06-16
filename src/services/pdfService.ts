/**
 * PDF Service (v1.0)
 *
 * Generates PDF documents on-device from HTML templates.
 * Uses react-native-html-to-pdf for generation and
 * react-native-share for the native share sheet.
 *
 * Two generators:
 * - generatePrescriptionPdf: single prescription → PDF
 * - generateReportPdf: admin report data → PDF
 */

import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import { Alert, Platform } from 'react-native';
import { PrescriptionData, MedicationItem } from './prescriptionService';

// ─── Types (report) ────────────────────────────────────────────────────────────

export interface DoctorSummary {
  doctor_id: string;
  doctor_name: string;
  specialty: string;
  category: string;
  category_code: string;
  total_appointments: number;
  completed: number;
  cancelled: number;
  waiting: number;
  in_progress: number;
  unique_patients: number;
}

export interface VisitDetail {
  appointment_id: string;
  token_number: string;
  visit_date: string;
  status: string;
  reason_for_visit: string;
  category_code: string;
  patient_name: string;
  patient_display_id: string;
  doctor_name: string;
}

export interface AdminReportData {
  summary: DoctorSummary[];
  visits: VisitDetail[];
  generated_at: string;
  filters: {
    start_date: string;
    end_date: string;
    doctor_id: string | null;
    category_code: string | null;
  };
}

// ─── Shared Styles ─────────────────────────────────────────────────────────────

const BASE_STYLES = `
  <style>
    * { margin: 0; padding: 0; box- sizing: border-box; }
    body {
  font - family: 'Helvetica Neue', Helvetica, Arial, sans - serif;
  color: #212121;
  padding: 24px;
  font - size: 12px;
  line - height: 1.5;
}
    .header {
  text - align: center;
  border - bottom: 2px solid #a2d2ff;
  padding - bottom: 12px;
  margin - bottom: 20px;
}
    .header h1 {
  font - size: 22px;
  color: #002a4d;
  margin - bottom: 4px;
}
    .header p {
  color: #666;
  font - size: 11px;
}
    .section - title {
  font - size: 14px;
  font - weight: bold;
  color: #002a4d;
  margin - top: 20px;
  margin - bottom: 8px;
  border - left: 4px solid #a2d2ff;
  padding - left: 8px;
}
    table {
  width: 100 %;
  border - collapse: collapse;
  margin - bottom: 16px;
}
th, td {
  border: 1px solid #e0e0e0;
  padding: 6px 8px;
  text - align: left;
  font - size: 11px;
}
    th {
  background - color: #f5f9ff;
  font - weight: 600;
  color: #002a4d;
}
tr: nth - child(even) { background - color: #fafafa; }
    .info - row {
  display: flex;
  justify - content: space - between;
  margin - bottom: 6px;
}
    .info - label { color: #666; font - weight: 600; }
    .info - value { color: #212121; }
    .badge {
  display: inline - block;
  padding: 2px 8px;
  border - radius: 12px;
  font - size: 10px;
  font - weight: 600;
}
    .badge - completed { background: #c8e6c9; color: #2e7d32; }
    .badge - waiting { background: #fff9c4; color: #f57f17; }
    .badge -in -progress { background: #e3f2fd; color: #1565c0; }
    .badge - cancelled { background: #ffcdd2; color: #c62828; }
    .footer {
  margin - top: 24px;
  text - align: center;
  font - size: 10px;
  color: #9e9e9e;
  border - top: 1px solid #e0e0e0;
  padding - top: 8px;
}
    .med - list { margin - left: 16px; margin - bottom: 8px; }
    .med - item { margin - bottom: 4px; }
    .med - name { font - weight: 600; }
    .med - details { color: #666; font - size: 11px; }
    .diagnosis - box {
  background: #fff3e0;
  border - radius: 6px;
  padding: 8px 12px;
  margin - bottom: 12px;
}
    .notes - box {
  background: #ede7f6;
  border - radius: 6px;
  padding: 8px 12px;
  margin - bottom: 12px;
  font - style: italic;
  color: #4527a0;
}
</style>
  `;

// ─── Prescription PDF ──────────────────────────────────────────────────────────

/**
 * Generates a PDF for a single prescription and opens the share sheet.
 * Returns the file path of the generated PDF.
 */
export async function generatePrescriptionPdf(
  rx: PrescriptionData,
): Promise<string> {
  const medsHtml = rx.medications
    .map(
      (med: MedicationItem, idx: number) => `
  < div class="med-item" >
    <span class="med-name" > ${idx + 1}. ${escapeHtml(med.name)} </span><br/ >
      <span class="med-details" > ${escapeHtml(med.dosage)} · ${escapeHtml(med.frequency)} · ${escapeHtml(med.duration)} </span>
        </div>
          `,
    )
    .join('');

  const dateStr = rx.createdAt
    ? new Date(rx.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    : 'N/A';

  const html = `
        < html >
        <head>${BASE_STYLES} </head>
          < body >
          <div class="header" >
            <h1>🏥 Medi Care </h1>
              < p > Prescription </p>
              </div>

              < div class="info-row" >
                <span><span class="info-label" > Doctor: </span> <span class="info-value">${escapeHtml(rx.doctorName ?? 'Doctor')}</span > </span>
                  < span > <span class="info-label" > Date: </span> <span class="info-value">${dateStr}</span > </span>
                    </div>

      ${rx.diagnosis ? `
        <div class="section-title">Diagnosis</div>
        <div class="diagnosis-box">${escapeHtml(rx.diagnosis)}</div>
      ` : ''
    }

<div class="section-title" > Medications </div>
  < div class="med-list" >
    ${medsHtml || '<p style="color:#888;">No medications listed.</p>'}
</div>

      ${rx.doctorNotes ? `
        <div class="section-title">Doctor's Notes</div>
        <div class="notes-box">${escapeHtml(rx.doctorNotes)}</div>
      ` : ''
    }

<div class="footer" >
  Generated by Medi Care App · ${new Date().toLocaleString('en-IN')}
</div>
  </body>
  </html>
    `;

  const options: any = {
    html,
    fileName: `prescription_${(rx.id ?? '').trim()}`,
  };
  if (Platform.OS === 'ios') {
    options.directory = 'Documents';
  }

  const file = await generatePDF(options);
  const filePath = file.filePath ?? '';

  if (filePath) {
    console.log('Prescription PDF generated at:', filePath);
    try {
      await Share.open({
        url: `file://${filePath}`,
        type: 'application/pdf',
        title: 'Prescription PDF',
      });
    } catch (err: any) {
      console.warn('Share.open failed for prescription:', err);
      if (err && err.message && !err.message.includes('User cancelled') && !err.message.includes('dismissed')) {
        Alert.alert('Share Error', err.message || String(err));
      }
    }
  }

  return filePath;
}

// ─── Admin Report PDF ──────────────────────────────────────────────────────────

/**
 * Generates a PDF for an admin report and opens the share sheet.
 * Returns the file path of the generated PDF.
 */
export async function generateReportPdf(
  data: AdminReportData,
): Promise<string> {
  const { summary, visits, filters, generated_at } = data;

  // Summary table rows
  const summaryRows = summary
    .map(
      (doc) => `
      <tr>
        <td>${escapeHtml(doc.doctor_name)}</td>
        <td>${escapeHtml(doc.specialty)}</td>
        <td>${escapeHtml(doc.category_code)}</td>
        <td style="text-align:center">${doc.total_appointments}</td>
        <td style="text-align:center">${doc.completed}</td>
        <td style="text-align:center">${doc.cancelled}</td>
        <td style="text-align:center">${doc.unique_patients}</td>
      </tr>
    `,
    )
    .join('');

  // Totals
  const totalAppts = summary.reduce((s, d) => s + d.total_appointments, 0);
  const totalCompleted = summary.reduce((s, d) => s + d.completed, 0);
  const totalCancelled = summary.reduce((s, d) => s + d.cancelled, 0);
  const totalUnique = summary.reduce((s, d) => s + d.unique_patients, 0);

  // Visit detail rows
  const visitRows = visits
    .map(
      (v) => `
      <tr>
        <td>${escapeHtml(v.token_number ?? '')}</td>
        <td>${escapeHtml(v.patient_name)}</td>
        <td>${escapeHtml(v.patient_display_id)}</td>
        <td>${escapeHtml(v.doctor_name ?? 'Unassigned')}</td>
        <td>${v.visit_date ?? ''}</td>
        <td><span class="badge badge-${(v.status ?? '').toLowerCase().replace('_', '-')}">${(v.status ?? '').replace('_', ' ')}</span></td>
      </tr>
    `,
    )
    .join('');

  const filterDesc = [
    `${filters.start_date ?? '?'} to ${filters.end_date ?? '?'}`,
    filters.doctor_id ? `Doctor filtered` : null,
    filters.category_code ? `Dept: ${filters.category_code}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const html = `
    <html>
    <head>${BASE_STYLES}</head>
    <body>
      <div class="header">
        <h1>🏥 Medi Care — Admin Report</h1>
        <p>${filterDesc}</p>
      </div>

      <div class="section-title">Doctor-Wise Summary</div>
      ${summary.length > 0
      ? `
        <table>
          <thead>
            <tr>
              <th>Doctor</th>
              <th>Specialty</th>
              <th>Dept</th>
              <th>Total</th>
              <th>Seen</th>
              <th>Cancelled</th>
              <th>Unique Patients</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRows}
            <tr style="font-weight:bold; background:#e3f2fd;">
              <td colspan="3">TOTAL</td>
              <td style="text-align:center">${totalAppts}</td>
              <td style="text-align:center">${totalCompleted}</td>
              <td style="text-align:center">${totalCancelled}</td>
              <td style="text-align:center">${totalUnique}</td>
            </tr>
          </tbody>
        </table>
      `
      : '<p style="color:#888;">No doctor data available for this range.</p>'
    }

      <div class="section-title">Patient Visit Details (${visits.length} records)</div>
      ${visits.length > 0
      ? `
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Patient</th>
              <th>Patient ID</th>
              <th>Doctor</th>
              <th>Visit Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${visitRows}
          </tbody>
        </table>
      `
      : '<p style="color:#888;">No visit records found for this range.</p>'
    }

      <div class="footer">
        Report generated at ${generated_at ? new Date(generated_at).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')} · Medi Care App
      </div>
    </body>
    </html>
  `;

  const options: any = {
    html,
    fileName: `admin_report_${Date.now()}`,
  };
  if (Platform.OS === 'ios') {
    options.directory = 'Documents';
  }

  const file = await generatePDF(options);
  const filePath = file.filePath ?? '';

  if (filePath) {
    console.log('Report PDF generated at:', filePath);
    try {
      await Share.open({
        url: `file://${filePath}`,
        type: 'application/pdf',
        title: 'Admin Report PDF',
      });
    } catch (err: any) {
      console.warn('Share.open failed for report:', err);
      if (err && err.message && !err.message.includes('User cancelled') && !err.message.includes('dismissed')) {
        Alert.alert('Share Error', err.message || String(err));
      }
    }
  }

  return filePath;
}

// ─── Helper ────────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
