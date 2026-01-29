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
 * Extract site (hospital) code from managingOrganization reference
 * Site is derived from the ward organization reference
 * 
 * Organization reference format: "Organization/WardXXXYY"
 * Where XXX = site/hospital code (e.g., "HTD" = Hospital of Tropical Diseases)
 *       YY = ward code within that site (e.g., "ED" = Emergency Department)
 * 
 * @param {Object} subject - The subject Patient resource
 * @returns {string} The site code or "Unknown"
 */
const extractSite = (resource, subject) => {
  const orgRef = subject?.managingOrganization?.reference || '';
  
  // Extract from "Organization/WardXXXYY" format
  // The site code is typically the first 3 characters after "Ward"
  const wardMatch = orgRef.match(/Organization\/Ward([A-Z]{3})/i);
  if (wardMatch) {
    return wardMatch[1]; // Returns site code like "HTD"
  }
  
  // Fallback: Try to get from "Organization/SiteXXX" format
  const siteMatch = orgRef.match(/Organization\/Site([A-Z0-9]+)/i);
  if (siteMatch) {
    return siteMatch[1];
  }
  
  // Last fallback: Try organization display name if available
  const orgDisplay = subject?.managingOrganization?.display;
  if (orgDisplay) {
    return orgDisplay;
  }
  
  return 'Unknown';
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
      site: extractSite(resource, subject),
      ward: extractWard(subject),
      screeningDate: extractProgressDate(resource.progress, 'screening'),
      enrolledDate: extractProgressDate(resource.progress, 'on-study'),
      eligibleDate: extractProgressDate(resource.progress, 'eligible'),
      birthYear: subject?.birthDate || 'N/A',
    };
  });
};

// ============ EDIT START: Filter mock data function - MOVED OUTSIDE COMPONENT (2026-01-29) ============
/**
 * Filter FHIR Bundle entries based on selected filters
 * Simulates server-side filtering that would happen with real API
 *
 * IMPORTANT: This function is defined OUTSIDE the component to avoid
 * stale closure issues when used inside useCallback hooks.
 *
 * SITE MATCHING LOGIC:
 * ====================
 * The site filter uses the site's alias array for matching because:
 * - Site dropdown provides code like "003" (from study-specific alias "13NV-003-")
 * - Mock data has ward references like "Organization/WardHTDED" (site = "HTD")
 * - The site object has alias array: ["HTD", "13NV-003-", ...]
 * - We check if ANY alias matches the site code in the ward reference
 *
 * @param {Object} bundle - FHIR Bundle with entries
 * @param {Object} filters - Filter criteria
 * @param {Object} filters.siteObj - Full site object with alias array
 * @param {Object} filters.wardObj - Full ward object with id for matching
 * @param {string} filters.group - Condition/group to filter by (CAP, VAP, etc.)
 * @returns {Object} Filtered FHIR Bundle
 */
