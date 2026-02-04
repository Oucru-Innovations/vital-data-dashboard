/**
 * TrackingCurrent.jsx - Current Recruitment Tracking Page
 *
 * This page displays current/active recruitment data with patient-level details
 * including label information from the FHIR ResearchSubject and Patient resources.
 *
 * KEY FEATURES:
 * =============
 * - Patient-level recruitment details table with label information
 * - Summary statistics cards (total enrolled, by group, by label)
 * - Hierarchical filtering: Study → Site → Ward → Group
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

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  LinearProgress,
  Tooltip,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useSelector, useDispatch } from 'react-redux';
import ReactECharts from 'echarts-for-react';

// Layout components
import Footer from '../../components/toolbars/Footer';

// Shared filter components
import { SiteSelection, WardSelection, ConditionFilter, GroupFilter } from '../../components/filters';

// Redux state management
import {
  setStudy,
  selectCurrentSite,
  selectCurrentWard,
  selectCurrentCondition,
  selectCurrentStudy,
  selectCurrentGroup,
} from '../../store/studySlice';

// FHIR service for studies list and API calls
import {
  getProcessedStudies,
  isDevelopmentMode,
  getCurrentRecruitmentData,
  getRecruitmentDetail,
} from '../../services/fhirService';

/**
 * Extract ALL labels from VitalPatient extension
 * A patient can have multiple labels (multiple dictionary extensions with key="label")
 *
 * @param {Object} vitalPatient - The linked VitalPatient resource
 * @returns {string[]} Array of label values (e.g., ["cap-1", "cap-2"]) or ["N/A"] if none
 */
const extractLabels = (vitalPatient) => {
  if (!vitalPatient?.extension) return ['N/A'];

  const labels = [];

  // Find ALL dictionary extensions (there can be multiple for multiple labels)
  const dictionaryExts = vitalPatient.extension.filter(
    ext => ext.url === 'https://vital-fhir.oucru.org/StructureDefinition/dictionary'
  );

  dictionaryExts.forEach(dictionaryExt => {
    if (!dictionaryExt?.extension) return;

    const keyExt = dictionaryExt.extension.find(e => e.url === 'key');
    const valueExt = dictionaryExt.extension.find(e => e.url === 'value');

    if (keyExt?.valueString === 'label' && valueExt?.valueString) {
      labels.push(valueExt.valueString);
    }
  });

  return labels.length > 0 ? labels : ['N/A'];
};

/**
 * Extract condition from ResearchSubject extension
 * @param {Object} resource - The ResearchSubject resource
 * @returns {string} The condition (CAP/VAP) or "Unknown"
 */
const extractCondition = (resource) => {
  if (!resource?.extension) return [];

  const conditionExt = resource.extension.filter(
    ext => ext.url === 'https://vital-fhir.oucru.org/StructureDefinition/condition' ||
      ext.url?.includes('/condition')
  );

  return conditionExt?.map(ext => ext.valueCodeableConcept?.text) || [];
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
  // Extract ward code from "Organization/WardHTDED" or "Organization/HTDED" format
  const match = orgRef.match(/Organization\/(?:Ward)?(.+)/);
  return match ? match[1] : null;
};

/**
 * Extract site (hospital) code from managingOrganization reference
 * Site is derived from the ward organization reference
 *
 * Organization reference format: "Organization/WardXXXYY"
 * Where XXX = site/hospital code (e.g., "HTD", "NTTH")
 *       YY = ward code within that site (e.g., "ED" = Emergency Department)
 *
 * SITE CODE PATTERNS:
 * - HTD: Hospital for Tropical Diseases (3 chars)
 * - NTTH: Nguyen Thi Thap Hospital (4 chars)
 * - NTT: Alternative for NTTH (3 chars)
 *
 * The function extracts uppercase letters before lowercase letters or "ED"/"ICU" suffixes.
 *
 * @param {Object} subject - The subject Patient resource
 * @returns {string} The site code or "Unknown"
 */
