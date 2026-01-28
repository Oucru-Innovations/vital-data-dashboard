/**
 * TrackingCurrent.jsx - Current Recruitment Tracking Page
 *
 * This page displays current/active recruitment data with patient-level details
 * including label information from the FHIR ResearchSubject and Patient resources.
 *
 * KEY FEATURES:
 * =============
 * - Patient-level recruitment details table with label information
 * - Summary statistics cards (total enrolled, by condition, by label)
 * - Hierarchical filtering: Study → Site → Ward → Condition
 * - Live filter updates - table refreshes when any filter changes
 *
 * DATA SOURCES:
 * =============
 * DEVELOPMENT MODE (localhost):
 * - Mock data from: src/mockData/fhir/mockLabel.json
 * - Uses dynamic import for JSON loading
 *
 * PRODUCTION MODE:
 * - FHIR API: GET /ResearchSubject with _include for Patient data
 * - Real-time data from FHIR server
 *
 * FHIR BUNDLE STRUCTURE:
 * ======================
 * - Study ID: From linked VitalPatient name (e.g., "13NV-003-0002-C")
 * - Label: From VitalPatient extension dictionary (cap-1, cap-2, vap-1, vap-2)
 * - Condition: From ResearchSubject extension (CAP/VAP)
 * - Status: ResearchSubject status (draft, active, etc.)
 * - Progress: Screening date, enrolled date, eligible date
 * - Ward: From managingOrganization reference
 *
 * LABEL MEANING:
 * ==============
 * - cap-1, cap-2: Community Acquired Pneumonia cohorts
 * - vap-1, vap-2: Ventilator Associated Pneumonia cohorts
 *
 * @see data/Mock/mockLabel.json - Mock data source
 * @see fhirService.js - FHIR API service pattern
 * LAST UPDATED: 2026-01-28
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import ReactECharts from 'echarts-for-react';

// Layout components
import Footer from '../../components/toolbars/Footer';

// Shared filter components
import { SiteSelection, WardSelection, ConditionFilter } from '../../components/filters';

// Redux state management
import {
  setStudy,
  selectCurrentSite,
  selectCurrentWard,
  selectCurrentCondition,
} from '../../store/studySlice';

// FHIR service for studies list and API calls
import {
  getProcessedStudies,
  isDevelopmentMode,
  getCurrentRecruitmentData,
} from '../../services/fhirService';

/**
 * Extract label from VitalPatient extension
 * @param {Object} vitalPatient - The linked VitalPatient resource
 * @returns {string} The label value (e.g., "cap-1", "vap-2") or "N/A"
 */
const extractLabel = (vitalPatient) => {
  if (!vitalPatient?.extension) return 'N/A';

  const dictionaryExt = vitalPatient.extension.find(
    ext => ext.url === 'https://vital-fhir.oucru.org/StructureDefinition/dictionary'
  );

  if (!dictionaryExt?.extension) return 'N/A';

  const keyExt = dictionaryExt.extension.find(e => e.url === 'key');
  const valueExt = dictionaryExt.extension.find(e => e.url === 'value');

  if (keyExt?.valueString === 'label' && valueExt?.valueString) {
    return valueExt.valueString;
  }

  return 'N/A';
};

/**
 * Extract condition from ResearchSubject extension
 * @param {Object} resource - The ResearchSubject resource
 * @returns {string} The condition (CAP/VAP) or "Unknown"
 */
const extractCondition = (resource) => {
  if (!resource?.extension) return 'Unknown';

  const conditionExt = resource.extension.find(
    ext => ext.url === 'https://vital-fhir.oucru.org/StructureDefinition/condition'
  );

  return conditionExt?.valueCodeableConcept?.text || 'Unknown';
};

/**
 * Extract date from progress array by state code
 * @param {Array} progress - The progress array from ResearchSubject
 * @param {string} stateCode - The state code to find (screening, on-study, eligible)
 * @returns {string} The date or "N/A"
 */
const extractProgressDate = (progress, stateCode) => {
  if (!progress || !Array.isArray(progress)) return 'N/A';

  const progressItem = progress.find(
    p => p.subjectState?.coding?.[0]?.code === stateCode
  );

  return progressItem?.startDate || 'N/A';
};

