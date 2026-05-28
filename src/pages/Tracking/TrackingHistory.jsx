/**
 * TrackingHistory.jsx - Historical Recruitment Tracking Page
 *
 * Displays historical recruitment data with charts, screening summary,
 * recruitment details, and patient-level drill-down using FHIR mock data.
 *
 * Cloned from MonthlyReport.jsx with simplified data flow:
 * - Uses only fhirService functions for data loading
 * - Local ward/group filters derived from actual patient data
 * - No backend API fallbacks (getStudyTracking, getPeriodTotalScreening, etc.)
 *
 * DATA FLOW:
 * ==========
 * 1. getProcessedStudies() → study list for dropdown
 * 2. getProcessedRecruitmentDetail(filters) → patient-level data from mock tracking files
 * 3. generateRecruitmentDetails(patients, study, options) → chart & recruitment table data
 * 4. calculateMonthlyStats(patients) → monthly aggregate statistics
 * 5. Screening summary: computed locally from filteredPatients (by group, site, ward)
 *
 * MOCK DATA SOURCE:
 * =================
 * - src/mockData/tracking/13NV.json (study only)
 * - src/mockData/tracking/13NV-003.json (study + site)
 * - src/mockData/tracking/13NV-003-4.json (study + site + ward)
 * - src/mockData/tracking/13NV-003-4 CAP.json (study + site + ward + condition)
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { useSelector, useDispatch } from 'react-redux';
import ReactECharts from 'echarts-for-react';

// Layout components
import Footer from '../../components/toolbars/Footer';

// Shared filter components (SiteSelection works correctly with alias matching)
import { SiteSelection } from '../../components/filters';

// Existing reusable components from MonthlyReport
import RecruitmentTable from '../../components/tables/TrackingMonthlyPage/RecruitmentTable';

// Redux state management
import {
  setStudy,
  selectCurrentStudy,
  selectCurrentSite,
} from '../../store/studySlice';

// FHIR service functions for data loading and processing
import {
  getProcessedStudies,
  getProcessedScreeningDetail,
  calculateMonthlyStats,
  generateRecruitmentDetails,
} from '../../services/fhirService';


const TrackingHistory = () => {
  const dispatch = useDispatch();

  // Redux state (only site is used for data loading)
  // eslint-disable-next-line no-unused-vars -- selectCurrentStudy needed for SiteSelection component dependency
  const currentStudy = useSelector(selectCurrentStudy);
  const currentSite = useSelector(selectCurrentSite);

  // Study list and selection
  const [studies, setStudies] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState(() => {
    return localStorage.getItem('selectedStudyCode') || '';
  });

  // Time period and date selection
  const [selectedTimepoint, setSelectedTimepoint] = useState('weekly');
  const [endDate, setEndDate] = useState(new Date());

  // Local ward and group filters (derived from patient data, not organization resources)
  const [localWardFilter, setLocalWardFilter] = useState('');
  const [localGroupFilter, setLocalGroupFilter] = useState('');

  // Loading state (used for initial page load spinner)
  const [loading] = useState(false);

  // Participant data from mock tracking files
  const [patientData, setPatientData] = useState({
    patients: [],
    monthlyStats: [],
    loading: false,
  });

  // Generated recruitment/screening data for charts and tables
  const [recruitmentData, setRecruitmentData] = useState({
    studyData: [],          // For RecruitmentTable and charts
    screeningData: [],      // For screening summary
  });

  // Derive unique wards and groups from patient data for local filters
  const availableWards = useMemo(() => {
    const wards = new Set();
    patientData.patients.forEach(p => {
      if (p.ward) wards.add(p.ward);
    });
    return Array.from(wards).sort();
  }, [patientData.patients]);

  const availableGroups = useMemo(() => {
    const groups = new Set();
    patientData.patients.forEach(p => {
      if (p.condition) groups.add(p.condition);
      if (p.groups) p.groups.forEach(g => groups.add(g));
    });
    return Array.from(groups).sort();
  }, [patientData.patients]);

  // Filter patients client-side based on local ward/group selections
  const filteredPatients = useMemo(() => {
    let filtered = patientData.patients;
    if (localWardFilter) {
      filtered = filtered.filter(p => p.ward === localWardFilter);
    }
    if (localGroupFilter) {
      filtered = filtered.filter(p =>
        p.condition === localGroupFilter ||
        (p.groups && p.groups.includes(localGroupFilter))
      );
    }
    return filtered;
  }, [patientData.patients, localWardFilter, localGroupFilter]);

  /**
   * Load studies list for the dropdown
   */
  const loadStudies = useCallback(async () => {
    try {
      const studyList = await getProcessedStudies();
      setStudies(studyList);
    } catch (error) {
      console.error('[TrackingHistory] Error loading studies:', error);
    }
  }, []);

  /**
   * Fetch patient-level data from mock tracking files
   * Uses getProcessedRecruitmentDetail which auto-selects mock file based on filters
   */
  const fetchPatientData = useCallback(async () => {
    if (!selectedStudy) {
      setPatientData({ patients: [], monthlyStats: [], loading: false });
      setRecruitmentData({ studyData: [], screeningData: [] });
      return;
    }

    try {
      setPatientData(prev => ({ ...prev, loading: true }));

      const filters = {
        studyCode: selectedStudy,
        siteCode: currentSite?.code,
        wardCode: null,
        condition: null,
      };

      const patients = await getProcessedScreeningDetail(filters);
      const monthlyStats = calculateMonthlyStats(patients);

      setPatientData({ patients, monthlyStats, loading: false });

      // Reset local filters when data source changes
      setLocalWardFilter('');
      setLocalGroupFilter('');

    } catch (error) {
      console.error('[TrackingHistory] Error fetching patient data:', error);
      setPatientData({ patients: [], monthlyStats: [], loading: false });
    }
  }, [selectedStudy, currentSite]);

  /**
   * Generate chart/table data from filtered patients
   * Re-runs when patients, timepoint, or endDate changes
   */
  useEffect(() => {
    if (filteredPatients.length === 0) {
      setRecruitmentData({ studyData: [], screeningData: [] });
      return;
    }

    try {
      const studyData = generateRecruitmentDetails(filteredPatients, selectedStudy, {
        endDate,
        limit: 12,
        timepoint: selectedTimepoint,
      });

      setRecruitmentData({
        studyData,
        screeningData: [], // Screening summary now uses screeningStats from filteredPatients
      });
    } catch (error) {
      console.error('[TrackingHistory] Error generating chart data:', error);
    }
  }, [filteredPatients, selectedStudy, selectedTimepoint, endDate]);

  // Initial load
  useEffect(() => {
    loadStudies();
  }, [loadStudies]);

  // Fetch patient data when study or site changes
  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);

  /**
   * Handle study selection change
   */
  const handleStudyChange = (event) => {
    const studyCode = event.target.value;
    setSelectedStudy(studyCode);
    localStorage.setItem('selectedStudyCode', studyCode);

    if (studyCode) {
      const studyObj = studies.find(s => s.studyCode === studyCode);
      if (studyObj) {
        dispatch(setStudy({
          id: studyObj.id,
          name: studyObj.name,
          studyCode: studyObj.studyCode,
          status: studyObj.status || 'active',
          site: studyObj.site || [],
          comparisonGroup: studyObj.comparisonGroup || [],
        }));
      }
    } else {
      dispatch(setStudy(null));
    }
  };

  // ===== CHART OPTIONS (derived from recruitmentData.studyData) =====

  // Aggregate studyData by period (sum across categories/groups)
  const chartData = useMemo(() => {
    console.log('[TrackingHistory] chartData input - studyData rows:', recruitmentData.studyData.length);
    const byPeriod = {};
    recruitmentData.studyData.forEach(row => {
      if (!byPeriod[row.date]) {
        byPeriod[row.date] = { recruited: 0, cumRecruited: 0, screened: 0, cumScreened: 0 };
      }
      byPeriod[row.date].recruited += row.recruited_number || 0;
      byPeriod[row.date].screened += row.screened_number || 0;
      // For cumulative, take the max across categories (they overlap for Total)
      byPeriod[row.date].cumRecruited = Math.max(byPeriod[row.date].cumRecruited, row.cumulative_recruited || 0);
      byPeriod[row.date].cumScreened = Math.max(byPeriod[row.date].cumScreened, row.cumulative_screened || 0);
    });
    const periods = Object.keys(byPeriod).sort();

    // Target calculations
    const totalTarget = recruitmentData.studyData.find(r => r.target)?.target || 50;
    const totalPeriods = periods.length;
    const cumRecruited = periods.map(p => byPeriod[p].cumRecruited);

    // Static target: linear distribution (total / periods, evenly spread)
    const cumTarget = periods.map((_, i) =>
      Math.round(totalTarget * (i + 1) / totalPeriods)
    );

    // Adaptive target: recalculates each period based on actual recruitment
    // e.g. target=50, 10 periods. Period 1 target = ceil(50/10) = 5.
    // If period 1 actual = 10, then period 2 target = ceil((50-10)/9) = 5, cumulative = 10+5 = 15
    const adaptiveCumTarget = [];
    for (let i = 0; i < periods.length; i++) {
      if (i === 0) {
        adaptiveCumTarget.push(Math.ceil(totalTarget / totalPeriods));
      } else {
        const actualPrev = cumRecruited[i - 1];
        const remaining = Math.max(0, totalTarget - actualPrev);
        const remainingPeriods = totalPeriods - i;
        const needed = remainingPeriods > 0 ? Math.ceil(remaining / remainingPeriods) : remaining;
        adaptiveCumTarget.push(actualPrev + needed);
      }
    }

    console.log('[TrackingHistory] chartData output - periods:', periods.length, 'target:', totalTarget);
    return {
      periods,
      recruited: periods.map(p => byPeriod[p].recruited),
      cumRecruited,
      screened: periods.map(p => byPeriod[p].screened),
      cumScreened: periods.map(p => byPeriod[p].cumScreened),
      cumTarget,
      adaptiveCumTarget,
      totalTarget,
    };
  }, [recruitmentData.studyData]);

  const recruitmentBarOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: chartData.periods, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', name: 'Recruited' },
    series: [{
      name: 'Recruited',
      type: 'line',
      data: chartData.recruited,
      itemStyle: { color: '#1976d2' },
      lineStyle: { width: 2 },
      label: { show: chartData.periods.length <= 12, position: 'top', fontSize: 10 },
    }],
    grid: { left: 60, right: 20, bottom: 60, top: 30 },
  }), [chartData]);

  const cumulativeRecruitmentOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['Cumulative Recruited', 'Planned Target', 'Adaptive Target'] },
    xAxis: { type: 'category', data: chartData.periods, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', name: 'Cumulative Recruited' },
    series: [
      {
        name: 'Cumulative Recruited',
        type: 'line',
        data: chartData.cumRecruited,
        smooth: true,
        areaStyle: { opacity: 0.15 },
        itemStyle: { color: '#2e7d32' },
        lineStyle: { width: 2 },
      },
      {
        name: 'Planned Target',
        type: 'line',
        data: chartData.cumTarget,
        lineStyle: { width: 2, type: 'dashed' },
        itemStyle: { color: '#d32f2f' },
        symbol: 'none',
      },
      {
        name: 'Adaptive Target',
        type: 'line',
        data: chartData.adaptiveCumTarget,
        lineStyle: { width: 2, type: 'dotted' },
        itemStyle: { color: '#ed6c02' },
        symbol: 'diamond',
        symbolSize: 6,
      },
    ],
    grid: { left: 60, right: 20, bottom: 60, top: 40 },
  }), [chartData]);

  const screeningBarOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: chartData.periods, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', name: 'Screened' },
    series: [{
      name: 'Screened',
      type: 'line',
      data: chartData.screened,
      itemStyle: { color: '#ed6c02' },
      lineStyle: { width: 2 },
      label: { show: chartData.periods.length <= 12, position: 'top', fontSize: 10 },
    }],
    grid: { left: 60, right: 20, bottom: 60, top: 30 },
  }), [chartData]);

  const cumulativeScreeningOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: chartData.periods, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', name: 'Cumulative Screened' },
    series: [{
      name: 'Cumulative Screened',
      type: 'line',
      data: chartData.cumScreened,
      smooth: true,
      areaStyle: { opacity: 0.15 },
      itemStyle: { color: '#9c27b0' },
      lineStyle: { width: 2 },
    }],
    grid: { left: 60, right: 20, bottom: 60, top: 30 },
  }), [chartData]);

  // ===== SCREENING STATS BY GROUP & WARD =====

  const screeningStats = useMemo(() => {
    const classify = (patient) => {
      if (patient.currentStatus === 'on-study') return 'enrolled';
      if (patient.currentStatus === 'not-registered' || patient.currentStatus === 'ineligible') {
        const reason = (patient.reason || '').toLowerCase();
        if (reason.includes('ineligible') || reason.includes('no inc') || reason.includes('exc')) return 'ineligible';
        if (reason.includes('decline') || reason.includes('refuse')) return 'declined';
        return 'other';
      }
      return 'other';
    };

    // Derive site from ward (e.g. WardHTDED → HTD, HTDED → HTD)
    const wardToSite = (ward) => {
      if (!ward || ward === 'Unknown') return 'Unknown';
      // const code = String(ward).replace(/^Ward/i, '');
      // const match = code.match(/^([A-Z]{3,4})/i);
      const match = String(ward).match(/Ward(HTD|NHTD|TVH|NTTH)/);
      return match ? match[1].toUpperCase() : (ward.slice(0, 4) || 'Unknown');
    };

    const init = () => ({ screened: 0, enrolled: 0, ineligible: 0, declined: 0, other: 0 });
    const byGroup = {};
    const bySite = {};
    const byWard = {};
    const total = init();

    filteredPatients.forEach(p => {
      console.log('hehe',p);
      const status = classify(p);
      total.screened++;
      total[status]++;

      (p.groups || []).forEach(g => {
        if (!byGroup[g]) byGroup[g] = init();
        byGroup[g].screened++;
        byGroup[g][status]++;
      });

      const site = wardToSite(p.ward);
      if (!bySite[site]) bySite[site] = init();
      bySite[site].screened++;
      bySite[site][status]++;

      const ward = p.ward || 'Unknown';
      if (!byWard[ward]) byWard[ward] = init();
      byWard[ward].screened++;
      byWard[ward][status]++;
    });

    // Build table rows: by Group, by Site, by Ward, then Total
    const rows = [];
    Object.keys(byGroup).sort().forEach(g => {
      rows.push({ id: `group-${g}`, category: g, type: 'Group', ...byGroup[g] });
    });
    Object.keys(bySite).sort().forEach(s => {
      rows.push({ id: `site-${s}`, category: s, type: 'Site', ...bySite[s] });
    });
    Object.keys(byWard).sort().forEach(w => {
      rows.push({ id: `ward-${w}`, category: w, type: 'Ward', ...byWard[w] });
    });
    rows.push({ id: 'total', category: 'Total', type: '', ...total });

    // Build chart data - combined groups, sites & wards
    const chartCategories = [
      ...Object.keys(byGroup).sort().map(g => `[G] ${g}`),
      ...Object.keys(bySite).sort().map(s => `[S] ${s}`),
      ...Object.keys(byWard).sort().map(w => `[W] ${w}`),
    ];
    const chartEnrolled = [
      ...Object.keys(byGroup).sort().map(g => byGroup[g].enrolled),
      ...Object.keys(bySite).sort().map(s => bySite[s].enrolled),
      ...Object.keys(byWard).sort().map(w => byWard[w].enrolled),
    ];
    const chartIneligible = [
      ...Object.keys(byGroup).sort().map(g => byGroup[g].ineligible),
      ...Object.keys(bySite).sort().map(s => bySite[s].ineligible),
      ...Object.keys(byWard).sort().map(w => byWard[w].ineligible),
    ];
    const chartDeclined = [
      ...Object.keys(byGroup).sort().map(g => byGroup[g].declined),
      ...Object.keys(bySite).sort().map(s => bySite[s].declined),
      ...Object.keys(byWard).sort().map(w => byWard[w].declined),
    ];
    const chartOther = [
      ...Object.keys(byGroup).sort().map(g => byGroup[g].other),
      ...Object.keys(bySite).sort().map(s => bySite[s].other),
      ...Object.keys(byWard).sort().map(w => byWard[w].other),
    ];

    return { rows, chartCategories, chartEnrolled, chartIneligible, chartDeclined, chartOther, total };
  }, [filteredPatients]);

  const screeningSummaryChartOption = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Enrolled', 'Ineligible', 'Declined', 'Other'] },
    xAxis: {
      type: 'value',
      name: 'Patients',
    },
    yAxis: {
      type: 'category',
      data: screeningStats.chartCategories,
      axisLabel: { width: 100, overflow: 'truncate' },
    },
    series: [
      { name: 'Enrolled', type: 'bar', stack: 'total', data: screeningStats.chartEnrolled, itemStyle: { color: '#2e7d32' } },
      { name: 'Ineligible', type: 'bar', stack: 'total', data: screeningStats.chartIneligible, itemStyle: { color: '#ed6c02' } },
      { name: 'Declined', type: 'bar', stack: 'total', data: screeningStats.chartDeclined, itemStyle: { color: '#d32f2f' } },
      { name: 'Other', type: 'bar', stack: 'total', data: screeningStats.chartOther, itemStyle: { color: '#9e9e9e' } },
    ],
    grid: { left: 120, right: 20, bottom: 30, top: 40 },
  }), [screeningStats]);

  // ===== PATIENT DATAGRID COLUMNS =====

  const patientColumns = useMemo(() => [
    {
      field: 'screeningId',
      headerName: 'Screening ID',
      width: 140,
      description: 'Participant screening identifier',
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 130,
      description: 'Participant name',
    },
    {
      field: 'studyId',
      headerName: 'Study ID',
      width: 180,
      description: 'Participant study identifier (enrolled patients)',
    },
    {
      field: 'groups',
      headerName: 'Group',
      width: 130,
      description: 'Participant group (e.g., CAP, VAP)',
      renderCell: (params) => {
        const groups = params.value || [];
        return groups.length > 0 ? (
          <Box display="flex" gap={0.5} flexWrap="wrap">
            {groups.map((g) => (
              <Chip key={g} label={g} size="small" color="primary" variant="outlined" />
            ))}
          </Box>
        ) : null;
      },
    },
    {
      field: 'ward',
      headerName: 'Ward',
      width: 120,
      description: 'Hospital ward',
    },
    {
      field: 'statusText',
      headerName: 'Status',
      width: 120,
      description: 'Recruitment status',
      renderCell: (params) => params.value ? (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'Enrolled' ? 'success' : params.value === 'Screening' ? 'info' : 'default'}
          variant="outlined"
        />
      ) : null,
    },
    {
      field: 'startDate',
      headerName: 'Screening Date',
      width: 130,
      description: 'Date when patient was first screened',
    },
    {
      field: 'lastUpdate',
      headerName: 'Last Update',
      width: 130,
      description: 'Date of last status update',
    },
    {
      field: 'reason',
      headerName: 'Reason',
      width: 150,
      description: 'Reason for current status',
    },
    {
      field: 'birthYear',
      headerName: 'Birth Year',
      width: 100,
      description: 'Participant birth year',
    },
  ], []);

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Tracking History
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* Filter Controls */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Study Selection */}
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Select Study</InputLabel>
            <Select
              value={selectedStudy}
              onChange={handleStudyChange}
              label="Select Study"
            >
              <MenuItem value="">All Studies</MenuItem>
              {studies.map((study) => (
                <MenuItem key={study.id || study.studyCode} value={study.studyCode}>
                  {study.studyCode}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Site Selection (shared component - works correctly with alias matching) */}
        {selectedStudy && (
          <Grid item xs={12} md={2}>
            <SiteSelection size="medium" fullWidth />
          </Grid>
        )}

        {/* Ward filter - local, derived from patient data */}
        {selectedStudy && availableWards.length > 0 && (
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="medium">
              <InputLabel>Ward</InputLabel>
              <Select
                value={localWardFilter}
                onChange={(e) => setLocalWardFilter(e.target.value)}
                label="Ward"
              >
                <MenuItem value="">
                  <em>All Wards</em>
                </MenuItem>
                {availableWards.map((ward) => (
                  <MenuItem key={ward} value={ward}>
                    {ward}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        {/* Group filter - local, derived from patient data */}
        {selectedStudy && availableGroups.length > 0 && (
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="medium">
              <InputLabel>Group</InputLabel>
              <Select
                value={localGroupFilter}
                onChange={(e) => setLocalGroupFilter(e.target.value)}
                label="Group"
              >
                <MenuItem value="">
                  <em>All Groups</em>
                </MenuItem>
                {availableGroups.map((group) => (
                  <MenuItem key={group} value={group}>
                    {group}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        {/* Timepoint Selection */}
        <Grid item xs={12} md={2}>
          <FormControl fullWidth>
            <InputLabel>Timepoint</InputLabel>
            <Select
              value={selectedTimepoint}
              onChange={(e) => setSelectedTimepoint(e.target.value)}
              label="Timepoint"
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
              <MenuItem value="yearly">Yearly</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* End Date Picker */}
        <Grid item xs={12} md={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newDate) => setEndDate(newDate)}
              slotProps={{ textField: { fullWidth: true } }}
              maxDate={new Date()}
            />
          </LocalizationProvider>
        </Grid>
      </Grid>

      {/* Recruitment Progress Charts */}
      {recruitmentData.studyData.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Recruitment Progress
          </Typography>
          <Grid container spacing={2}>
            {/* Recruitment by Timepoint (Bar Chart) */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Recruited per {selectedTimepoint.charAt(0).toUpperCase() + selectedTimepoint.slice(1)} Period
                </Typography>
                <ReactECharts
                  option={recruitmentBarOption}
                  style={{ height: '320px', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                  notMerge={true}
                />
              </Paper>
            </Grid>
            {/* Cumulative Recruitment (Line Chart) */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Cumulative Recruitment
                </Typography>
                <ReactECharts
                  option={cumulativeRecruitmentOption}
                  style={{ height: '320px', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                  notMerge={true}
                />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Screening Progress Charts */}
      {recruitmentData.studyData.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Screening Progress
          </Typography>
          <Grid container spacing={2}>
            {/* Screening by Timepoint (Bar Chart) */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Screened per {selectedTimepoint.charAt(0).toUpperCase() + selectedTimepoint.slice(1)} Period
                </Typography>
                <ReactECharts
                  option={screeningBarOption}
                  style={{ height: '320px', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                  notMerge={true}
                />
              </Paper>
            </Grid>
            {/* Cumulative Screening (Line Chart) */}
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Cumulative Screening
                </Typography>
                <ReactECharts
                  option={cumulativeScreeningOption}
                  style={{ height: '320px', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                  notMerge={true}
                />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Screening Summary: table by group / site / ward + chart */}
      {filteredPatients.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Screening Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Type</strong></TableCell>
                      <TableCell><strong>Category</strong></TableCell>
                      <TableCell align="right"><strong>Screened</strong></TableCell>
                      <TableCell align="right"><strong>Enrolled</strong></TableCell>
                      <TableCell align="right"><strong>Ineligible</strong></TableCell>
                      <TableCell align="right"><strong>Declined</strong></TableCell>
                      <TableCell align="right"><strong>Other</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {screeningStats.rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.type || '—'}</TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell align="right">{row.screened}</TableCell>
                        <TableCell align="right">{row.enrolled}</TableCell>
                        <TableCell align="right">{row.ineligible}</TableCell>
                        <TableCell align="right">{row.declined}</TableCell>
                        <TableCell align="right">{row.other}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            <Grid item xs={12} md={7}>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Screening outcome by Group / Site / Ward
                </Typography>
                <ReactECharts
                  option={screeningSummaryChartOption}
                  style={{ height: '360px', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                  notMerge={true}
                />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Recruitment Details Table */}
      {/* {recruitmentData.studyData.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Recruitment Details
          </Typography>
          <RecruitmentTable data={recruitmentData.studyData} endDate={endDate} />
        </Box>
      )} */}

      {/* Participant Detail Table (DataGrid) */}
      {/* {selectedStudy && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="h6" gutterBottom>
            Participant Details ({filteredPatients.length} patients)
          </Typography>
          <Paper elevation={2} sx={{ p: 2 }}>
            <DataGrid
              rows={filteredPatients}
              columns={patientColumns}
              loading={patientData.loading}
              autoHeight
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
                sorting: { sortModel: [{ field: 'startDate', sort: 'desc' }] },
              }}
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-cell': { py: 1 },
                '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f5f5f5' },
              }}
            />
          </Paper>
        </Box>
      )} */}

      <Footer />
    </Box>
  );
};

export default TrackingHistory;