const extractSite = (subject) => {
  const orgRef = subject?.managingOrganization?.reference || '';

  // Extract ward code from "Organization/WardXXXYY" format
  const wardMatch = orgRef.match(/Organization\/Ward(.+)/i);
  if (wardMatch) {
    const fullWardCode = wardMatch[1];

    // Extract site code: uppercase letters at the start before common ward suffixes
    // e.g., "HTDED" → "HTD", "HTDNhiemD" → "HTD", "NTTHED" → "NTTH"
    // Look for pattern: uppercase letters followed by (ED|ICU|NhiemD|lowercase)
    const siteMatch = fullWardCode.match(/^([A-Z]+?)(?:ED|ICU|Nhiem|[a-z]|$)/i);
    if (siteMatch) {
      return siteMatch[1].toUpperCase();
    }

    // Fallback: take first 3-4 uppercase characters
    const uppercaseMatch = fullWardCode.match(/^([A-Z]{3,4})/);
    if (uppercaseMatch) {
      return uppercaseMatch[1];
    }
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
 * A patient can have MULTIPLE labels, so we store both:
 * - label: First label for display in table
 * - labels: Array of all labels for stats calculation
 *
 * @param {Object} bundle - The FHIR Bundle from mockLabel.json
 * @returns {Array} Processed rows for DataGrid
 */
const processLabelData = (bundle) => {
  if (!bundle?.entry) return [];

  return bundle.entry.map((entry, index) => {
    const resource = entry.resource;
    const subject = resource.subject;
    const linkedPatient = subject?.link?.[0]?.other;
    const allLabels = extractLabels(linkedPatient);

    return {
      id: index,
      subjectId: resource.id,
      studyId: studyId,
      siteCode: siteCode,
      screeningName: subject?.name?.[0]?.given?.[0] || 'N/A',
      condition: extractCondition(resource),
      label: allLabels.join(', '),    // Display: comma-separated for table
      labels: allLabels,               // Array: for stats calculation
      status: resource.status || 'Unknown',
      site: extractSite(subject),
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

  if (group) {
    filteredEntries = filteredEntries.filter(entry => {
      const groupExt = entry.resource?.extension?.filter(
        ext => ext.url === 'https://vital-fhir.oucru.org/StructureDefinition/comparisonGroup'
      );
      const groupText = groupExt?.map(ext => ext.valueId);
      return groupText.includes(group);
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
  const currentStudy = useSelector(selectCurrentStudy);
  const currentSite = useSelector(selectCurrentSite);
  const currentWard = useSelector(selectCurrentWard);
  const currentCondition = useSelector(selectCurrentCondition);
  const currentGroup = useSelector(selectCurrentGroup);

  // Local state
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [studies, setStudies] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState(() => {
    return localStorage.getItem('selectedStudyCode') || '';
  });

  // Summary statistics
  // ============ EDIT START: Dynamic initial state - no hard-coded groups (2026-01-28) ============
  const [stats, setStats] = useState({
    total: 0,
    byGroup: {},      // Will be populated dynamically with any groups from data
    byLabel: {},
    byStatus: {},
    bySite: {},           // Site totals
    byWard: {},
    byLabelCondition: {}, // Will be populated dynamically with any groups from data
    byWardCondition: {},  // Ward → Group breakdown for stacked bar chart
    bySiteCondition: {},  // Site → Group breakdown for stacked bar chart
    byWardLabel: {},      // Ward → Label breakdown for hierarchical filtering
    bySiteLabel: {},      // Site → Label breakdown for hierarchical filtering
    labelToCondition: {}, // Map label to its parent condition
  });
  // ============ EDIT END: Dynamic initial state ============

  // ============ EDIT START: Study targets and label hierarchy (2026-02-04) ============
  /**
   * Study targets state - loaded from ResearchStudy resource
   * Contains recruitment targets for overall and per-group
   */
  const [studyTargets, setStudyTargets] = useState({
    totalTarget: 0,           // recruitment.targetNumber
    byGroup: {},              // Group name → target number (from comparisonGroup.description)
    labelHierarchy: [],       // Multi-level labels from ext-multiple-value extension
  });
  // ============ EDIT END: Study targets and label hierarchy ============

  // ============ EDIT START: Chart filter selections (2026-02-04) ============
  /**
   * Chart filter selections - allows users to select which items to display in charts
   * These are multi-select filters for ward and site charts
   *
   * HIERARCHICAL SELECTION:
   * - Groups (CAP, VAP) are parent nodes
   * - Labels (cap-1, cap-2, vap-1, vap-2) are child nodes
   * - Selecting a parent selects all its children
   * - Chart displays data by labels (more granular)
   */
  const [selectedWardsForChart, setSelectedWardsForChart] = useState([]);
  const [selectedLabelsForWardChart, setSelectedLabelsForWardChart] = useState([]); // Labels for hierarchical filtering
  const [selectedSitesForChart, setSelectedSitesForChart] = useState([]);
  const [selectedLabelsForSiteChart, setSelectedLabelsForSiteChart] = useState([]); // Labels for hierarchical filtering

  // Chart type selection - allows switching between bar and pie charts
  const [wardChartType, setWardChartType] = useState('bar'); // 'bar' (labels), 'group' (groups), or 'pie'
  const [siteChartType, setSiteChartType] = useState('bar'); // 'bar' (labels), 'group' (groups), or 'pie'
  // ============ EDIT END: Chart filter selections ============

  /**
   * Load study data to get recruitment targets and label definitions
   * Parses the ResearchStudy resource for:
   * - recruitment.targetNumber: Total recruitment target
   * - comparisonGroup[].description: Per-group targets (number stored in description)
   * - ext-multiple-value extension: Multi-level label hierarchy
   */
  const loadStudyData = useCallback(async (studyCode) => {
    try {
      if (!studyCode) return null;

      console.log(`[TrackingCurrent] Loading study data for: ${studyCode}`);

      // Load study mock data (in development mode)
      // TODO: In production, fetch from FHIR API: GET /ResearchStudy/{studyId}
      const studyModule = await import('../../mockData/fhir/MockStudy13NV.json');
      const studyData = studyModule.default || studyModule;

      // Extract recruitment target
      const totalTarget = studyData.recruitment?.targetNumber || 0;

      // Extract per-group targets from comparisonGroup
      // The target is stored in the 'description' field as a number
      const byGroup = {};
      if (studyData.comparisonGroup) {
        studyData.comparisonGroup.forEach(group => {
          const groupName = group.name;
          const target = typeof group.description === 'number' ? group.description : parseInt(group.description, 10);
          if (groupName && !isNaN(target)) {
            byGroup[groupName] = target;
          }
        });
      }

      // Extract multi-level label hierarchy from ext-multiple-value extension
      const labelHierarchy = [];
      const extMultipleValue = studyData.extension?.find(
        ext => ext.url === 'https://vital-fhir.oucru.org/StructureDefinition/ext-multiple-value'
      );
      if (extMultipleValue?.extension) {
        extMultipleValue.extension.forEach(labelExt => {
          if (labelExt.url === 'label' && labelExt.valueCodeableConcept) {
            const code = labelExt.valueCodeableConcept.coding?.[0]?.code || '';
            const text = labelExt.valueCodeableConcept.text || '';
            // Parse hierarchical code: "CAP.serverity.cap-1" or "VAP.vap-1"
            const parts = code.split('.');
            labelHierarchy.push({
              code,
              text,
              group: parts[0] || '',           // e.g., "CAP" or "VAP"
              category: parts.length > 2 ? parts[1] : null, // e.g., "serverity" or null
              label: parts[parts.length - 1] || '',  // e.g., "cap-1" or "vap-1"
            });
          }
        });
      }

      const targets = { totalTarget, byGroup, labelHierarchy };
      console.log('[TrackingCurrent] Loaded study targets:', targets);
      setStudyTargets(targets);
      return targets;

    } catch (error) {
      console.error('[TrackingCurrent] Error loading study data:', error);
      return null;
    }
  }, []);

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
      const data = await getRecruitmentDetail({
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
        group: currentGroup || null,
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

      setData(data);

    } catch (error) {
      console.error('[TrackingCurrent] Error loading recruitment data:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [loadMockData, loadFromAPI, currentSite, currentWard, currentGroup]);

  /**
   * Load studies list for dropdown
   */
  const loadStudies = useCallback(async () => {
    try {
      // if (isDevelopmentMode()) {
      const studyList = await getProcessedStudies();
      setStudies(studyList);
      // }
    } catch (error) {
      console.error('[TrackingCurrent] Error loading studies:', error);
    }
  }, []);

  /**
   * Process and filter data when mockData or filters change
   */
  useEffect(() => {
    if (!data) return;

    // Process the pre-filtered data into table rows
    const processed = processLabelData(data);
    setTableData(processed);

    console.log(`[TrackingCurrent] Processed ${processed.length} rows for display`);

    // ============ EDIT START: Fully dynamic stats calculation (2026-01-28) ============
    // Calculate statistics - no hard-coded groups, all dynamic from data
    const newStats = {
      total: processed.length,
      byGroup: {},        // Dynamically populated (now called "Group")
      byLabel: {},
      byStatus: {},
      bySite: {},             // Site totals
      byWard: {},
      byLabelCondition: {},   // Dynamically populated
      byWardCondition: {},    // Ward → Group breakdown for stacked bar chart
      bySiteCondition: {},    // Site → Group breakdown for stacked bar chart
      byWardLabel: {},        // Ward → Label breakdown for hierarchical filtering
      bySiteLabel: {},        // Site → Label breakdown for hierarchical filtering
      labelToCondition: {},   // Map label to its parent condition (e.g., "cap-1" → "CAP")
    };

    processed.forEach(row => {
      // Count by condition/group (dynamic - any condition from data)
      const condition = row.condition || 'Unknown';
      const labels = row.labels || ['N/A']; // Array of labels (patient can have multiple)
      const site = row.site || 'Unknown';
      const ward = row.ward || 'Unknown';

      // Count by condition (once per patient)
      newStats.byCondition[condition] = (newStats.byCondition[condition] || 0) + 1;

      // Count by status (once per patient)
      newStats.byStatus[row.status] = (newStats.byStatus[row.status] || 0) + 1;

      // Count by site (once per patient)
      newStats.bySite[site] = (newStats.bySite[site] || 0) + 1;

      // Count by site AND condition (once per patient)
      if (!newStats.bySiteCondition[site]) {
        newStats.bySiteCondition[site] = {};
      }
      newStats.bySiteCondition[site][condition] =
        (newStats.bySiteCondition[site][condition] || 0) + 1;

      // Count by ward (once per patient)
      newStats.byWard[ward] = (newStats.byWard[ward] || 0) + 1;

      // Count by ward AND condition (once per patient)
      if (!newStats.byWardCondition[ward]) {
        newStats.byWardCondition[ward] = {};
      }
      newStats.byWardCondition[ward][condition] =
        (newStats.byWardCondition[ward][condition] || 0) + 1;

      // Process EACH label (patient can have multiple labels)
      labels.forEach(label => {
        // Count by label (each label counted separately)
        newStats.byLabel[label] = (newStats.byLabel[label] || 0) + 1;

        // Map label to its parent condition
        if (label !== 'N/A') {
          newStats.labelToCondition[label] = condition;
        }

        // Count by site AND label (for hierarchical filtering)
        if (!newStats.bySiteLabel[site]) {
          newStats.bySiteLabel[site] = {};
        }
        newStats.bySiteLabel[site][label] =
          (newStats.bySiteLabel[site][label] || 0) + 1;

        // Count by ward AND label (for hierarchical filtering)
        if (!newStats.byWardLabel[ward]) {
          newStats.byWardLabel[ward] = {};
        }
        newStats.byWardLabel[ward][label] =
          (newStats.byWardLabel[ward][label] || 0) + 1;

        // Count labels grouped by condition (for label-condition chart)
        if (!newStats.byLabelCondition[condition]) {
          newStats.byLabelCondition[condition] = {};
        }
        newStats.byLabelCondition[condition][label] =
          (newStats.byLabelCondition[condition][label] || 0) + 1;
      });
    });

    setStats(newStats);
    // ============ EDIT END: Fully dynamic stats calculation ============

  }, [data]); // Only re-process when data changes (filtering is done at load time)

  // Initial data load
  // Uses loadRecruitmentData which automatically chooses between mock (dev) and API (prod)
  useEffect(() => {
    loadRecruitmentData();
    loadStudies();
  }, [loadRecruitmentData, loadStudies]);

  // Load study targets when selectedStudy changes or on initial load
  useEffect(() => {
    if (selectedStudy) {
      loadStudyData(selectedStudy);
    }
  }, [selectedStudy, loadStudyData]);

  // ============ EDIT START: Initialize chart selections when data changes (2026-02-04) ============
  // When stats change, initialize ward and site selections
  useEffect(() => {
    const allWards = Object.keys(stats.byWard || {});
    const allSites = Object.keys(stats.bySite || {});

    // Initialize with all items selected (or keep current selection if valid)
    setSelectedWardsForChart(prev =>
      prev.length > 0 && prev.every(w => allWards.includes(w)) ? prev : allWards
    );
    setSelectedSitesForChart(prev =>
      prev.length > 0 && prev.every(s => allSites.includes(s)) ? prev : allSites
    );
  }, [stats.byWard, stats.bySite]);
  // ============ EDIT END: Initialize chart selections when data changes ============

  /**
   * Handle study selection change
   * Also loads study targets when a study is selected
   */
  const handleStudyChange = (event) => {
    const studyCode = event.target.value;
    setSelectedStudy(studyCode);
    localStorage.setItem('selectedStudyCode', studyCode);

    const selectedStudyObj = studies.find(s => s.studyCode === studyCode);
    if (selectedStudyObj) {
      dispatch(setStudy(selectedStudyObj));
    }

    // Load study targets when study is selected
    if (studyCode) {
      loadStudyData(studyCode);
    } else {
      // Clear targets when no study selected
      setStudyTargets({ totalTarget: 0, byGroup: {}, labelHierarchy: [] });
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
  const getGroupColor = (group) => {
    const groupList = Object.keys(stats.byGroup || {});
    const index = groupList.indexOf(group);
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
  const groupPieChartOption = {
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
        data: Object.entries(stats.byGroup || {}).map(([group, count], index) => ({
          value: count,
          name: group,
          itemStyle: { color: getChartColor(index) },
        })),
      },
    ],
  };
  // ============ EDIT END: Dynamic group pie chart ============

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
  // Get all wards sorted by total count (descending)
  const allWardsAvailable = Object.keys(stats.byWard || {})
    .sort((a, b) => (stats.byWard?.[b] || 0) - (stats.byWard?.[a] || 0));


  // Get all unique groups for the ward chart
  const allGroups = Object.keys(stats.byCondition || {});

  // Build hierarchical structure: group -> labels
  // Combines: 1) Study-defined labels (from study definition), 2) Data-derived labels (from actual data)
  // This ensures ALL labels from study definition are shown, even if they have 0 count
  const labelHierarchy = useMemo(() => {
    const hierarchy = {};

    // First, add ALL labels from study definition (most accurate source)
    // This includes labels with 0 count (like cap-3 if no patients have it yet)
    if (studyTargets.labelHierarchy && studyTargets.labelHierarchy.length > 0) {
      studyTargets.labelHierarchy.forEach(item => {
        const group = item.group;
        const label = item.label;
        if (group && label) {
          if (!hierarchy[group]) hierarchy[group] = [];
          if (!hierarchy[group].includes(label)) {
            hierarchy[group].push(label);
          }
        }
      });
    }

    // Then, add any labels from data that aren't already in ANY group from study definition
    // This handles cases where data has labels not defined in study
    allGroups.forEach(group => {
      if (!hierarchy[group]) hierarchy[group] = [];
    });

    // Get all labels already assigned to any group (from study definition)
    const allAssignedLabels = new Set(Object.values(hierarchy).flat());

    // Add labels from data ONLY if they're not already in any group
    // This prevents duplicates when data has mismatched condition/label (e.g., patient with CAP condition but vap-1 label)
    Object.keys(stats.byLabel || {}).forEach(label => {
      if (label === 'N/A') return;
      if (allAssignedLabels.has(label)) return; // Skip if already assigned from study definition

      const group = stats.labelToCondition?.[label];
      if (group && hierarchy[group]) {
        hierarchy[group].push(label);
        allAssignedLabels.add(label);
      }
    });

    // Sort labels within each group
    Object.keys(hierarchy).forEach(group => {
      hierarchy[group].sort();
    });

    return hierarchy;
  }, [studyTargets.labelHierarchy, allGroups, stats.byLabel, stats.labelToCondition]);

  // Get ALL labels from hierarchy (includes study-defined labels with 0 count)
  const allLabelsFromHierarchy = useMemo(() => {
    return Object.values(labelHierarchy).flat().sort();
  }, [labelHierarchy]);

  // Initialize label selections when hierarchy changes (includes study-defined labels)
  useEffect(() => {
    if (allLabelsFromHierarchy.length > 0) {
      // Initialize with all labels selected (or keep current if all are valid)
      setSelectedLabelsForWardChart(prev =>
        prev.length > 0 && prev.every(l => allLabelsFromHierarchy.includes(l)) ? prev : allLabelsFromHierarchy
      );
      setSelectedLabelsForSiteChart(prev =>
        prev.length > 0 && prev.every(l => allLabelsFromHierarchy.includes(l)) ? prev : allLabelsFromHierarchy
      );
    }
  }, [allLabelsFromHierarchy]);

  // ============ EDIT START: Filter wards and groups based on user selection (2026-02-04) ============
  // Filter to only selected wards (maintain sort order)
  const filteredWardsForChart = allWardsAvailable.filter(w => selectedWardsForChart.includes(w));
  // Filter to only selected labels for ward chart (using all labels from hierarchy, including study-defined)
  const filteredLabelsForWardChart = allLabelsFromHierarchy.filter(l => selectedLabelsForWardChart.includes(l));
  // ============ EDIT END: Filter wards and groups based on user selection ============

  /**
   * Horizontal Stacked Bar Chart - Ward Distribution by Label (Hierarchical)
   * Shows recruitment count by hospital ward, stacked by individual labels
   * Uses label-level data for more granular filtering
   */
  const wardBarChartByLabelOption = {
    title: {
      text: 'Recruitment by Ward & Label',
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 'bold' },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
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
      data: filteredLabelsForWardChart,
      bottom: '0%',
      type: 'scroll',
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '15%',
      top: '15%',
      containLabel: true,
    },
    xAxis: { type: 'value', name: 'Subjects' },
    yAxis: {
      type: 'category',
      data: filteredWardsForChart,
      axisLabel: { fontSize: 11 },
    },
    series: [
      // One series per selected label (stacked)
      ...filteredLabelsForWardChart.map((label, index) => ({
        name: label,
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: filteredWardsForChart.map(ward => stats.byWardLabel?.[ward]?.[label] || 0),
        itemStyle: {
          color: getChartColor(allLabelsFromHierarchy.indexOf(label)), // Consistent colors
        },
        label: { show: false },
      })),
      // Total label
      {
        name: 'Total',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: 'transparent' },
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          fontWeight: 'bold',
          formatter: (params) => {
            const ward = filteredWardsForChart[params.dataIndex];
            return filteredLabelsForWardChart.reduce(
              (sum, l) => sum + (stats.byWardLabel?.[ward]?.[l] || 0), 0
            );
          },
        },
        data: filteredWardsForChart.map(() => 0),
      },
    ],
  };

  /**
   * Pie Chart - Ward Distribution by Label
   * Shows recruitment count by hospital ward as pie chart (using label-level data)
   */
  const wardPieChartOption = {
    title: {
      text: 'Recruitment by Ward & Label',
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 'bold' },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const { name, value, percent } = params;
        // Show label breakdown for this ward in tooltip
        const labelBreakdown = filteredLabelsForWardChart
          .map(label => `${label}: ${stats.byWardLabel?.[name]?.[label] || 0}`)
          .filter(item => !item.endsWith(': 0'))
          .join('<br/>');
        return `<strong>${name}</strong>: ${value} (${percent}%)<br/>${labelBreakdown || 'No data'}`;
      },
    },
    legend: {
      orient: 'horizontal',
      bottom: '0%',
      type: 'scroll',
    },
    series: [
      {
        name: 'Ward',
        type: 'pie',
        radius: ['30%', '60%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c}',
          fontSize: 11,
        },
        data: filteredWardsForChart.map((ward, index) => ({
          value: filteredLabelsForWardChart.reduce(
            (sum, label) => sum + (stats.byWardLabel?.[ward]?.[label] || 0), 0
          ),
          name: ward,
          itemStyle: { color: getChartColor(index) },
        })),
      },
    ],
  };

  /**
   * Horizontal Stacked Bar Chart - Ward Distribution by Group
   * Shows recruitment count by hospital ward, stacked by groups (CAP, VAP, etc.)
   * Less granular than label-based chart, shows only group-level breakdown
   */
  const wardBarChartByGroupOption = {
    title: {
      text: 'Recruitment by Ward & Group',
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 'bold' },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
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
      type: 'scroll',
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '12%',
      top: '15%',
      containLabel: true,
    },
    xAxis: { type: 'value', name: 'Subjects' },
    yAxis: {
      type: 'category',
      data: filteredWardsForChart,
      axisLabel: { fontSize: 11 },
    },
    series: [
      // One series per group (stacked)
      ...allGroups.map((group, index) => ({
        name: group,
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: filteredWardsForChart.map(ward => stats.byWardCondition?.[ward]?.[group] || 0),
        itemStyle: {
          color: getChartColor(index),
        },
        label: { show: false },
      })),
      // Total label
      {
        name: 'Total',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: 'transparent' },
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          fontWeight: 'bold',
          formatter: (params) => {
            const ward = filteredWardsForChart[params.dataIndex];
            return allGroups.reduce(
              (sum, g) => sum + (stats.byWardCondition?.[ward]?.[g] || 0), 0
            );
          },
        },
        data: filteredWardsForChart.map(() => 0),
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

  // Get all sites sorted by total count (descending)
  const allSitesAvailable = Object.keys(stats.bySite || {})
    .sort((a, b) => (stats.bySite?.[b] || 0) - (stats.bySite?.[a] || 0));

  // ============ EDIT START: Filter sites and groups based on user selection (2026-02-04) ============
  // Filter to only selected sites (maintain sort order)
  const filteredSitesForChart = allSitesAvailable.filter(s => selectedSitesForChart.includes(s));
  // Filter to only selected labels for site chart (hierarchical filtering)
  const filteredLabelsForSiteChart = allLabelsFromHierarchy.filter(l => selectedLabelsForSiteChart.includes(l));
  // ============ EDIT END: Filter sites and groups based on user selection ============
  // ============ EDIT END: Dynamic conditions from data ============

  /**
   * Horizontal Stacked Bar Chart - Site Distribution by Label (Hierarchical)
   * Shows recruitment count by site, stacked by individual labels
   * Uses label-level data for more granular filtering
   */
  const siteBarChartByLabelOption = {
    title: {
      text: 'Recruitment by Site & Label',
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 'bold' },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
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
      data: filteredLabelsForSiteChart,
      bottom: '0%',
      type: 'scroll',
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '15%',
      top: '15%',
      containLabel: true,
    },
    xAxis: { type: 'value', name: 'Subjects' },
    yAxis: {
      type: 'category',
      data: filteredSitesForChart,
      axisLabel: { fontSize: 11 },
    },
    series: [
      // One series per selected label (stacked)
      ...filteredLabelsForSiteChart.map((label, index) => ({
        name: label,
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: filteredSitesForChart.map(site => stats.bySiteLabel?.[site]?.[label] || 0),
        itemStyle: {
          color: getChartColor(allLabelsFromHierarchy.indexOf(label)), // Consistent colors
        },
        label: { show: false },
      })),
      // Total label
      {
        name: 'Total',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: 'transparent' },
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          fontWeight: 'bold',
          formatter: (params) => {
            const site = filteredSitesForChart[params.dataIndex];
            return filteredLabelsForSiteChart.reduce(
              (sum, l) => sum + (stats.bySiteLabel?.[site]?.[l] || 0), 0
            );
          },
        },
        data: filteredSitesForChart.map(() => 0),
      },
    ],
  };

  /**
   * Pie Chart - Site Distribution by Label
   * Shows recruitment count by site as pie chart (using label-level data)
   */
  const sitePieChartOption = {
    title: {
      text: 'Recruitment by Site & Label',
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 'bold' },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const { name, value, percent } = params;
        // Show label breakdown for this site in tooltip
        const labelBreakdown = filteredLabelsForSiteChart
          .map(label => `${label}: ${stats.bySiteLabel?.[name]?.[label] || 0}`)
          .filter(item => !item.endsWith(': 0'))
          .join('<br/>');
        return `<strong>${name}</strong>: ${value} (${percent}%)<br/>${labelBreakdown || 'No data'}`;
      },
    },
    legend: {
      orient: 'horizontal',
      bottom: '0%',
      type: 'scroll',
    },
    series: [
      {
        name: 'Site',
        type: 'pie',
        radius: ['30%', '60%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c}',
          fontSize: 11,
        },
        data: filteredSitesForChart.map((site, index) => ({
          value: filteredLabelsForSiteChart.reduce(
            (sum, label) => sum + (stats.bySiteLabel?.[site]?.[label] || 0), 0
          ),
          name: site,
          itemStyle: { color: getChartColor(index) },
        })),
      },
    ],
  };

  /**
   * Horizontal Stacked Bar Chart - Site Distribution by Group
   * Shows recruitment count by site, stacked by groups (CAP, VAP, etc.)
   * Less granular than label-based chart, shows only group-level breakdown
   */
  const siteBarChartByGroupOption = {
    title: {
      text: 'Recruitment by Site & Group',
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 'bold' },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
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
      data: allGroups,
      data: allGroups,
      bottom: '0%',
      type: 'scroll',
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '12%',
      top: '15%',
      containLabel: true,
    },
    xAxis: { type: 'value', name: 'Subjects' },
    yAxis: {
      type: 'category',
      data: filteredSitesForChart,
      axisLabel: { fontSize: 11 },
    },
    series: [
      // One series per group (stacked)
      ...allGroups.map((group, index) => ({
      ...allGroups.map((group, index) => ({
        name: group,
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: filteredSitesForChart.map(site => stats.bySiteCondition?.[site]?.[group] || 0),
        itemStyle: {
          color: getChartColor(index),
        },
        label: { show: false },
      })),
      // Total label
      {
        name: 'Total',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: 'transparent' },
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          fontWeight: 'bold',
          formatter: (params) => {
            const site = filteredSitesForChart[params.dataIndex];
            return allGroups.reduce(
              (sum, g) => sum + (stats.bySiteCondition?.[site]?.[g] || 0), 0
            );
          },
        },
        data: filteredSitesForChart.map(() => 0),
      },
    ],
  };

  /**
   * Radar Chart - Recruitment Overview
   * Shows a multi-dimensional view of recruitment metrics (dynamic groups)
   */
  // ============ EDIT START: Dynamic radar chart (2026-01-28) ============
  // Build radar indicators dynamically based on groups and labels
  const radarIndicators = [
    {
      name: 'Total Count',
      max: Math.max(...allGroups.map(c => stats.byGroup?.[c] || 0)) * 1.2 || 10
    },
    ...allLabels.slice(0, 3).map((label, idx) => ({
      name: `Label: ${label}`,
      max: Math.max(...allGroups.map(c => stats.byLabelGroup?.[c]?.[label] || 0)) * 1.5 || 10,
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
      data: allGroups,
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
        data: allGroups.map((group, index) => ({
          value: [
            stats.byGroup?.[group] || 0,
            ...allLabels.slice(0, 3).map(label => stats.byLabelGroup?.[group]?.[label] || 0),
            Object.keys(stats.byWard || {}).filter(w =>
              tableData.some(r => r.ward === w && r.group === group)
            ).length,
          ],
          name: group,
          itemStyle: { color: getChartColor(index) },
          areaStyle: { opacity: 0.3 },
        })),
      },
    ],
  };
  // ============ EDIT END: Dynamic radar chart ============

  // Table columns definition - descriptions are dynamic based on available data
  const columns = [
    {
      field: 'studyId',
      headerName: 'Study ID',
      width: 180,
      description: `Patient study identifier${selectedStudy ? ` (e.g., ${selectedStudy}-XXX-XXXX)` : ''}`,
    },
    {
      field: 'label',
      headerName: 'Label',
      width: 100,
      description: `Patient cohort label${allLabelsFromHierarchy.length > 0 ? ` (${allLabelsFromHierarchy.slice(0, 4).join(', ')}${allLabelsFromHierarchy.length > 4 ? ', ...' : ''})` : ''}`,
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
      field: 'group',
      headerName: 'Group',
      width: 100,
      description: `Patient group${Object.keys(labelHierarchy).length > 0 ? ` (${Object.keys(labelHierarchy).join(', ')})` : ''}`,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={getGroupColor(params.value)}
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

  console.log('stat got is ', stats);
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Current Recruitment Tracking
      </Typography>
      {/* <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Patient-level recruitment details with label information from FHIR data
      </Typography> */}
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
                    {study.studyCode}
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
              <GroupFilter />
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Summary Statistics Cards with Recruitment Targets */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Total Subjects Card - with target progress */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Recruitment
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h3" color="primary">
                  {stats.total}
                </Typography>
                {studyTargets.totalTarget > 0 && (
                  <Typography variant="h6" color="text.secondary">
                    / {studyTargets.totalTarget}
                  </Typography>
                )}
              </Box>
              {studyTargets.totalTarget > 0 ? (
                <>
                  <Tooltip title={`${Math.round((stats.total / studyTargets.totalTarget) * 100)}% of target`}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((stats.total / studyTargets.totalTarget) * 100, 100)}
                      sx={{ mt: 1, mb: 0.5, height: 8, borderRadius: 4 }}
                    />
                  </Tooltip>
                  <Typography variant="caption" color="text.secondary">
                    {Math.round((stats.total / studyTargets.totalTarget) * 100)}% of target
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Currently enrolled
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ============ EDIT START: Dynamic group cards with targets (2026-02-04) ============ */}
        {/* Dynamically render cards for each group with progress towards target */}
        {Object.entries(stats.byCondition || {}).map(([group, count], index) => {
          const target = studyTargets.byGroup?.[group] || 0;
          const percentage = target > 0 ? Math.round((count / target) * 100) : 0;
          return (
            <Grid item xs={12} sm={6} md={3} key={group}>
              <Card elevation={2}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    {group} Recruitment
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="h3" sx={{ color: getChartColor(index) }}>
                      {count}
                    </Typography>
                    {target > 0 && (
                      <Typography variant="h6" color="text.secondary">
                        / {target}
                      </Typography>
                    )}
                  </Box>
                  {target > 0 ? (
                    <>
                      <Tooltip title={`${percentage}% of ${group} target`}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(percentage, 100)}
                          sx={{
                            mt: 1,
                            mb: 0.5,
                            height: 8,
                            borderRadius: 4,
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getChartColor(index),
                            },
                          }}
                        />
                      </Tooltip>
                      <Typography variant="caption" color="text.secondary">
                        {percentage}% of target
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Group: {group}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
        {/* ============ EDIT END: Dynamic group cards with targets ============ */}

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

      {/* ============ EDIT START: Recruitment Progress Chart with Targets (2026-02-04) ============ */}
      {/* Recruitment Progress Chart - Shows progress towards targets for all groups */}
      {studyTargets.totalTarget > 0 && (
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recruitment Progress vs Targets
          </Typography>
          <ReactECharts
            option={{
              tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (params) => {
                  const param = params[0];
                  const groupName = param.axisValue;
                  const current = param.value;
                  const target = studyTargets.byGroup?.[groupName] || studyTargets.totalTarget;
                  const percentage = target > 0 ? Math.round((current / target) * 100) : 0;
                  return `<strong>${groupName}</strong><br/>
                    Current: ${current}<br/>
                    Target: ${target}<br/>
                    Progress: ${percentage}%`;
                },
              },
              grid: {
                left: '3%',
                right: '15%',
                bottom: '3%',
                top: '10%',
                containLabel: true,
              },
              xAxis: {
                type: 'value',
                max: (value) => Math.max(value.max, studyTargets.totalTarget) * 1.1,
                name: 'Subjects',
                axisLine: { show: true },
              },
              yAxis: {
                type: 'category',
                data: ['Total', ...Object.keys(studyTargets.byGroup || {})],
                axisLabel: { fontSize: 12, fontWeight: 'bold' },
              },
              series: [
                // Current recruitment (filled bars)
                {
                  name: 'Current',
                  type: 'bar',
                  data: [
                    {
                      value: stats.total,
                      itemStyle: {
                        color: '#1976d2',
                        borderRadius: [0, 4, 4, 0],
                      },
                    },
                    ...Object.keys(studyTargets.byGroup || {}).map((group, index) => ({
                      value: stats.byCondition?.[group] || 0,
                      itemStyle: {
                        color: getChartColor(index),
                        borderRadius: [0, 4, 4, 0],
                      },
                    })),
                  ],
                  barWidth: '50%',
                  label: {
                    show: true,
                    position: 'right',
                    formatter: (params) => {
                      const idx = params.dataIndex;
                      const current = params.value;
                      const target = idx === 0
                        ? studyTargets.totalTarget
                        : Object.values(studyTargets.byGroup || {})[idx - 1] || 0;
                      const percentage = target > 0 ? Math.round((current / target) * 100) : 0;
                      return `${current} / ${target} (${percentage}%)`;
                    },
                    fontSize: 11,
                    fontWeight: 'bold',
                  },
                  z: 2,
                },
                // Target markers (line marks)
                {
                  name: 'Target',
                  type: 'bar',
                  data: [
                    studyTargets.totalTarget,
                    ...Object.values(studyTargets.byGroup || {}),
                  ],
                  barWidth: '50%',
                  barGap: '-100%',
                  itemStyle: {
                    color: 'transparent',
                    borderColor: '#666',
                    borderWidth: 2,
                    borderType: 'dashed',
                    borderRadius: [0, 4, 4, 0],
                  },
                  z: 1,
                },
              ],
            }}
            style={{ height: `${Math.max(200, (Object.keys(studyTargets.byGroup || {}).length + 1) * 60)}px`, width: '100%' }}
            opts={{ renderer: 'canvas' }}
            notMerge={true}
          />
        </Paper>
      )}
      {/* ============ EDIT END: Recruitment Progress Chart with Targets ============ */}

      {/* ============ EDIT START: Multi-level Label Hierarchy Display (2026-02-04) ============ */}
      {/* Label Definitions - Shows hierarchical label structure from study */}
      {studyTargets.labelHierarchy && studyTargets.labelHierarchy.length > 0 && (
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Study Label Definitions
          </Typography>
          <Grid container spacing={2}>
            {/* Group labels by their parent group (CAP, VAP, etc.) */}
            {Object.entries(
              studyTargets.labelHierarchy.reduce((acc, labelItem) => {
                const group = labelItem.group || 'Other';
                if (!acc[group]) acc[group] = [];
                acc[group].push(labelItem);
                return acc;
              }, {})
            ).map(([group, labels]) => (
              <Grid item xs={12} md={6} key={group}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Chip
                        label={group}
                        color={getConditionColor(group)}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                      <Typography variant="subtitle2" color="text.secondary">
                        {labels.length} label{labels.length > 1 ? 's' : ''}
                      </Typography>
                    </Box>
                    {/* Group by category within each group */}
                    {Object.entries(
                      labels.reduce((acc, l) => {
                        const cat = l.category || 'default';
                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(l);
                        return acc;
                      }, {})
                    ).map(([category, categoryLabels]) => (
                      <Box key={category} sx={{ mb: 1.5 }}>
                        {category !== 'default' && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mb: 0.5,
                              color: 'text.secondary',
                              fontWeight: 'medium',
                              textTransform: 'capitalize',
                            }}
                          >
                            {category}:
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, pl: category !== 'default' ? 1 : 0 }}>
                          {categoryLabels.map((labelItem) => (
                            <Tooltip
                              key={labelItem.code}
                              title={
                                <Box>
                                  <Typography variant="body2">{labelItem.text}</Typography>
                                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                    Code: {labelItem.code}
                                  </Typography>
                                </Box>
                              }
                              arrow
                            >
                              <Chip
                                label={labelItem.label}
                                size="small"
                                variant="outlined"
                                color={getLabelColor(labelItem.label)}
                                sx={{ cursor: 'help' }}
                              />
                            </Tooltip>
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
      {/* ============ EDIT END: Multi-level Label Hierarchy Display ============ */}

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
                option={groupPieChartOption}
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

        {/* Recruitment Overview Radar Chart - moved to third column */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2 }}>
            {stats.total > 0 ? (
              <ReactECharts
                option={recruitmentRadarOption}
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
                  Recruitment Overview
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No data available for selected filters
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* ============ EDIT START: Ward Chart with Hierarchical Group/Label Selection (2026-02-04) ============ */}
        {/* Ward Distribution Chart - with hierarchical group/label selection */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Recruitment by Ward & Label
            </Typography>
            {/* Filter dropdowns */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              {/* Ward selection dropdown */}
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="ward-chart-ward-select-label">Select Wards</InputLabel>
                <Select
                  labelId="ward-chart-ward-select-label"
                  id="ward-chart-ward-select"
                  multiple
                  value={selectedWardsForChart}
                  onChange={(e) => setSelectedWardsForChart(e.target.value)}
                  input={<OutlinedInput label="Select Wards" />}
                  renderValue={(selected) => `${selected.length} ward${selected.length !== 1 ? 's' : ''}`}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 300, minWidth: 250 } } }}
                >
                  {allWardsAvailable.map((ward) => (
                    <MenuItem key={ward} value={ward}>
                      <Checkbox checked={selectedWardsForChart.includes(ward)} size="small" />
                      <ListItemText primary={ward} secondary={`${stats.byWard?.[ward] || 0} subjects`} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {/* Hierarchical Group/Label selection dropdown */}
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="ward-chart-label-select-label">Select Groups/Labels</InputLabel>
                <Select
                  labelId="ward-chart-label-select-label"
                  id="ward-chart-label-select"
                  multiple
                  value={selectedLabelsForWardChart}
                  onChange={(e) => setSelectedLabelsForWardChart(e.target.value)}
                  input={<OutlinedInput label="Select Groups/Labels" />}
                  renderValue={(selected) => `${selected.length} label${selected.length !== 1 ? 's' : ''}`}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 400, minWidth: 300 } } }}
                >
                  {/* Render hierarchical structure: groups as parents, labels as children */}
                  {/* Use Object.keys(labelHierarchy) to include all groups from study definition */}
                  {Object.keys(labelHierarchy).map((group) => {
                    const groupLabels = labelHierarchy[group] || [];
                    const allGroupLabelsSelected = groupLabels.length > 0 && groupLabels.every(l => selectedLabelsForWardChart.includes(l));
                    const someGroupLabelsSelected = groupLabels.some(l => selectedLabelsForWardChart.includes(l));
                    return (
                      <React.Fragment key={`group-fragment-${group}`}>
                        {/* Parent group item (toggles all children) */}
                        <MenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (allGroupLabelsSelected) {
                              setSelectedLabelsForWardChart(prev => prev.filter(l => !groupLabels.includes(l)));
                            } else {
                              setSelectedLabelsForWardChart(prev => [...new Set([...prev, ...groupLabels])]);
                            }
                          }}
                          sx={{ fontWeight: 'bold', bgcolor: 'action.hover' }}
                        >
                          <Checkbox
                            checked={allGroupLabelsSelected}
                            indeterminate={someGroupLabelsSelected && !allGroupLabelsSelected}
                            size="small"
                          />
                          <ListItemText
                            primary={group}
                            secondary={`${groupLabels.length} labels • ${stats.byCondition?.[group] || 0} subjects`}
                          />
                        </MenuItem>
                        {/* Child label items (indented under their parent group) */}
                        {groupLabels.map((label) => (
                          <MenuItem
                            key={`${group}-${label}`}
                            value={label}
                            sx={{ pl: 4 }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedLabelsForWardChart(prev =>
                                prev.includes(label)
                                  ? prev.filter(l => l !== label)
                                  : [...prev, label]
                              );
                            }}
                          >
                            <Checkbox checked={selectedLabelsForWardChart.includes(label)} size="small" />
                            <ListItemText
                              primary={label}
                              secondary={`${stats.byLabel?.[label] || 0} subjects`}
                            />
                          </MenuItem>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </Select>
              </FormControl>
              {/* Chart type selector */}
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="ward-chart-type-label">Chart Type</InputLabel>
                <Select
                  labelId="ward-chart-type-label"
                  id="ward-chart-type"
                  value={wardChartType}
                  onChange={(e) => setWardChartType(e.target.value)}
                  label="Chart Type"
                >
                  <MenuItem value="bar">Stacked (Labels)</MenuItem>
                  <MenuItem value="group">Stacked (Groups)</MenuItem>
                  <MenuItem value="pie">Pie Chart</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {/* Chart - uses label-based or group-based data depending on selection */}
            {filteredWardsForChart.length > 0 && (wardChartType === 'group' || filteredLabelsForWardChart.length > 0) ? (
              <ReactECharts
                option={
                  wardChartType === 'pie' ? wardPieChartOption :
                  wardChartType === 'group' ? wardBarChartByGroupOption :
                  wardBarChartByLabelOption
                }
                style={{ height: wardChartType === 'pie' ? '350px' : `${Math.max(250, filteredWardsForChart.length * 40)}px`, width: '100%' }}
                opts={{ renderer: 'canvas' }}
                notMerge={true}
              />
            ) : (
              <Box
                sx={{
                  height: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Select wards and labels to display chart
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        {/* ============ EDIT END: Ward Chart with Hierarchical Group/Label Selection ============ */}

        {/* ============ EDIT START: Site Chart with Hierarchical Group/Label Selection (2026-02-04) ============ */}
        {/* Recruitment by Site Chart - with hierarchical group/label selection */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Recruitment by Site & Label
            </Typography>
            {/* Filter dropdowns */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              {/* Site selection dropdown */}
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="site-chart-site-select-label">Select Sites</InputLabel>
                <Select
                  labelId="site-chart-site-select-label"
                  id="site-chart-site-select"
                  multiple
                  value={selectedSitesForChart}
                  onChange={(e) => setSelectedSitesForChart(e.target.value)}
                  input={<OutlinedInput label="Select Sites" />}
                  renderValue={(selected) => `${selected.length} site${selected.length !== 1 ? 's' : ''}`}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 300, minWidth: 280 } } }}
                >
                  {allSitesAvailable.map((site) => (
                    <MenuItem key={site} value={site} sx={{ minWidth: 250 }}>
                      <Checkbox checked={selectedSitesForChart.includes(site)} size="small" />
                      <ListItemText
                        primary={site}
                        secondary={`${stats.bySite?.[site] || 0} subjects`}
                        primaryTypographyProps={{ noWrap: false }}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {/* Hierarchical Group/Label selection dropdown */}
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="site-chart-label-select-label">Select Groups/Labels</InputLabel>
                <Select
                  labelId="site-chart-label-select-label"
                  id="site-chart-label-select"
                  multiple
                  value={selectedLabelsForSiteChart}
                  onChange={(e) => setSelectedLabelsForSiteChart(e.target.value)}
                  input={<OutlinedInput label="Select Groups/Labels" />}
                  renderValue={(selected) => `${selected.length} label${selected.length !== 1 ? 's' : ''}`}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 400, minWidth: 300 } } }}
                >
                  {/* Render hierarchical structure: groups as parents, labels as children */}
                  {/* Use Object.keys(labelHierarchy) to include all groups from study definition */}
                  {Object.keys(labelHierarchy).map((group) => {
                    const groupLabels = labelHierarchy[group] || [];
                    const allGroupLabelsSelected = groupLabels.length > 0 && groupLabels.every(l => selectedLabelsForSiteChart.includes(l));
                    const someGroupLabelsSelected = groupLabels.some(l => selectedLabelsForSiteChart.includes(l));
                    return (
                      <React.Fragment key={`site-group-fragment-${group}`}>
                        {/* Parent group item (toggles all children) */}
                        <MenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (allGroupLabelsSelected) {
                              setSelectedLabelsForSiteChart(prev => prev.filter(l => !groupLabels.includes(l)));
                            } else {
                              setSelectedLabelsForSiteChart(prev => [...new Set([...prev, ...groupLabels])]);
                            }
                          }}
                          sx={{ fontWeight: 'bold', bgcolor: 'action.hover' }}
                        >
                          <Checkbox
                            checked={allGroupLabelsSelected}
                            indeterminate={someGroupLabelsSelected && !allGroupLabelsSelected}
                            size="small"
                          />
                          <ListItemText
                            primary={group}
                            secondary={`${groupLabels.length} labels • ${stats.byCondition?.[group] || 0} subjects`}
                          />
                        </MenuItem>
                        {/* Child label items (indented under their parent group) */}
                        {groupLabels.map((label) => (
                          <MenuItem
                            key={`site-${group}-${label}`}
                            value={label}
                            sx={{ pl: 4 }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedLabelsForSiteChart(prev =>
                                prev.includes(label)
                                  ? prev.filter(l => l !== label)
                                  : [...prev, label]
                              );
                            }}
                          >
                            <Checkbox checked={selectedLabelsForSiteChart.includes(label)} size="small" />
                            <ListItemText
                              primary={label}
                              secondary={`${stats.byLabel?.[label] || 0} subjects`}
                            />
                          </MenuItem>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </Select>
              </FormControl>
              {/* Chart type selector */}
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="site-chart-type-label">Chart Type</InputLabel>
                <Select
                  labelId="site-chart-type-label"
                  id="site-chart-type"
                  value={siteChartType}
                  onChange={(e) => setSiteChartType(e.target.value)}
                  label="Chart Type"
                >
                  <MenuItem value="bar">Stacked (Labels)</MenuItem>
                  <MenuItem value="group">Stacked (Groups)</MenuItem>
                  <MenuItem value="pie">Pie Chart</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {/* Chart - uses label-based or group-based data depending on selection */}
            {filteredSitesForChart.length > 0 && (siteChartType === 'group' || filteredLabelsForSiteChart.length > 0) ? (
              <ReactECharts
                option={
                  siteChartType === 'pie' ? sitePieChartOption :
                  siteChartType === 'group' ? siteBarChartByGroupOption :
                  siteBarChartByLabelOption
                }
                style={{ height: siteChartType === 'pie' ? '350px' : `${Math.max(250, filteredSitesForChart.length * 50)}px`, width: '100%' }}
                opts={{ renderer: 'canvas' }}
                notMerge={true}
              />
            ) : (
              <Box
                sx={{
                  height: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Select sites and labels to display chart
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        {/* ============ EDIT END: Site Chart with Hierarchical Group/Label Selection ============ */}
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
          Total records: {data?.total || 0} |
          Last updated: {data?.meta?.lastUpdated || 'N/A'}
        </Typography>
      </Box>

      <Footer />
    </Box>
  );
};

export default TrackingCurrentPage;