/**
 * Extract ward code from managingOrganization reference
 * @param {Object} subject - The subject Patient resource
 * @returns {string} The ward code or "Unknown"
 */
const extractWard = (subject) => {
  const orgRef = subject?.managingOrganization?.reference || '';
  // Extract ward code from "Organization/WardHTDED" format
  const match = orgRef.match(/Organization\/Ward(.+)/);
  return match ? match[1] : 'Unknown';
};

/**
 * Process mockLabel.json data into table rows
 * @param {Object} bundle - The FHIR Bundle from mockLabel.json
 * @returns {Array} Processed rows for DataGrid
 */
const processMockLabelData = (bundle) => {
  if (!bundle?.entry) return [];

  return bundle.entry.map((entry, index) => {
    const resource = entry.resource;
    const subject = resource.subject;
    const linkedPatient = subject?.link?.[0]?.other;

    return {
      id: index,
      subjectId: resource.id,
      studyId: linkedPatient?.name?.[0]?.given?.[0] || 'N/A',
      screeningName: subject?.name?.[0]?.given?.[0] || 'N/A',
      condition: extractCondition(resource),
      label: extractLabel(linkedPatient),
      status: resource.status || 'Unknown',
      ward: extractWard(subject),
      screeningDate: extractProgressDate(resource.progress, 'screening'),
      enrolledDate: extractProgressDate(resource.progress, 'on-study'),
      eligibleDate: extractProgressDate(resource.progress, 'eligible'),
      birthYear: subject?.birthDate || 'N/A',
    };
  });
};

/**
 * TrackingCurrentPage Component
 *
 * Displays current recruitment data with patient-level details and labels.
 */