const filterMockData = (bundle, filters = {}) => {
  if (!bundle?.entry) return bundle;

  const { siteObj, wardObj, group } = filters;

  let filteredEntries = [...bundle.entry];

  // Filter by group (condition)
  if (group) {
    filteredEntries = filteredEntries.filter(entry => {
      const conditionExt = entry.resource?.extension?.find(
        ext => ext.url === 'https://vital-fhir.oucru.org/StructureDefinition/condition'
      );
      const conditionText = conditionExt?.valueCodeableConcept?.text;
      return conditionText === group;
    });
    console.log(`[TrackingCurrent] Filtered by group "${group}": ${filteredEntries.length} entries`);
  }

  // Filter by site using alias array matching
  // The site object has alias array like: ["HTD", "13NV-003-", "54EI-003-"]
  // Ward references are like: "Organization/WardHTDED" where "HTD" is the site code
  if (siteObj && siteObj.alias && siteObj.alias.length > 0) {
    // Get the short site code (first alias, usually like "HTD", "NTTH")
    const siteAliases = siteObj.alias.map(a => a.toUpperCase());

    console.log(`[TrackingCurrent] Filtering by site aliases:`, siteAliases);

    filteredEntries = filteredEntries.filter(entry => {
      const orgRef = entry.resource?.subject?.managingOrganization?.reference || '';
      // Extract site code from "Organization/WardHTDED" → "HTDED" → check if starts with any alias
      const wardMatch = orgRef.match(/Organization\/Ward(.+)/i);
      const wardCode = wardMatch ? wardMatch[1].toUpperCase() : '';

      // Check if the ward code starts with any of the site's aliases
      // e.g., "HTDED" starts with "HTD", "HTDNhiemD" starts with "HTD"
      // e.g., "NTTHED" starts with "NTTH" (for Nguyen Thi Thap Hospital)
      const matchesAnySiteAlias = siteAliases.some(alias => {
        // Only match short aliases (like "HTD", "NTTH") not study-specific ones (like "13NV-003-")
        if (alias.includes('-')) return false;
        return wardCode.startsWith(alias);
      });

      return matchesAnySiteAlias;
    });
    console.log(`[TrackingCurrent] Filtered by site "${siteObj.name}": ${filteredEntries.length} entries`);
  }

  // Filter by ward using ward object's ID
  // Ward object has id like "WardHTDED", mock data has references like "Organization/WardHTDED"
  // Extract the ward code from the ward object's id (remove "Ward" prefix if present)
  if (wardObj && wardObj.id) {
    // Ward id is like "WardHTDED" or just "HTDED"
    const wardIdCode = wardObj.id.replace(/^Ward/i, '').toUpperCase();

    console.log(`[TrackingCurrent] Filtering by ward ID: "${wardObj.id}" → code: "${wardIdCode}"`);

    filteredEntries = filteredEntries.filter(entry => {
      const orgRef = entry.resource?.subject?.managingOrganization?.reference || '';
      const wardMatch = orgRef.match(/Organization\/Ward(.+)/i);
      const entryWard = wardMatch ? wardMatch[1].toUpperCase() : '';
      return entryWard === wardIdCode;
    });
    console.log(`[TrackingCurrent] Filtered by ward "${wardObj.name}": ${filteredEntries.length} entries`);
  }

  return {
    ...bundle,
    entry: filteredEntries,
    total: filteredEntries.length,
  };
};
// ============ EDIT END: Filter mock data function ============

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
    byCondition: {},      // Will be populated dynamically with any groups from data
    byLabel: {},
    byStatus: {},
    bySite: {},           // Site totals
    byWard: {},
    byLabelCondition: {}, // Will be populated dynamically with any groups from data
    byWardCondition: {},  // Ward → Group breakdown for stacked bar chart
    bySiteCondition: {},  // Site → Group breakdown for stacked bar chart
  });
  // ============ EDIT END: Dynamic initial state ============

  /**
   * Load data from mock file (development mode)
   * Uses dynamic import pattern consistent with fhirService.js
   * Applies filters to simulate API filtering behavior
   */
  const loadMockData = useCallback(async (filters = {}) => {
    try {
      console.log('[TrackingCurrent] DEVELOPMENT MODE: Loading mockLabel.json...');
      console.log('[TrackingCurrent] Applied filters:', filters);

      // Dynamic import of mock data JSON file
      // IMPORTANT: Dynamic imports are cached by the module system.
      // We deep clone to ensure fresh data each time and avoid stale reference issues.
      const mockModule = await import('../../mockData/fhir/mockLabel.json');
      const rawData = JSON.parse(JSON.stringify(mockModule.default || mockModule));

      // Apply filters to simulate API behavior
      const data = filterMockData(rawData, filters);

      console.log(`[TrackingCurrent] Loaded ${data.total} subjects (filtered from ${rawData.total})`);
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
  const loadFromAPI = useCallback(async (filters = {}) => {
    try {
      console.log('[TrackingCurrent] PRODUCTION MODE: Loading from FHIR API...');
      console.log('[TrackingCurrent] API filters:', filters);

      // Call FHIR service to get current recruitment data
      const data = await getCurrentRecruitmentData({
        studyCode: selectedStudy || undefined,
        ...filters, // Pass filters to API
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
   * Applies selected filters (site, ward, group) to the data source
   */
  const loadRecruitmentData = useCallback(async () => {
    try {
      setLoading(true);

      // Build filters from current selections
      // Pass full objects for proper matching in mock data
      const filters = {
        siteObj: currentSite || null,  // Full site object with alias array
        site: currentSite?.code || null,  // Site code for API calls
        wardObj: currentWard || null,  // Full ward object with id for matching
        ward: currentWard?.code || null,  // Ward code for API calls
        group: currentCondition || null,
      };

      console.log('[TrackingCurrent] Loading data with filters:', {
        siteName: currentSite?.name,
        siteCode: currentSite?.code,
        siteAliases: currentSite?.alias,
        wardId: currentWard?.id,
        wardName: currentWard?.name,
        group: filters.group,
      });

      let data;
      if (isDevelopmentMode()) {
        // Development mode: Load from mock JSON file with filters
        data = await loadMockData(filters);
      } else {
        // Production mode: Load from FHIR API with filters
        data = await loadFromAPI(filters);
      }

      setMockData(data);

    } catch (error) {
      console.error('[TrackingCurrent] Error loading recruitment data:', error);
      setMockData(null);
    } finally {
      setLoading(false);
    }
  }, [loadMockData, loadFromAPI, currentSite, currentWard, currentCondition]);

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
   * Process data when mockData changes
   * Note: Filtering is now done at the data loading level (simulating API behavior)
   * This useEffect only processes the already-filtered data into table format and calculates stats
   */
  useEffect(() => {
    if (!mockData) return;

    // Process the pre-filtered data into table rows
    const processed = processMockLabelData(mockData);
    setTableData(processed);
    
    console.log(`[TrackingCurrent] Processed ${processed.length} rows for display`);

    // ============ EDIT START: Fully dynamic stats calculation (2026-01-28) ============
    // Calculate statistics - no hard-coded conditions, all dynamic from data
    const newStats = {
      total: processed.length,
      byCondition: {},        // Dynamically populated (now called "Group")
      byLabel: {},
      byStatus: {},
      bySite: {},             // Site totals
      byWard: {},
      byLabelCondition: {},   // Dynamically populated
      byWardCondition: {},    // Ward → Group breakdown for stacked bar chart
      bySiteCondition: {},    // Site → Group breakdown for stacked bar chart
    };

    processed.forEach(row => {
      // Count by condition/group (dynamic - any condition from data)
      const condition = row.condition || 'Unknown';
      newStats.byCondition[condition] = (newStats.byCondition[condition] || 0) + 1;

      // Count by label
      newStats.byLabel[row.label] = (newStats.byLabel[row.label] || 0) + 1;

      // Count by status
      newStats.byStatus[row.status] = (newStats.byStatus[row.status] || 0) + 1;

      // Count by site (total)
      const site = row.site || 'Unknown';
      newStats.bySite[site] = (newStats.bySite[site] || 0) + 1;

      // Count by site AND condition (for stacked bar chart)
      if (!newStats.bySiteCondition[site]) {
        newStats.bySiteCondition[site] = {};
      }
      newStats.bySiteCondition[site][condition] = 
        (newStats.bySiteCondition[site][condition] || 0) + 1;

      // Count by ward (total)
      const ward = row.ward || 'Unknown';
      newStats.byWard[ward] = (newStats.byWard[ward] || 0) + 1;

      // Count by ward AND condition (for stacked bar chart)
      if (!newStats.byWardCondition[ward]) {
        newStats.byWardCondition[ward] = {};
      }
      newStats.byWardCondition[ward][condition] = 
        (newStats.byWardCondition[ward][condition] || 0) + 1;

      // Count labels grouped by condition (dynamic - for label-condition chart)
      if (!newStats.byLabelCondition[condition]) {
        newStats.byLabelCondition[condition] = {};
      }
      newStats.byLabelCondition[condition][row.label] =
        (newStats.byLabelCondition[condition][row.label] || 0) + 1;
    });

    setStats(newStats);
    // ============ EDIT END: Fully dynamic stats calculation ============

  }, [mockData]); // Only re-process when mockData changes (filtering is done at load time)

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

  // ============================================
  // COLOR PALETTES & HELPER FUNCTIONS
  // ============================================

  // ============ EDIT START: Unified color palette for all charts (2026-01-28) ============
  // Single color palette used consistently across all charts - rotates if more items than colors
  const chartColors = [
    '#0288d1', // Blue
    '#ed6c02', // Orange
    '#4caf50', // Green
    '#9c27b0', // Purple
    '#f44336', // Red
    '#ff9800', // Amber
    '#00bcd4', // Cyan
    '#e91e63', // Pink
    '#3f51b5', // Indigo
    '#795548', // Brown
  ];

  // MUI chip colors for dynamic items - rotates if more items than colors
  const chipColorMap = ['info', 'warning', 'success', 'error', 'primary', 'secondary'];

  /**
   * Get chart color by index (rotates through palette)
   */
  const getChartColor = (index) => chartColors[index % chartColors.length];

  /**
   * Get chip color based on label (dynamic - based on label index)
   */
  const getLabelColor = (label) => {
    const labelList = Object.keys(stats.byLabel || {}).sort();
    const index = labelList.indexOf(label);
    return index >= 0 ? chipColorMap[index % chipColorMap.length] : 'default';
  };

  /**
   * Get chip color based on group (dynamic - based on group index)
   */
  const getConditionColor = (condition) => {
    const conditionList = Object.keys(stats.byCondition || {});
    const index = conditionList.indexOf(condition);
    return index >= 0 ? chipColorMap[index % chipColorMap.length] : 'default';
  };
  // ============ EDIT END: Unified color palette for all charts ============

  // ============================================
  // CHART CONFIGURATIONS
  // ============================================
  
  /**
   * Pie Chart - Group Distribution (dynamic from data)
   * Shows the percentage breakdown of all groups
   */
  const conditionPieChartOption = {
    title: {
      text: 'Group Distribution',
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
        name: 'Group',
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
        // Dynamically generate data from all groups
        data: Object.entries(stats.byCondition || {}).map(([group, count], index) => ({
          value: count,
          name: group,
          itemStyle: { color: getChartColor(index) },
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
          .map((label, index) => ({
            value: stats.byLabel?.[label] || 0,
            itemStyle: {
              // Dynamic color based on label index (rotates through palette)
              color: getChartColor(index),
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

  // ============ EDIT START: Stacked bar chart by ward and group (2026-01-28) ============
  // Get sorted wards by total count (descending)
  const sortedWards = Object.keys(stats.byWard || {})
    .sort((a, b) => (stats.byWard?.[b] || 0) - (stats.byWard?.[a] || 0));
  
  // Get all unique groups for the ward chart
  const allGroups = Object.keys(stats.byCondition || {});

  /**
   * Horizontal Stacked Bar Chart - Ward Distribution by Group
   * Shows recruitment count by hospital ward, stacked by group
   */
  const wardBarChartOption = {
    title: {
      text: 'Recruitment by Ward & Group',
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
      formatter: (params) => {
        let tooltip = `<strong>${params[0].axisValue}</strong><br/>`;
        let total = 0;
        params.forEach(p => {
          if (p.value > 0) {
            tooltip += `${p.marker} ${p.seriesName}: ${p.value}<br/>`;
            total += p.value;
          }
        });
        tooltip += `<strong>Total: ${total}</strong>`;
        return tooltip;
      },
    },
    legend: {
      data: allGroups,
      bottom: '0%',
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '12%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: 'Subjects',
    },
    yAxis: {
      type: 'category',
      data: sortedWards,
      axisLabel: {
        fontSize: 11,
      },
    },
    series: [
      // One series per group (stacked)
      ...allGroups.map((group, index) => ({
        name: group,
        type: 'bar',
        stack: 'total',
        emphasis: {
          focus: 'series',
        },
        data: sortedWards.map(ward => stats.byWardCondition?.[ward]?.[group] || 0),
        itemStyle: {
          color: getChartColor(index),
        },
        label: {
          show: false,
        },
      })),
      // Total label (invisible bar just for showing total)
      {
        name: 'Total',
        type: 'bar',
        stack: 'total',
        itemStyle: {
          color: 'transparent',
        },
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          fontWeight: 'bold',
          formatter: (params) => {
            const ward = sortedWards[params.dataIndex];
            return stats.byWard?.[ward] || 0;
          },
        },
        data: sortedWards.map(() => 0), // Zero values, just for label
      },
    ],
  };
  // ============ EDIT END: Stacked bar chart by ward and group ============

  // ============ EDIT START: Dynamic conditions from data (2026-01-28) ============
  // Get all unique conditions/groups dynamically from the data
  const allConditions = Object.keys(stats.byCondition || {});
  
  // Get all unique labels across all conditions
  const allLabels = [...new Set(
    allConditions.flatMap(condition => 
      Object.keys(stats.byLabelCondition?.[condition] || {})
    )
  )].sort();

  // Get sorted sites by total count (descending)
  const sortedSites = Object.keys(stats.bySite || {})
    .sort((a, b) => (stats.bySite?.[b] || 0) - (stats.bySite?.[a] || 0));
  // ============ EDIT END: Dynamic conditions from data ============

  /**
   * Horizontal Stacked Bar Chart - Recruitment by Site & Group
   * Shows recruitment count by site, stacked by group
   */
  const siteChartOption = {
    title: {
      text: 'Recruitment by Site & Group',
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
      formatter: (params) => {
        let tooltip = `<strong>Site: ${params[0].axisValue}</strong><br/>`;
        let total = 0;
        params.forEach(p => {
          if (p.value > 0) {
            tooltip += `${p.marker} ${p.seriesName}: ${p.value}<br/>`;
            total += p.value;
          }
        });
        tooltip += `<strong>Total: ${total}</strong>`;
        return tooltip;
      },
    },
    legend: {
      data: allConditions,
      bottom: '0%',
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '12%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: 'Subjects',
    },
    yAxis: {
      type: 'category',
      data: sortedSites,
      axisLabel: {
        fontSize: 11,
      },
    },
    series: [
      // One series per group (stacked)
      ...allConditions.map((group, index) => ({
        name: group,
        type: 'bar',
        stack: 'total',
        emphasis: {
          focus: 'series',
        },
        data: sortedSites.map(site => stats.bySiteCondition?.[site]?.[group] || 0),
        itemStyle: {
          color: getChartColor(index),
        },
        label: {
          show: false,
        },
      })),
      // Total label (invisible bar just for showing total)
      {
        name: 'Total',
        type: 'bar',
        stack: 'total',
        itemStyle: {
          color: 'transparent',
        },
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          fontWeight: 'bold',
          formatter: (params) => {
            const site = sortedSites[params.dataIndex];
            return stats.bySite?.[site] || 0;
          },
        },
        data: sortedSites.map(() => 0), // Zero values, just for label
      },
    ],
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
          itemStyle: { color: getChartColor(index) },
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
      headerName: 'Group',
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

        {/* ============ EDIT START: Dynamic group cards (2026-01-28) ============ */}
        {/* Dynamically render cards for each group in the data */}
        {Object.entries(stats.byCondition || {}).map(([group, count], index) => (
          <Grid item xs={12} sm={6} md={3} key={group}>
            <Card elevation={2}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  {group} Subjects
                </Typography>
                <Typography variant="h3" sx={{ color: getChartColor(index) }}>
                  {count}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Group: {group}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {/* ============ EDIT END: Dynamic group cards ============ */}

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
        {/* Group Distribution Pie Chart */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2 }}>
            {stats.total > 0 ? (
              <ReactECharts
                option={conditionPieChartOption}
                style={{ height: '300px', width: '100%' }}
                opts={{ renderer: 'canvas' }}
                notMerge={true}
              />
            ) : (
              <Box
                sx={{
                  height: '300px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  Group Distribution
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No data available for selected filters
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Label Distribution Bar Chart */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2 }}>
            {Object.keys(stats.byLabel || {}).length > 0 ? (
              <ReactECharts
                option={labelBarChartOption}
                style={{ height: '300px', width: '100%' }}
                opts={{ renderer: 'canvas' }}
                notMerge={true}
              />
            ) : (
              <Box
                sx={{
                  height: '300px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  Label Distribution
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No data available for selected filters
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Ward Distribution Bar Chart */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2 }}>
            {sortedWards.length > 0 ? (
              <ReactECharts
                option={wardBarChartOption}
                style={{ height: '300px', width: '100%' }}
                opts={{ renderer: 'canvas' }}
                notMerge={true}
              />
            ) : (
              <Box
                sx={{
                  height: '300px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  Recruitment by Ward & Group
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No data available for selected filters
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Recruitment by Site Chart */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            {sortedSites.length > 0 ? (
              <ReactECharts
                option={siteChartOption}
                style={{ height: '320px', width: '100%' }}
                opts={{ renderer: 'canvas' }}
                notMerge={true}
              />
            ) : (
              <Box
                sx={{
                  height: '320px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  Recruitment by Site & Group
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No data available for selected filters
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Recruitment Overview Radar Chart */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            {stats.total > 0 ? (
              <ReactECharts
                option={recruitmentRadarOption}
                style={{ height: '320px', width: '100%' }}
                opts={{ renderer: 'canvas' }}
                notMerge={true}
              />
            ) : (
              <Box
                sx={{
                  height: '320px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                  Recruitment Overview
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No data available for selected filters
                </Typography>
              </Box>
            )}
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
