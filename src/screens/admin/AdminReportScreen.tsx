/**
 * AdminReportScreen (v1.0)
 *
 * Admin-facing screen for generating and downloading PDF reports.
 *
 * Features:
 * - Date range picker (start / end)
 * - Optional doctor filter (dropdown)
 * - Optional department/category filter (dropdown)
 * - Inline report preview (doctor summary cards + visit details)
 * - "Download PDF" button that generates and shares a PDF
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import {
  Card,
  Title,
  Text,
  Button,
  useTheme,
  ActivityIndicator,
  Divider,
  Menu,
} from 'react-native-paper';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  fetchAdminReport,
  ReportFilters,
  AdminReportData,
  DoctorSummary,
  VisitDetail,
} from '../../services/reportService';
import { generateReportPdf } from '../../services/pdfService';
import { fetchDoctorList, DoctorListItem } from '../../services/statsService';
import { getDoctorCategories, DoctorCategory } from '../../services/doctorService';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateForDB(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'COMPLETED': return '#2e7d32';
    case 'WAITING': return '#f57f17';
    case 'IN_PROGRESS': return '#1565c0';
    case 'CANCELLED': return '#c62828';
    default: return '#666';
  }
}

function getStatusBg(status: string): string {
  switch (status.toUpperCase()) {
    case 'COMPLETED': return '#c8e6c9';
    case 'WAITING': return '#fff9c4';
    case 'IN_PROGRESS': return '#e3f2fd';
    case 'CANCELLED': return '#ffcdd2';
    default: return '#f5f5f5';
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AdminReportScreen() {
  const theme = useTheme();

  // ── Filters ───────────────────────────────────────────────────────────────

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default: last 7 days
    d.setHours(0, 0, 0, 0);    // Normalize to midnight
    return d;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);    // Normalize to midnight
    return d;
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Keep refs up-to-date so DateTimePickerAndroid callbacks always see latest values
  const startDateRef = useRef(startDate);
  const endDateRef = useRef(endDate);
  useEffect(() => { startDateRef.current = startDate; }, [startDate]);
  useEffect(() => { endDateRef.current = endDate; }, [endDate]);

  // ── Android imperative picker openers ─────────────────────────────────────

  const openStartDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: startDateRef.current,
        mode: 'date',
        minimumDate: new Date(2000, 0, 1),
        maximumDate: endDateRef.current,
        onChange: (_event, selected) => {
          if (selected) {
            const d = new Date(selected);
            d.setHours(0, 0, 0, 0);
            setStartDate(d);
          }
        },
      });
    } else {
      setShowStartPicker(prev => !prev);
      setShowEndPicker(false);
    }
  };

  const openEndDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: endDateRef.current,
        mode: 'date',
        minimumDate: startDateRef.current,
        maximumDate: new Date(),
        onChange: (_event, selected) => {
          if (selected) {
            const d = new Date(selected);
            d.setHours(0, 0, 0, 0);
            setEndDate(d);
          }
        },
      });
    } else {
      setShowEndPicker(prev => !prev);
      setShowStartPicker(false);
    }
  };

  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(undefined);
  const [selectedDoctorName, setSelectedDoctorName] = useState('All Doctors');
  const [doctorMenuVisible, setDoctorMenuVisible] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedCategoryName, setSelectedCategoryName] = useState('All Departments');
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);

  // ── Data ───────────────────────────────────────────────────────────────────

  const [report, setReport] = useState<AdminReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [categories, setCategories] = useState<{ code: string; name: string }[]>([]);

  // ── Load filter options ────────────────────────────────────────────────────

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [docList, catList] = await Promise.all([
          fetchDoctorList(),
          getDoctorCategories(),
        ]);
        setDoctors(docList);
        setCategories(
          catList.map((c: DoctorCategory) => ({
            code: c.categoryCode,
            name: c.category,
          })),
        );
      } catch (err) {
        console.error('AdminReportScreen: loadFilters failed', err);
      }
    };
    loadFilters();
  }, []);

  // ── Generate Report ────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (startDate > endDate) {
      Alert.alert('Invalid Range', 'Start date must be before end date.');
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const filters: ReportFilters = {
        startDate: formatDateForDB(startDate),
        endDate: formatDateForDB(endDate),
        doctorId: selectedDoctorId,
        categoryCode: selectedCategory,
      };
      const data = await fetchAdminReport(filters);
      setReport(data);
    } catch (err: any) {
      console.error('AdminReportScreen: generate failed', err);
      Alert.alert('Error', err?.message ?? 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedDoctorId, selectedCategory]);

  // ── Download PDF ───────────────────────────────────────────────────────────

  const handleDownloadPdf = useCallback(async () => {
    if (!report) return;
    setDownloading(true);
    try {
      await generateReportPdf(report);
    } catch (err) {
      console.error('AdminReportScreen: PDF generation failed', err);
      Alert.alert('Error', 'Could not generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [report]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* ── Filter Card ─────────────────────────────────────────────────── */}
      <Card style={styles.filterCard}>
        <Card.Content>
          <Title style={styles.filterTitle}>
            <Icon name="filter-variant" size={18} /> Report Filters
          </Title>

          {/* Date Range */}
          <Text style={styles.filterLabel}>Date Range</Text>
          <View style={styles.dateRow}>
            <Button
              mode="outlined"
              onPress={openStartDatePicker}
              icon="calendar"
              style={styles.dateBtn}
              compact
            >
              {formatDateDisplay(startDate)}
            </Button>
            <Text style={styles.dateSep}>→</Text>
            <Button
              mode="outlined"
              onPress={openEndDatePicker}
              icon="calendar"
              style={styles.dateBtn}
              compact
            >
              {formatDateDisplay(endDate)}
            </Button>
          </View>

          {/* iOS-only inline pickers */}
          {Platform.OS === 'ios' && showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="spinner"
              minimumDate={new Date(2000, 0, 1)}
              maximumDate={endDate}
              onChange={(event, selected) => {
                setShowStartPicker(false);
                if (event.type === 'set' && selected) {
                  const d = new Date(selected);
                  d.setHours(0, 0, 0, 0);
                  setStartDate(d);
                }
              }}
            />
          )}
          {Platform.OS === 'ios' && showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display="spinner"
              minimumDate={startDate}
              maximumDate={new Date()}
              onChange={(event, selected) => {
                setShowEndPicker(false);
                if (event.type === 'set' && selected) {
                  const d = new Date(selected);
                  d.setHours(0, 0, 0, 0);
                  setEndDate(d);
                }
              }}
            />
          )}

          {/* Doctor Filter */}
          <Text style={styles.filterLabel}>Doctor</Text>
          <Menu
            visible={doctorMenuVisible}
            onDismiss={() => setDoctorMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setDoctorMenuVisible(true)}
                icon="doctor"
                style={styles.filterBtn}
                compact
                contentStyle={{ justifyContent: 'flex-start' }}
              >
                {selectedDoctorName}
              </Button>
            }
          >
            <Menu.Item
              title="All Doctors"
              onPress={() => {
                setSelectedDoctorId(undefined);
                setSelectedDoctorName('All Doctors');
                setDoctorMenuVisible(false);
              }}
            />
            {doctors.map((doc) => (
              <Menu.Item
                key={doc.id}
                title={`${doc.name} (${doc.specialty})`}
                onPress={() => {
                  setSelectedDoctorId(doc.id);
                  setSelectedDoctorName(doc.name);
                  setDoctorMenuVisible(false);
                }}
              />
            ))}
          </Menu>

          {/* Department Filter */}
          <Text style={styles.filterLabel}>Department</Text>
          <Menu
            visible={categoryMenuVisible}
            onDismiss={() => setCategoryMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setCategoryMenuVisible(true)}
                icon="office-building"
                style={styles.filterBtn}
                compact
                contentStyle={{ justifyContent: 'flex-start' }}
              >
                {selectedCategoryName}
              </Button>
            }
          >
            <Menu.Item
              title="All Departments"
              onPress={() => {
                setSelectedCategory(undefined);
                setSelectedCategoryName('All Departments');
                setCategoryMenuVisible(false);
              }}
            />
            {categories.map((cat) => (
              <Menu.Item
                key={cat.code}
                title={`${cat.name} (${cat.code})`}
                onPress={() => {
                  setSelectedCategory(cat.code);
                  setSelectedCategoryName(cat.name);
                  setCategoryMenuVisible(false);
                }}
              />
            ))}
          </Menu>

          <Divider style={styles.divider} />

          {/* Generate Button */}
          <Button
            mode="contained"
            onPress={handleGenerate}
            icon="magnify"
            loading={loading}
            disabled={loading}
            style={styles.generateBtn}
          >
            Generate Report
          </Button>
        </Card.Content>
      </Card>

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {loading && (
        <ActivityIndicator animating size="large" style={{ marginTop: 32 }} />
      )}

      {/* ── Report Results ──────────────────────────────────────────────── */}
      {report && !loading && (
        <View style={styles.resultsContainer}>
          {/* Doctor-Wise Summary */}
          <Text style={styles.sectionTitle}>
            <Icon name="chart-bar" size={16} color="#002a4d" /> Doctor-Wise Summary
          </Text>
          {report.summary.length > 0 ? (
            report.summary.map((doc: DoctorSummary) => (
              <Card key={doc.doctor_id} style={styles.summaryCard}>
                <Card.Content>
                  <View style={styles.summaryHeader}>
                    <Icon
                      name="stethoscope"
                      size={18}
                      color={theme.colors.primary}
                      style={{ marginRight: 8 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.summaryDocName}>
                        {doc.doctor_name}
                      </Text>
                      <Text style={styles.summarySpecialty}>
                        {doc.specialty} · {doc.category_code}
                      </Text>
                    </View>
                  </View>
                  <Divider style={{ marginVertical: 8 }} />
                  <View style={styles.statsRow}>
                    <StatBadge label="Total" value={doc.total_appointments} color="#002a4d" />
                    <StatBadge label="Seen" value={doc.completed} color="#2e7d32" />
                    <StatBadge label="Cancelled" value={doc.cancelled} color="#c62828" />
                    <StatBadge label="Patients" value={doc.unique_patients} color="#1565c0" />
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <Text style={styles.noData}>No doctor data for this range.</Text>
          )}

          {/* Visit Details */}
          <Text style={styles.sectionTitle}>
            <Icon name="format-list-bulleted" size={16} color="#002a4d" /> Patient Visit Details ({report.visits.length})
          </Text>
          {report.visits.length > 0 ? (
            report.visits.map((v: VisitDetail, idx: number) => (
              <Card key={v.appointment_id || idx} style={styles.visitCard}>
                <Card.Content>
                  <View style={styles.visitRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.visitToken}>{v.token_number}</Text>
                      <Text style={styles.visitPatient}>
                        {v.patient_name} · {v.patient_display_id}
                      </Text>
                      <Text style={styles.visitDoctor}>
                        Dr. {v.doctor_name ?? 'Unassigned'}
                      </Text>
                    </View>
                    <View style={styles.visitRight}>
                      <Text style={styles.visitDate}>{v.visit_date}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusBg(v.status) },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(v.status) },
                          ]}
                        >
                          {(v.status ?? '').replace('_', ' ')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <Text style={styles.noData}>No visit records for this range.</Text>
          )}

          {/* Download PDF */}
          <Button
            mode="contained"
            onPress={handleDownloadPdf}
            icon="download"
            loading={downloading}
            disabled={downloading}
            style={styles.downloadBtn}
            buttonColor="#ffffffff"
          >
            Download PDF
          </Button>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── StatBadge Helper ──────────────────────────────────────────────────────────

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.statBadge}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  filterCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  filterTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    color: '#002a4d',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginTop: 10,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBtn: {
    flex: 1,
  },
  dateSep: {
    marginHorizontal: 8,
    fontSize: 16,
    color: '#666',
  },
  filterBtn: {
    marginBottom: 4,
  },
  divider: {
    marginVertical: 16,
  },
  generateBtn: {
    paddingVertical: 4,
  },
  resultsContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#002a4d',
    marginBottom: 10,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#a2d2ff',
    paddingLeft: 8,
  },
  summaryCard: {
    marginBottom: 12,
    borderRadius: 10,
    elevation: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#03dac6',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryDocName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
  },
  summarySpecialty: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBadge: {
    alignItems: 'center',
    minWidth: 50,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  visitCard: {
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
  },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visitToken: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3949ab',
    fontFamily: 'monospace',
  },
  visitPatient: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212121',
    marginTop: 2,
  },
  visitDoctor: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  visitRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  visitDate: {
    fontSize: 11,
    color: '#888',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  noData: {
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 16,
  },
  downloadBtn: {
    marginTop: 20,
    paddingVertical: 6,
  },
});