const TrackingCurrentPage = () => {
  const dispatch = useDispatch();

  // Redux state for filters
  const currentSite = useSelector(selectCurrentSite);
  const currentWard = useSelector(selectCurrentWard);
  const currentCondition = useSelector(selectCurrentCondition);

  // Local state
  const [loading, setLoading] = useState(true);
  const [mockData, setMockData] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [studies, setStudies] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState(() => {
    return localStorage.getItem('selectedStudyCode') || '';
  });

  // Summary statistics
  // ============ EDIT START: Dynamic initial state - no hard-coded conditions (2026-01-28) ============
  const [stats, setStats] = useState({
    total: 0,
    byCondition: {},      // Will be populated dynamically with any conditions from data
    byLabel: {},
    byStatus: {},
    byWard: {},
    byLabelCondition: {}, // Will be populated dynamically with any conditions from data
  });
  // ============ EDIT END: Dynamic initial state ============

  /**
   * Load data from mock file (development mode)
   * Uses dynamic import pattern consistent with fhirService.js
   */
  const loadMockData = useCallback(async () => {
    try {
      console.log('[TrackingCurrent] DEVELOPMENT MODE: Loading mockLabel.json...');

      // Dynamic import of mock data JSON file
      const mockModule = await import('../../mockData/fhir/mockLabel.json');
      const data = mockModule.default || mockModule;

      console.log(`[TrackingCurrent] Loaded ${data.total} subjects from mockLabel.json`);
      return data;

    } catch (error) {
      console.error('[TrackingCurrent] Error loading mock data:', error);
      return null;
    }
  }, []);

  /**
   * Load data from FHIR API (production mode)
   * Calls the getCurrentRecruitmentData service function
   *
   * API Endpoint: GET /ResearchSubject
   * Parameters:
   *   - _count: 2000 (max records)
   *   - status:not: retired (exclude retired subjects)
   *   - study: ResearchStudy/{studyId} (filter by study if selected)
   *   - _include: ResearchSubject:subject (include Patient data)
   */
  const loadFromAPI = useCallback(async () => {
    try {
      console.log('[TrackingCurrent] PRODUCTION MODE: Loading from FHIR API...');

      // Call FHIR service to get current recruitment data
      const data = await getCurrentRecruitmentData({
        studyCode: selectedStudy || undefined,
      });

      console.log(`[TrackingCurrent] Loaded ${data?.total || 0} subjects from FHIR API`);
      return data;

    } catch (error) {
      console.error('[TrackingCurrent] Error loading from FHIR API:', error);
      return null;
    }
  }, [selectedStudy]);

  /**
   * Main data loading function
   * Automatically chooses between mock data (development) and FHIR API (production)
   * Default: Uses mock data in development mode
   */
  const loadRecruitmentData = useCallback(async () => {
    try {
      setLoading(true);

      let data;
      if (isDevelopmentMode()) {
        // Development mode: Load from mock JSON file
        data = await loadMockData();
      } else {
        // Production mode: Load from FHIR API
        data = await loadFromAPI();
      }

      setMockData(data);

    } catch (error) {
      console.error('[TrackingCurrent] Error loading recruitment data:', error);
      setMockData(null);
    } finally {
      setLoading(false);
    }
  }, [loadMockData, loadFromAPI]);

  /**
   * Load studies list for dropdown
   */
  const loadStudies = useCallback(async () => {
    try {
      if (isDevelopmentMode()) {
        const studyList = await getProcessedStudies();
        setStudies(studyList);
      }
    } catch (error) {
      console.error('[TrackingCurrent] Error loading studies:', error);
    }
  }, []);

  /**
   * Process and filter data when mockData or filters change
   */
  useEffect(() => {
    if (!mockData) return;

    let processed = processMockLabelData(mockData);

    // Apply condition filter
    if (currentCondition) {
      processed = processed.filter(row => row.condition === currentCondition);
    }

    // Apply ward filter
    if (currentWard) {
      processed = processed.filter(row =>
        row.ward.toLowerCase().includes(currentWard.code?.toLowerCase() || '')
      );
    }

    setTableData(processed);

    // ============ EDIT START: Fully dynamic stats calculation (2026-01-28) ============
    // Calculate statistics - no hard-coded conditions, all dynamic from data
    const newStats = {
      total: processed.length,
      byCondition: {},        // Dynamically populated
      byLabel: {},
      byStatus: {},
      byWard: {},
      byLabelCondition: {},   // Dynamically populated
    };

    processed.forEach(row => {
      // Count by condition (dynamic - any condition from data)
      const condition = row.condition || 'Unknown';
      newStats.byCondition[condition] = (newStats.byCondition[condition] || 0) + 1;

      // Count by label
      newStats.byLabel[row.label] = (newStats.byLabel[row.label] || 0) + 1;

      // Count by status
      newStats.byStatus[row.status] = (newStats.byStatus[row.status] || 0) + 1;

      // Count by ward
      const ward = row.ward || 'Unknown';
      newStats.byWard[ward] = (newStats.byWard[ward] || 0) + 1;

      // Count labels grouped by condition (dynamic - for label-condition chart)
      if (!newStats.byLabelCondition[condition]) {
        newStats.byLabelCondition[condition] = {};
      }
      newStats.byLabelCondition[condition][row.label] =
        (newStats.byLabelCondition[condition][row.label] || 0) + 1;
    });

    setStats(newStats);
    // ============ EDIT END: Fully dynamic stats calculation ============

  }, [mockData, currentCondition, currentWard]);

  // Initial data load
  // Uses loadRecruitmentData which automatically chooses between mock (dev) and API (prod)
  useEffect(() => {
    loadRecruitmentData();
    loadStudies();
  }, [loadRecruitmentData, loadStudies]);

  /**
   * Handle study selection change
   */
  const handleStudyChange = (event) => {
    const studyCode = event.target.value;
    setSelectedStudy(studyCode);
    localStorage.setItem('selectedStudyCode', studyCode);

    const selectedStudyObj = studies.find(s => s.studyCode === studyCode);
    if (selectedStudyObj) {
      dispatch(setStudy(selectedStudyObj));
    }
  };

  /**
   * Get chip color based on label type
   */
  const getLabelColor = (label) => {
    if (label.startsWith('cap')) return 'primary';
    if (label.startsWith('vap')) return 'secondary';
    return 'default';
  };

  // ============ EDIT START: Dynamic chip colors for conditions (2026-01-28) ============
  // Map of MUI chip colors for dynamic conditions
  const chipColorMap = ['info', 'warning', 'success', 'error', 'primary', 'secondary'];
  
  /**
   * Get chip color based on condition (dynamic)
   */
  const getConditionColor = (condition) => {
    const conditionList = Object.keys(stats.byCondition || {});
    const index = conditionList.indexOf(condition);
    return index >= 0 ? chipColorMap[index % chipColorMap.length] : 'default';
  };
  // ============ EDIT END: Dynamic chip colors for conditions ============

  // ============================================
  // CHART CONFIGURATIONS
  // ============================================

  // ============ EDIT START: Dynamic condition pie chart (2026-01-28) ============
  // Color palette for dynamic conditions in charts
  const pieConditionColors = ['#0288d1', '#ed6c02', '#4caf50', '#9c27b0', '#f44336', '#ff9800'];
  
  /**
   * Pie Chart - Condition Distribution (dynamic from data)
   * Shows the percentage breakdown of all conditions
   */
  const conditionPieChartOption = {
    title: {
      text: 'Condition Distribution',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
      },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'horizontal',
      bottom: '5%',
      left: 'center',
    },
    series: [
      {
        name: 'Condition',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c}',
          position: 'outside',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: true,
        },
        // Dynamically generate data from all conditions
        data: Object.entries(stats.byCondition || {}).map(([condition, count], index) => ({
          value: count,
          name: condition,
          itemStyle: { color: pieConditionColors[index % pieConditionColors.length] },
        })),
      },
    ],
  };
  // ============ EDIT END: Dynamic condition pie chart ============

  /**
   * Bar Chart - Label Distribution
   * Shows count of each label type (cap-1, cap-2, vap-1, vap-2)
   */
  const labelBarChartOption = {
    title: {
      text: 'Label Distribution',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: Object.keys(stats.byLabel || {}).sort(),
      axisLabel: {
        rotate: 0,
        fontSize: 12,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Count',
    },
    series: [
      {
        name: 'Subjects',
        type: 'bar',
        barWidth: '60%',
        data: Object.keys(stats.byLabel || {})
          .sort()
          .map((label) => ({
            value: stats.byLabel?.[label] || 0,
            itemStyle: {
              color: label.startsWith('cap') ? '#1976d2' : '#9c27b0',
              borderRadius: [4, 4, 0, 0],
            },
          })),
        label: {
          show: true,
          position: 'top',
          fontSize: 12,
          fontWeight: 'bold',
        },
      },
    ],
  };

  /**
   * Horizontal Bar Chart - Ward Distribution
   * Shows recruitment count by hospital ward
   */
  const wardBarChartOption = {
    title: {
      text: 'Recruitment by Ward',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: '{b}: {c} subjects',
    },
    grid: {
      left: '3%',
      right: '10%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: 'Subjects',
    },
    yAxis: {
      type: 'category',
      data: Object.keys(stats.byWard || {}).sort((a, b) => (stats.byWard?.[b] || 0) - (stats.byWard?.[a] || 0)),
      axisLabel: {
        fontSize: 11,
      },
    },
    series: [
      {
        name: 'Subjects',
        type: 'bar',
        data: Object.keys(stats.byWard || {})
          .sort((a, b) => (stats.byWard?.[b] || 0) - (stats.byWard?.[a] || 0))
          .map((ward, index) => ({
            value: stats.byWard?.[ward] || 0,
            itemStyle: {
              color: ['#1976d2', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50'][index % 6],
              borderRadius: [0, 4, 4, 0],
            },
          })),
        label: {
          show: true,
          position: 'right',
          fontSize: 12,
          fontWeight: 'bold',
        },
      },
    ],
  };

  // ============ EDIT START: Dynamic conditions from data (2026-01-28) ============
  // Get all unique conditions dynamically from the data (not hard-coded CAP/VAP)
  const allConditions = Object.keys(stats.byLabelCondition || {});
  
  // Get all unique labels across all conditions
  const allLabels = [...new Set(
    allConditions.flatMap(condition => 
      Object.keys(stats.byLabelCondition?.[condition] || {})
    )
  )].sort();

  // Color palette for dynamic conditions
  const conditionColors = ['#0288d1', '#ed6c02', '#4caf50', '#9c27b0', '#f44336', '#ff9800'];
  // ============ EDIT END: Dynamic conditions from data ============

  /**
   * Grouped Bar Chart - Labels by Condition
   * Shows label distribution within each condition (dynamically from data)
   */
  const labelConditionChartOption = {
    title: {
      text: 'Labels by Condition',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {
      data: allConditions,
      bottom: '5%',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: allLabels,
      axisLabel: {
        fontSize: 12,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Subjects',
    },
    series: allConditions.map((condition, index) => ({
      name: condition,
      type: 'bar',
      barGap: index === 0 ? 0 : undefined,
      data: allLabels.map((label) => ({
        value: stats.byLabelCondition?.[condition]?.[label] || 0,
        itemStyle: {
          color: conditionColors[index % conditionColors.length],
          borderRadius: [4, 4, 0, 0],
        },
      })),
      label: {
        show: true,
        position: 'top',
        fontSize: 11,
        formatter: (params) => params.value > 0 ? params.value : '',
      },
    })),
  };

  /**
   * Radar Chart - Recruitment Overview
   * Shows a multi-dimensional view of recruitment metrics (dynamic conditions)
   */
  // ============ EDIT START: Dynamic radar chart (2026-01-28) ============
  // Build radar indicators dynamically based on conditions and labels
  const radarIndicators = [
    { 
      name: 'Total Count', 
      max: Math.max(...allConditions.map(c => stats.byCondition?.[c] || 0)) * 1.2 || 10 
    },
    ...allLabels.slice(0, 3).map((label, idx) => ({
      name: `Label: ${label}`,
      max: Math.max(...allConditions.map(c => stats.byLabelCondition?.[c]?.[label] || 0)) * 1.5 || 10,
    })),
    { 
      name: 'Active Wards', 
      max: Object.keys(stats.byWard || {}).length || 5 
    },
  ];

  const recruitmentRadarOption = {
    title: {
      text: 'Recruitment Overview',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
      },
    },
    tooltip: {
      trigger: 'item',
    },
    legend: {
      data: allConditions,
      bottom: '5%',
    },
    radar: {
      indicator: radarIndicators,
      center: ['50%', '50%'],
      radius: '60%',
    },
    series: [
      {
        type: 'radar',
        data: allConditions.map((condition, index) => ({
          value: [
            stats.byCondition?.[condition] || 0,
            ...allLabels.slice(0, 3).map(label => stats.byLabelCondition?.[condition]?.[label] || 0),
            Object.keys(stats.byWard || {}).filter(w =>
              tableData.some(r => r.ward === w && r.condition === condition)
            ).length,
          ],
          name: condition,
          itemStyle: { color: conditionColors[index % conditionColors.length] },
          areaStyle: { opacity: 0.3 },
        })),
      },
    ],
  };
  // ============ EDIT END: Dynamic radar chart ============

  // Table columns definition
  const columns = [
    {
      field: 'studyId',
      headerName: 'Study ID',
      width: 180,
      description: 'Patient study identifier (e.g., 13NV-003-0002-C)',
    },
    {
      field: 'label',
      headerName: 'Label',
      width: 100,
      description: 'Patient cohort label (cap-1, cap-2, vap-1, vap-2)',
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={getLabelColor(params.value)}
          variant="outlined"
        />
      ),
    },
    {
      field: 'condition',
      headerName: 'Condition',
      width: 100,
      description: 'CAP (Community Acquired Pneumonia) or VAP (Ventilator Associated Pneumonia)',
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={getConditionColor(params.value)}
        />
      ),
    },
    {
      field: 'ward',
      headerName: 'Ward',
      width: 120,
      description: 'Hospital ward code',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      description: 'Recruitment status',
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'draft' ? 'default' : 'success'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'screeningDate',
      headerName: 'Screening Date',
      width: 130,
      description: 'Date when patient was screened',
    },
    {
      field: 'enrolledDate',
      headerName: 'Enrolled Date',
      width: 130,
      description: 'Date when patient was enrolled (on-study)',
    },
    {
      field: 'eligibleDate',
      headerName: 'Eligible Date',
      width: 130,
      description: 'Date when patient was marked eligible',
    },
    {
      field: 'screeningName',
      headerName: 'Screening Name',
      width: 130,
      description: 'Patient screening identifier',
    },
    {
      field: 'birthYear',
      headerName: 'Birth Year',
      width: 100,
      description: 'Patient birth year',
    },
  ];

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
        Current Recruitment Tracking
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Patient-level recruitment details with label information from FHIR data
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* Filter Controls */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Select Study</InputLabel>
              <Select
                value={selectedStudy}
                onChange={handleStudyChange}
                label="Select Study"
              >
                <MenuItem value="">
                  <em>All Studies</em>
                </MenuItem>
                {studies.map((study) => (
                  <MenuItem key={study.id || study.studyCode} value={study.studyCode}>
                    {study.studyCode} - {study.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {selectedStudy && (
            <Grid item xs={12} md={3}>
              <SiteSelection />
            </Grid>
          )}

          {selectedStudy && currentSite && (
            <Grid item xs={12} md={2}>
              <WardSelection />
            </Grid>
          )}

          {selectedStudy && (
            <Grid item xs={12} md={2}>
              <ConditionFilter />
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Summary Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Total Subjects Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Subjects
              </Typography>
              <Typography variant="h3" color="primary">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Currently enrolled
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* ============ EDIT START: Dynamic condition cards (2026-01-28) ============ */}
        {/* Dynamically render cards for each condition in the data */}
        {Object.entries(stats.byCondition || {}).map(([condition, count], index) => (
          <Grid item xs={12} sm={6} md={3} key={condition}>
            <Card elevation={2}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  {condition} Subjects
                </Typography>
                <Typography variant="h3" sx={{ color: pieConditionColors[index % pieConditionColors.length] }}>
                  {count}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Condition: {condition}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {/* ============ EDIT END: Dynamic condition cards ============ */}

        {/* Labels Breakdown Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                By Label
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {Object.entries(stats.byLabel || {}).map(([label, count]) => (
                  <Chip
                    key={label}
                    label={`${label}: ${count}`}
                    size="small"
                    color={getLabelColor(label)}
                    variant="outlined"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>
        Recruitment Analytics
      </Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Condition Distribution Pie Chart */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <ReactECharts
              option={conditionPieChartOption}
              style={{ height: '300px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </Paper>
        </Grid>

        {/* Label Distribution Bar Chart */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <ReactECharts
              option={labelBarChartOption}
              style={{ height: '300px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </Paper>
        </Grid>

        {/* Ward Distribution Bar Chart */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <ReactECharts
              option={wardBarChartOption}
              style={{ height: '300px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </Paper>
        </Grid>

        {/* Labels by Condition Chart */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <ReactECharts
              option={labelConditionChartOption}
              style={{ height: '320px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </Paper>
        </Grid>

        {/* Recruitment Overview Radar Chart */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <ReactECharts
              option={recruitmentRadarOption}
              style={{ height: '320px', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Recruitment Details Table */}
      <Paper elevation={3}>
        <Typography
          variant="h6"
          sx={{
            p: 2,
            borderRadius: '4px 4px 0 0',
            bgcolor: 'background.paper',
          }}
        >
          Recruitment Details
        </Typography>
        <Box sx={{ height: 500, width: '100%' }}>
          <DataGrid
            rows={tableData}
            columns={columns}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
              sorting: {
                sortModel: [{ field: 'enrolledDate', sort: 'desc' }],
              },
            }}
            pageSizeOptions={[5, 10, 25, 50]}
            disableRowSelectionOnClick
            sx={{
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid rgba(201, 205, 216, 0.5)',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#f5f5f5',
                borderBottom: '2px solid rgba(201, 205, 216, 0.9)',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
              },
            }}
          />
        </Box>
      </Paper>

      {/* Data Source Info */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Data source: mockLabel.json | Total records: {mockData?.total || 0} |
          Last updated: {mockData?.meta?.lastUpdated || 'N/A'}
        </Typography>
      </Box>

      <Footer />
    </Box>
  );
};

export default TrackingCurrentPage;
