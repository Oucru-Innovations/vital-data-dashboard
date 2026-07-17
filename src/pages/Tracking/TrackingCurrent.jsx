/**
 * TrackingCurrent.jsx - Current Recruitment Tracking Page
 *
 * This page displays current/active recruitment data with patient-level details
 * including label information from the FHIR ResearchSubject and Participant resources.
 *
 * KEY FEATURES:
 * =============
 * - Participant-level recruitment details table with label information
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
 * - FHIR API: GET /ResearchSubject with _include for Participant data
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
  IconButton,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import { useSelector } from 'react-redux';
import ReactECharts from 'echarts-for-react';

// Layout components
import Footer from '../../components/toolbars/Footer';

// Shared filter components
import { StudySelection, SiteSelection, WardSelection, GroupFilter } from '../../components/filters';

// Redux state management
import {
  selectCurrentSite,
  selectCurrentWard,
  selectCurrentStudy,
  selectCurrentGroup,
} from '../../store/studySlice';

// FHIR service for studies list and API calls
import {
  isDevelopmentMode,
  // eslint-disable-next-line no-unused-vars -- merged from fhir-summary (7b7f4b0), may be used later
  getCurrentRecruitmentData,
  getRecruitmentDetail,
  getResearchStudy // Imported service
} from '../../services/fhirService';

// Shared chart color palette utilities
import {
  COLD_PANEL,
  getOrderedGroups,
  getChartColor,
  buildColorAssignments,
  NEUTRAL_LABEL_COLOR,
} from '../../utils/colorPalette';

/**
 * Extract the leaf label from a multi-level code (study label hierarchy).
 * MockStudy13NV uses dot-separated codes: "Group.Category.Label" or "Group.Label".
 * Examples: "CAP.serverity.cap-1" → "cap-1", "VAP.vap-1" → "vap-1".
 *
 * @param {string} code - Full hierarchical code from dictionary value
 * @returns {string} Leaf label (last segment)
 */

const labelOrder = ['N/A', 'mild-cap', 'severe-cap', 'no-vap+', 'vap+']

// Study13NV emits bare severity leaves ("mild"/"severe") instead of the
// canonical "mild-cap"/"severe-cap" used by labelOrder. Normalize once, here,
// at extraction time so every downstream stat/chart sees the same label.
// Only applied for Study13NV — other studies may legitimately use "mild"/"severe" as-is.
const LEAF_LABEL_ALIASES = { mild: 'mild-cap', severe: 'severe-cap' };
const STUDY_WITH_LEAF_ALIASES = '13NV';

const sortLabelsByOrder = (labelsArray) => {
  return labelsArray.sort((a, b) => {
    const idxA = labelOrder.indexOf(a);
    const idxB = labelOrder.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });
};

const getLeafLabel = (code, studyCode) => {
  if (!code || typeof code !== 'string') return code || '';
  let modifiedCode = code.trim();
  if (code.includes("CAP.triage")) {
    modifiedCode = code+"-cap"
  }
  const parts = modifiedCode.trim().split('.');
  const leaf = parts.length > 1 ? parts[parts.length - 1] : modifiedCode;
  return studyCode === STUDY_WITH_LEAF_ALIASES ? (LEAF_LABEL_ALIASES[leaf] || leaf) : leaf;
};

/**
 * Extract ALL labels from VitalPatient extension (dictionary with key="label").
 * Values are multi-level codes (e.g. "CAP.serverity.cap-1"); we extract the
 * children leaf only (e.g. "cap-1") to match MockStudy13NV label hierarchy.
 *
 * @param {Object} vitalPatient - The linked VitalPatient resource
 * @param {string} studyCode - Current study code (e.g. "13NV"), used to gate label aliasing
 * @returns {string[]} Array of leaf label values (e.g., ["cap-1", "cap-2", "cap-3"]) or ["N/A"] if none
 */
const extractLabels = (vitalPatient, studyCode) => {
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
      const leaf = getLeafLabel(valueExt.valueString, studyCode);
      if (leaf && !labels.includes(leaf)) labels.push(leaf);
    }
  });

  return labels.length > 0 ? sortLabelsByOrder(labels) : ['N/A'];
};

/**
 * Extract group from ResearchSubject extension (formerly condition)
 * @param {Object} resource - The ResearchSubject resource
 * @returns {string} The group (CAP/VAP) or "Unknown"
 */
// Modified to return an array of groups (e.g. ['VAP', 'VAP+'])
const extractGroup = (resource) => {
  if (!resource?.extension) return ['Unknown'];

  const groupExts = resource.extension.filter(
    ext => ext.url === 'https://vital-fhir.oucru.org/StructureDefinition/comparisonGroup'
  );

  if (groupExts.length > 0) {
    return groupExts.map(ext => ext.valueId).filter(Boolean);
  }

  return ['Unknown'];
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
    // const siteMatch = fullWardCode.match(/^([A-Z]+?)(?:ED|ICU|Nhiem|[a-z]|$)/);
    // if (siteMatch) {
    //   return siteMatch[1].toUpperCase();
    // }

    const uppercaseMatch = String(fullWardCode).match(/(HTD|NHTD|TVH|NTTH)/);
    // console.log('fullWardCode', uppercaseMatch);
    
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
 * @param {string} studyCode - Current study code (e.g. "13NV"), used to gate label aliasing
 * @returns {Array} Processed rows for DataGrid
 */
const processLabelData = (bundle, studyCode) => {
  if (!bundle?.entry) return [];

  return bundle.entry.map((entry, index) => {
    const resource = entry.resource;
    const subject = resource.subject;
    const linkedPatient = subject?.link?.[0]?.other;
    const allLabels = extractLabels(linkedPatient, studyCode);
    // Study ID from VitalPatient name (e.g. "13NV-003-0002-C") per commit fbec530
    const studyId = linkedPatient?.name?.[0]?.given?.[0] || (resource.study?.reference || '').split('/').pop() || 'N/A';
    const siteCode = extractSite(subject) || 'N/A';
    const groups = extractGroup(resource); // array: ['CAP'], ['VAP', 'VAP+'], etc.

    return {
      id: index,
      subjectId: resource.id,
      studyId,
      siteCode,
      screeningName: subject?.name?.[0]?.given?.[0] || 'N/A',
      groups,             // Store array for logic
      group: groups.join(', '), // Display string (comma separated)
      label: allLabels.join(', '),  // Display: comma-separated for table
      labels: allLabels,            // Array: for stats calculation
      status: resource.status || 'Unknown',
      site: extractSite(subject),
      ward: extractWard(subject) || 'Unknown',
      screeningDate: extractProgressDate(resource.progress, 'screening'),
      enrolledDate: extractProgressDate(resource.progress, 'on-study'),
      eligibleDate: extractProgressDate(resource.progress, 'eligible'),
      birthYear: subject?.birthDate || 'N/A',
    };
  });
};

/**
 * Get date range from last Monday to Today (inclusive)
 * "This week" usually refers to the reporting week starting from last Monday.
 * If today is Monday, it includes today.
 * @returns {Object} { start: Date, end: Date }
 */
const getDateRangeFromLastMonday = () => {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); // back to Monday
  monday.setHours(0, 0, 0, 0); // Start of Monday

  return { start: monday, end: today };
};

/**
 * Check if a date string is within a range
 * @param {string} dateStr - Date string (YYYY-MM-DD or ISO)
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {boolean}
 */
const isDateInRange = (dateStr, start, end) => {
  if (!dateStr || dateStr === 'N/A') return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
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

  // Filter by group (comparisonGroup) - match comparisonGroup extension valueId
  if (group) {
    filteredEntries = filteredEntries.filter(entry => {
      const groupExts = entry.resource?.extension?.filter(
        ext => ext.url === 'https://vital-fhir.oucru.org/StructureDefinition/comparisonGroup'
      ) || [];
      // Check if ANY of the patient's groups match the selected filter
      return groupExts.some(ext => ext.valueId === group);
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
  // Redux state for filters - StudySelection/SiteSelection/WardSelection/GroupFilter
  // own their own dispatches; this page just reads the resulting selections.
  const currentStudy = useSelector(selectCurrentStudy);
  const currentSite = useSelector(selectCurrentSite);
  const currentWard = useSelector(selectCurrentWard);
  const currentGroup = useSelector(selectCurrentGroup);

  // Study code derived from Redux (StudySelection owns fetching/persisting/dispatching it)
  const selectedStudy = currentStudy?.studyCode || '';

  // Local state
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [tableData, setTableData] = useState([]);
  // Real attained/total progress for the slow, per-patient reference-resolution loop in
  // getRecruitmentDetail's production-mode path (see fhirService.js). null when not fetching
  // or in mock mode (that path has no per-item loop, so no progress events are emitted).
  const [fetchProgress, setFetchProgress] = useState(null);

  // Summary statistics
  // ============ EDIT START: Dynamic initial state - no hard-coded groups (2026-01-28) ============
  const [stats, setStats] = useState({
    totalRecruitment: 0,
    byGroup: {},      // Will be populated dynamically with any groups from data
    byLabel: {},
    byStatus: {},
    bySite: {},           // Site totals
    byWard: {},
    byLabelGroup: {}, // Will be populated dynamically with any groups from data
    byWardGroup: {},  // Ward → Group breakdown for stacked bar chart
    bySiteGroup: {},  // Site → Group breakdown for stacked bar chart
    byWardLabel: {},      // Ward → Label breakdown for hierarchical filtering
    bySiteLabel: {},      // Site → Label breakdown for hierarchical filtering
    labelToGroup: {}, // Map label to its parent group
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
  // ============ EDIT START: Percentage-stacked flip toggles for Ward/Site charts (2026-07-09) ============
  const [wardChartPercentMode, setWardChartPercentMode] = useState(false);
  const [siteChartPercentMode, setSiteChartPercentMode] = useState(false);
  // ============ EDIT END: Percentage-stacked flip toggles for Ward/Site charts ============
  // ============ EDIT END: Chart filter selections ============

  // ============ EDIT START: Flip state for Label Distribution card ============
  const [labelCardFlipped, setLabelCardFlipped] = useState(false);
  // ============ EDIT END: Flip state for Label Distribution card ============

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

      console.log(`[TrackingCurrent] Loading study data for: ${studyCode}`);

      // Construct Study ID (assuming convention Study + Code)
      // e.g., "13NV" -> "Study13NV"
      const studyId = `Study${studyCode}`;

      // Fetch study data using service (handles both dev/mock and prod/api)
      const studyData = await getResearchStudy(studyId);

      if (!studyData) {
        console.warn(`[TrackingCurrent] No data found for study ${studyCode}`);
        return null;
      }

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
              // Route through getLeafLabel so the same "mild"/"severe" -> "-cap" aliasing
              // used for patient data is also applied to the study's own label list.
              label: getLeafLabel(code, studyCode) || '',  // e.g., "cap-1", "mild-cap" or "vap-1"
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
      const data = await getRecruitmentDetail(
        {
          studyCode: selectedStudy || undefined,
          ...filters, // Pass filters to API
        },
        (attained, total) => setFetchProgress({ attained, total })
      );

      console.log(`[TrackingCurrent] Loaded ${data?.total || 0} subjects from FHIR API`);
      return data;

    } catch (error) {
      console.error('[TrackingCurrent] Error loading from FHIR API:', error);
      return null;
    } finally {
      setFetchProgress(null);
    }
  }, [selectedStudy]);

  /**
   * Main data loading function
   * Automatically chooses between mock data (development) and FHIR API (production)
   * Applies site filter at load time; ward and group filtering is done client-side
   * because the shared WardSelection/GroupFilter components use organization resource data
   * which may not match the ward codes in patient data (managingOrganization references)
   */
  const loadRecruitmentData = useCallback(async () => {
    try {
      setLoading(true);

      // Build filters from current selections
      // Only site is filtered at load time; ward/group are filtered client-side
      const filters = {
        siteObj: currentSite || null,  // Full site object with alias array
        site: currentSite?.code || null,  // Site code for API calls
        // Added for fhirService.js compatibility:
        siteCode: currentSite?.code || null,
        organization: currentSite || null,
      };

      console.log('[TrackingCurrent] Loading data with filters:', {
        siteName: currentSite?.name,
        siteCode: currentSite?.code,
        siteAliases: currentSite?.alias,
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
  }, [loadMockData, loadFromAPI, currentSite]);

  /**
   * Calculate statistics from a list of rows
   * Extracted for reuse with both full data (for dropdowns) and filtered data (for charts)
   */
  const calculateStats = useCallback((rows) => {
    const newStats = {
      totalRecruitment: 0, // Initialize to 0, will count only enrolled
      // Date-based stats
      totalScreening: 0,
      thisWeekScreening: 0,
      thisWeekRecruitment: 0,

      byGroup: {},        // Total SCREENING by Group (matches rows.length breakdown)
      recruitmentByGroup: {}, // Total RECRUITMENT by Group (only enrolled)

      // Breakdown by group for other metrics
      screeningByGroup: {},
      thisWeekScreeningByGroup: {},
      thisWeekRecruitmentByGroup: {},

      byLabel: {},
      byStatus: {},
      bySite: {},             // Site totals
      byWard: {},
      byLabelGroup: {},   // Dynamically populated
      byWardGroup: {},    // Ward → Group breakdown for stacked bar chart
      bySiteGroup: {},    // Site → Group breakdown for stacked bar chart
      byWardLabel: {},        // Ward → Label breakdown for hierarchical filtering
      bySiteLabel: {},        // Site → Label breakdown for hierarchical filtering
      labelToGroup: {},   // Map label to its parent group (e.g., "cap-1" → "CAP")

      // RECRUITMENT-ONLY stats (for charts)
      recruitmentByLabel: {},
      recruitmentByWard: {},
      recruitmentBySite: {},
      recruitmentByLabelGroup: {},
      recruitmentByWardGroup: {},
      recruitmentBySiteGroup: {},
      recruitmentByWardLabel: {},
      recruitmentBySiteLabel: {},
    };

    const { start: weekStart, end: weekEnd } = getDateRangeFromLastMonday();

    rows.forEach(row => {
      // Extract groups first to use in all metrics
      const groups = Array.isArray(row.groups) ? row.groups : [row.group || 'Unknown'];
      const labels = row.labels || ['N/A']; // Array of labels
      const site = row.site || 'Unknown';
      const ward = row.ward || 'Unknown';

      // Date stats
      if (row.screeningDate && row.screeningDate !== 'N/A') {
        newStats.totalScreening++;
        // Count total screening by group
        groups.forEach(g => {
          newStats.screeningByGroup[g] = (newStats.screeningByGroup[g] || 0) + 1;
        });

        if (isDateInRange(row.screeningDate, weekStart, weekEnd)) {
          newStats.thisWeekScreening++;
          // Count this week screening by group
          groups.forEach(g => {
            newStats.thisWeekScreeningByGroup[g] = (newStats.thisWeekScreeningByGroup[g] || 0) + 1;
          });
        }
      }

      // Recruitment stats (Enrolled date)
      if (row.enrolledDate && row.enrolledDate !== 'N/A') {
        newStats.totalRecruitment++; // Count total recruitment
        // Count recruitment by group
        groups.forEach(g => {
          newStats.recruitmentByGroup[g] = (newStats.recruitmentByGroup[g] || 0) + 1;
        });

        // Note: filteredStats.totalRecruitment is basically total recruitment (enrolled)
        // assuming the list contains only active subjects.
        // We explicitly count "this week" recruitment here.
        if (isDateInRange(row.enrolledDate, weekStart, weekEnd)) {
          newStats.thisWeekRecruitment++;
          // Count this week recruitment by group
          groups.forEach(g => {
            newStats.thisWeekRecruitmentByGroup[g] = (newStats.thisWeekRecruitmentByGroup[g] || 0) + 1;
          });
        }

        // --- RECRUITMENT ONLY STATS POPULATION ---

        // Count by site (recruited)
        newStats.recruitmentBySite[site] = (newStats.recruitmentBySite[site] || 0) + 1;

        // Count by site AND group (recruited)
        if (!newStats.recruitmentBySiteGroup[site]) {
          newStats.recruitmentBySiteGroup[site] = {};
        }
        groups.forEach(g => {
          newStats.recruitmentBySiteGroup[site][g] = (newStats.recruitmentBySiteGroup[site][g] || 0) + 1;
        });

        // Count by ward (recruited)
        newStats.recruitmentByWard[ward] = (newStats.recruitmentByWard[ward] || 0) + 1;

        // Count by ward AND group (recruited)
        if (!newStats.recruitmentByWardGroup[ward]) {
          newStats.recruitmentByWardGroup[ward] = {};
        }
        groups.forEach(g => {
          newStats.recruitmentByWardGroup[ward][g] = (newStats.recruitmentByWardGroup[ward][g] || 0) + 1;
        });

        // console.log('label labels', labels);
        // Process EACH label for recruitment stats
        labels.forEach(label => {
          // Count by label (recruited)
          newStats.recruitmentByLabel[label] = (newStats.recruitmentByLabel[label] || 0) + 1;

          // Count by site AND label (recruited)
          if (!newStats.recruitmentBySiteLabel[site]) {
            newStats.recruitmentBySiteLabel[site] = {};
          }
          newStats.recruitmentBySiteLabel[site][label] = (newStats.recruitmentBySiteLabel[site][label] || 0) + 1;

          // Count by ward AND label (recruited)
          if (!newStats.recruitmentByWardLabel[ward]) {
            newStats.recruitmentByWardLabel[ward] = {};
          }
          newStats.recruitmentByWardLabel[ward][label] = (newStats.recruitmentByWardLabel[ward][label] || 0) + 1;

          // Count labels grouped by group (recruited)
          groups.forEach(g => {
            if (!newStats.recruitmentByLabelGroup[g]) {
              newStats.recruitmentByLabelGroup[g] = {};
            }
            newStats.recruitmentByLabelGroup[g][label] = (newStats.recruitmentByLabelGroup[g][label] || 0) + 1;
          });
        });
      }

      // Count by groups (dynamic - iterate array)

      // Count by group (increment for EACH group the patient belongs to)
      groups.forEach(g => {
        newStats.byGroup[g] = (newStats.byGroup[g] || 0) + 1;
      });

      // Count by status (once per patient)
      newStats.byStatus[row.status] = (newStats.byStatus[row.status] || 0) + 1;

      // Count by site (once per patient)
      newStats.bySite[site] = (newStats.bySite[site] || 0) + 1;

      // Count by site AND group
      if (!newStats.bySiteGroup[site]) {
        newStats.bySiteGroup[site] = {};
      }
      groups.forEach(g => {
        newStats.bySiteGroup[site][g] =
          (newStats.bySiteGroup[site][g] || 0) + 1;
      });

      // Count by ward (once per patient)
      newStats.byWard[ward] = (newStats.byWard[ward] || 0) + 1;

      // Count by ward AND group
      if (!newStats.byWardGroup[ward]) {
        newStats.byWardGroup[ward] = {};
      }
      groups.forEach(g => {
        newStats.byWardGroup[ward][g] =
          (newStats.byWardGroup[ward][g] || 0) + 1;
      });

      // Process EACH label (patient can have multiple labels)
      labels.forEach(label => {
        // Count by label (each label counted separately)
        newStats.byLabel[label] = (newStats.byLabel[label] || 0) + 1;

        // Map label to its parent condition
        if (label !== 'N/A') {
          // Map label to the first group found (heuristic, typically sufficient for hierarchy)
          // Or we could map to all, but labelToGroup assumes 1:1 in other parts
          newStats.labelToGroup[label] = groups[0];
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

        // Count labels grouped by group
        groups.forEach(g => {
          if (!newStats.byLabelGroup[g]) {
            newStats.byLabelGroup[g] = {};
          }
          newStats.byLabelGroup[g][label] =
            (newStats.byLabelGroup[g][label] || 0) + 1;
        });
      });
    });

    return newStats;
  }, []);

  /**
   * Process and filter data when mockData or filters change
   */
  useEffect(() => {
    if (!data) return;

    // Process the pre-filtered data into table rows
    const processed = processLabelData(data, selectedStudy);
    setTableData(processed);

    console.log(`[TrackingCurrent] Processed ${processed.length} rows for display`);

    // Calculate global statistics (for dropdown options)
    const newStats = calculateStats(processed);
    setStats(newStats);

  }, [data, calculateStats, selectedStudy]); // Only re-process when data or study changes

  // Client-side filtering for ward and group, driven by the shared Redux
  // WardSelection/GroupFilter components. Ward matching strips the "Ward"
  // prefix from currentWard.id (e.g. "WardHTDED") since row.ward is derived
  // from the same managingOrganization reference without that prefix (see
  // extractWard above) - both ultimately come from the same Organization id.
  const filteredTableData = useMemo(() => {
    let filtered = tableData;
    if (currentWard?.id) {
      const wardCode = currentWard.id.replace(/^Ward/i, '');
      filtered = filtered.filter(row => row.ward === wardCode);
    }
    if (currentGroup?.name) {
      filtered = filtered.filter(row => (row.groups || []).includes(currentGroup.name));
    }
    return filtered;
  }, [tableData, currentWard, currentGroup]);

  // Filter for the TABLE to only show RECRUITED patients (enrolledDate is valid)
  const recruitedTableData = useMemo(() => {
    return filteredTableData.filter(row => row.enrolledDate && row.enrolledDate !== 'N/A');
  }, [filteredTableData]);

  // Calculate filtered statistics (for charts/cards)
  // This ensures charts update when local filters change, while dropdowns remain populated from global stats
  const filteredStats = useMemo(() => {
    return calculateStats(filteredTableData);
  }, [filteredTableData, calculateStats]);

  // Local fallback options for WardSelection/GroupFilter, derived from the already-loaded
  // (Site-scoped) patient data - see LOCAL FALLBACK docs on those components. Sourced from
  // the unfiltered `stats` (not `filteredStats`) so the dropdown keeps showing every ward/
  // group option even after the user has narrowed the current selection to one of them.
  const localWardOptions = useMemo(
    () => Object.entries(stats.byWard || {}).map(([code, count]) => ({ code, count })),
    [stats.byWard]
  );
  // Client-side filtering for ward and group (derived from actual patient data)
  // This replaces the server-side filtering that WardSelection/GroupFilter would trigger


  // Initial data load
  // Uses loadRecruitmentData which automatically chooses between mock (dev) and API (prod)
  useEffect(() => {
    loadRecruitmentData();
  }, [loadRecruitmentData]);

  // Load study targets when selectedStudy changes or on initial load
  useEffect(() => {
    if (selectedStudy) {
      loadStudyData(selectedStudy);
    } else {
      // Clear targets when no study selected
      setStudyTargets({ totalTarget: 0, byGroup: {}, labelHierarchy: [] });
    }
  }, [selectedStudy, loadStudyData]);

  // ============ EDIT START: Initialize chart selections when data changes (2026-02-04) ============
  // When stats change, initialize ward and site selections
  useEffect(() => {
    // Use filteredStats so charts update when filters change
    const allWards = Object.keys(filteredStats.byWard || {});
    const allSites = Object.keys(filteredStats.bySite || {});

    // Initialize with all items selected (or keep current selection if valid)
    setSelectedWardsForChart(prev =>
      prev.length > 0 && prev.every(w => allWards.includes(w)) ? prev : allWards
    );
    setSelectedSitesForChart(prev =>
      prev.length > 0 && prev.every(s => allSites.includes(s)) ? prev : allSites
    );
  }, [filteredStats.byWard, filteredStats.bySite]);
  // ============ EDIT END: Initialize chart selections when data changes ============

  // ============================================
  // COLOR PALETTES & HELPER FUNCTIONS
  // ============================================

  // ============ EDIT START: Unified color palette for all charts (2026-01-28) ============
  /**
   * Single source of truth for group/label colors, computed once per data
   * change (not recomputed inline per chart). See buildColorAssignments in
   * utils/colorPalette.js for the cold->warm gradient scheme.
   */
  const colorAssignments = useMemo(() => (
    buildColorAssignments(
      Object.keys(filteredStats.recruitmentByGroup || {}),
      studyTargets.labelHierarchy,
      filteredStats.labelToGroup
    )
  ), [filteredStats.recruitmentByGroup, studyTargets.labelHierarchy, filteredStats.labelToGroup]);

  /**
   * Get a persistent color for a group - an O(1) lookup into colorAssignments.
   */
  const getPersistentGroupColor = (group) => colorAssignments.groupColors[group] || COLD_PANEL[0];

  /**
   * Get a color for a label that stays consistent across every chart - an
   * O(1) lookup into colorAssignments. 'N/A' is always gray.
   */
  const getPersistentLabelColor = (label) => {
    if (label === 'N/A') return NEUTRAL_LABEL_COLOR;
    return colorAssignments.labelColors[label] || NEUTRAL_LABEL_COLOR;
  };
  // ============ EDIT END: Unified color palette for all charts ============

  // ============================================
  // CHART CONFIGURATIONS
  // ============================================

  /**
   * Pie Chart - Group Distribution (dynamic from data)
   * Shows the percentage breakdown of all groups
   */
const rawGroups = filteredStats.recruitmentByGroup || {};

const groupPieChartData = getOrderedGroups(Object.keys(rawGroups))
  .filter((group) => group !== 'VAP+')
  .map((group) => {
    const count = rawGroups[group];
    const baseItem = {
      value: count,
      name: group,
      itemStyle: { color: getPersistentGroupColor(group) },
    };

    if (group === 'VAP' && rawGroups['VAP+']) {
      baseItem.children = [
        {
          value: rawGroups['VAP+'],
          name: 'VAP+',
          itemStyle: { color: getPersistentGroupColor('VAP') },
        },
      ];
    }

    return baseItem;
  });

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
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: (params) => `${params[0].name}: ${params[0].value}`,
  },
  grid: {
    left: '3%',
    right: '4%',
    top: '15%',
    bottom: '10%',
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    data: groupPieChartData.map((item) => item.name),
    axisLabel: {
      interval: 0,
      rotate: groupPieChartData.length > 6 ? 30 : 0,
    },
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      name: 'Group',
      type: 'bar',
      barMaxWidth: 40,

      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: (params) => groupPieChartData[params.dataIndex].itemStyle.color,
      },

      label: {
        show: true,
        position: 'top',
      },

      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold',
        },
      },

      data: groupPieChartData.map((item) => item.value),
    },
  ],
};
  // ============ EDIT END: Dynamic group bar chart ============

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
      data: sortLabelsByOrder(Object.keys(filteredStats.byLabel || {})),
      axisLabel: {
        rotate: 30,
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
        data: sortLabelsByOrder(Object.keys(filteredStats.recruitmentByLabel || {}))
          .map((label) => ({
            value: filteredStats.recruitmentByLabel?.[label] || 0,
            itemStyle: {
              color: getPersistentLabelColor(label),
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

  // ============ EDIT START: Stacked % bar chart - label breakdown per group (2026-07-09) ============
  /**
   * Horizontal/Vertical Stacked Bar Chart - Label breakdown per group, as percentage
   * Uses filteredStats.recruitmentByLabelGroup, e.g.:
   * { VAP: { 'vap+': 6, 'no-vap+': 9, 'N/A': 22 }, CAP: { mild: 31, severe: 11, 'N/A': 3 } }
   */
  const labelGroupPercentData = filteredStats.recruitmentByLabelGroup || {};
  const labelGroupPercentGroups = getOrderedGroups(Object.keys(labelGroupPercentData));
  // Union of all labels across all groups, sorted using the canonical labelOrder
  const labelGroupPercentLabels = sortLabelsByOrder(
    Array.from(
      labelGroupPercentGroups.reduce((set, group) => {
        Object.keys(labelGroupPercentData[group] || {}).forEach((label) => set.add(label));
        return set;
      }, new Set())
    )
  );
  const labelGroupPercentTotals = labelGroupPercentGroups.reduce((acc, group) => {
    acc[group] = Object.values(labelGroupPercentData[group] || {}).reduce((sum, v) => sum + v, 0);
    return acc;
  }, {});

  const labelGroupStackedPercentBarChartOption = {
    title: {
      text: 'Label Distribution by Group (%)',
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 'bold' },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const group = params[0]?.axisValue;
        const total = labelGroupPercentTotals[group] || 0;
        let tooltip = `<strong>${group}</strong> (Total: ${total})<br/>`;
        params.forEach((p) => {
          const count = labelGroupPercentData[group]?.[p.seriesName] || 0;
          if (count > 0) {
            tooltip += `${p.marker} ${p.seriesName}: ${count} (${p.value}%)<br/>`;
          }
        });
        return tooltip;
      },
    },
    legend: {
      data: labelGroupPercentLabels,
      bottom: '0%',
      type: 'scroll',
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
      data: labelGroupPercentGroups,
      axisLabel: { fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      name: '%',
      max: 100,
      axisLabel: { formatter: '{value}%' },
    },
    // Stack N/A last so it renders as the topmost segment (legend order stays canonical)
    series: [...labelGroupPercentLabels.filter((l) => l !== 'N/A'), ...labelGroupPercentLabels.filter((l) => l === 'N/A')]
      .map((label) => {
        return {
          name: label,
          type: 'bar',
          stack: 'total',
          barMaxWidth: 60,
          emphasis: { focus: 'series' },
          itemStyle: { color: getPersistentLabelColor(label) },
          label: {
            show: true,
            formatter: (params) => (params.value > 0 ? `${params.value}%` : ''),
            fontSize: 10,
          },
          data: labelGroupPercentGroups.map((group) => {
            const total = labelGroupPercentTotals[group] || 0;
            const count = labelGroupPercentData[group]?.[label] || 0;
            return total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
          }),
        };
      }),
  };
  // ============ EDIT END: Stacked % bar chart - label breakdown per group ============

  // ============ EDIT START: Stacked bar chart by ward and group (2026-01-28) ============
  // Get all wards sorted by total count (descending)
  // Use filteredStats for ward chart
  const allWardsAvailable = Object.keys(filteredStats.recruitmentByWard || {})
    .sort((a, b) => (filteredStats.recruitmentByWard?.[b] || 0) - (filteredStats.recruitmentByWard?.[a] || 0));


  // Get all unique groups for the ward chart
  const allGroups = getOrderedGroups(Object.keys(filteredStats.recruitmentByGroup || {}));

  // Canonical group order for the Recruitment Progress vs Targets chart
  const progressTargetGroups = getOrderedGroups(Object.keys(studyTargets.byGroup || {}));
  // ECharts renders category index 0 at the bottom, last index at the top
  // (default; 'inverse' flips render direction without reliably keeping
  // itemStyle/label tied to the right bar). Reversed here once so building
  // the chart bottom-up with 'Total' first reads top-to-bottom in ascending
  // order above Total.
  const progressChartGroupsBottomUp = [...progressTargetGroups].reverse();

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
    // This prevents duplicates when data has mismatched group/label (e.g., patient with CAP group but vap-1 label)
    Object.keys(filteredStats.byLabel || {}).forEach(label => {
      if (label === 'N/A') return;
      if (allAssignedLabels.has(label)) return; // Skip if already assigned from study definition

      const group = filteredStats.labelToGroup?.[label];
      if (group && hierarchy[group]) {
        hierarchy[group].push(label);
        allAssignedLabels.add(label);
      }
    });

    // Sort labels within each group
    Object.keys(hierarchy).forEach(group => {
      sortLabelsByOrder(hierarchy[group]);
    });

    return hierarchy;
  }, [studyTargets.labelHierarchy, allGroups, filteredStats.byLabel, filteredStats.labelToGroup]);

  // Get ALL labels from hierarchy (includes study-defined labels with 0 count)
  const allLabelsFromHierarchy = useMemo(() => {
    return sortLabelsByOrder(Object.values(labelHierarchy).flat());
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
  // Filter to only selected wards, then reorder alphabetically for the chart y-axis
  const filteredWardsForChart = allWardsAvailable
    .filter(w => selectedWardsForChart.includes(w))
    .sort((a, b) => a.localeCompare(b));
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
        const ward = params[0]?.axisValue;
        let tooltip = `<strong>${ward}</strong><br/>`;
        let total = 0;
        params.forEach(p => {
          if (p.seriesName === 'Total') return;
          const raw = filteredStats.recruitmentByWardLabel?.[ward]?.[p.seriesName] || 0;
          if (raw > 0) {
            const pctStr = wardChartPercentMode ? ` (${p.value}%)` : '';
            tooltip += `${p.marker} ${p.seriesName}: ${raw}${pctStr}<br/>`;
            total += raw;
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
    xAxis: {
      type: 'value',
      name: wardChartPercentMode ? '%' : 'Subjects',
      max: wardChartPercentMode ? 100 : undefined,
      axisLabel: wardChartPercentMode ? { formatter: '{value}%' } : undefined,
    },
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
        data: filteredWardsForChart.map(ward => {
          const raw = filteredStats.recruitmentByWardLabel?.[ward]?.[label] || 0;
          if (!wardChartPercentMode) return raw;
          const total = filteredLabelsForWardChart.reduce(
            (sum, l) => sum + (filteredStats.recruitmentByWardLabel?.[ward]?.[l] || 0), 0
          );
          return total > 0 ? Math.round((raw / total) * 1000) / 10 : 0;
        }),
        itemStyle: {
          color: getPersistentLabelColor(label), // Consistent colors across all charts
        },
        label: {
          show: wardChartPercentMode,
          position: 'inside',
          fontSize: 10,
          formatter: (params) => (params.value > 0 ? `${params.value}%` : ''),
        },
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
            const total = filteredLabelsForWardChart.reduce(
              (sum, l) => sum + (filteredStats.recruitmentByWardLabel?.[ward]?.[l] || 0), 0
            );
            return wardChartPercentMode ? '' : total;
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
          .map(label => `${label}: ${filteredStats.recruitmentByWardLabel?.[name]?.[label] || 0}`)
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
            (sum, label) => sum + (filteredStats.recruitmentByWardLabel?.[ward]?.[label] || 0), 0
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
        const ward = params[0]?.axisValue;
        let tooltip = `<strong>${ward}</strong><br/>`;
        let total = 0;
        params.forEach(p => {
          if (p.seriesName === 'Total') return;
          const raw = filteredStats.recruitmentByWardGroup?.[ward]?.[p.seriesName] || 0;
          if (raw > 0) {
            const pctStr = wardChartPercentMode ? ` (${p.value}%)` : '';
            tooltip += `${p.marker} ${p.seriesName}: ${raw}${pctStr}<br/>`;
            total += raw;
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
    xAxis: {
      type: 'value',
      name: wardChartPercentMode ? '%' : 'Subjects',
      max: wardChartPercentMode ? 100 : undefined,
      axisLabel: wardChartPercentMode ? { formatter: '{value}%' } : undefined,
    },
    yAxis: {
      type: 'category',
      data: filteredWardsForChart,
      axisLabel: { fontSize: 11 },
    },
    series: [
      // One series per group (stacked)
      ...allGroups.map((group) => ({
        name: group,
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: filteredWardsForChart.map(ward => {
          const raw = filteredStats.recruitmentByWardGroup?.[ward]?.[group] || 0;
          if (!wardChartPercentMode) return raw;
          const total = allGroups.reduce(
            (sum, g) => sum + (filteredStats.recruitmentByWardGroup?.[ward]?.[g] || 0), 0
          );
          return total > 0 ? Math.round((raw / total) * 1000) / 10 : 0;
        }),
        itemStyle: {
          color: getPersistentGroupColor(group),
        },
        label: {
          show: wardChartPercentMode,
          position: 'inside',
          fontSize: 10,
          formatter: (params) => (params.value > 0 ? `${params.value}%` : ''),
        },
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
            const total = allGroups.reduce(
              (sum, g) => sum + (filteredStats.recruitmentByWardGroup?.[ward]?.[g] || 0), 0
            );
            return wardChartPercentMode ? '' : total;
          },
        },
        data: filteredWardsForChart.map(() => 0),
      },
    ],
  };
  // ============ EDIT END: Stacked bar chart by ward and group ============

  // ============ EDIT START: Dynamic conditions from data (2026-01-28) ============
  // Get all unique groups dynamically from the data
  // const allGroups = getOrderedGroups(Object.keys(filteredStats.byGroup || {}));

  // Get all unique labels across all groups
  const allLabels = sortLabelsByOrder([...new Set(
    allGroups.flatMap(group =>
      Object.keys(filteredStats.recruitmentByLabelGroup?.[group] || {})
    )
  )]);

  // Get all sites sorted by total count (descending)
  const allSitesAvailable = Object.keys(filteredStats.recruitmentBySite || {})
    .sort((a, b) => (filteredStats.recruitmentBySite?.[b] || 0) - (filteredStats.recruitmentBySite?.[a] || 0));

  // ============ EDIT START: Filter sites and groups based on user selection (2026-02-04) ============
  // Filter to only selected sites, then reorder alphabetically for the chart y-axis
  const filteredSitesForChart = allSitesAvailable
    .filter(s => selectedSitesForChart.includes(s))
    .sort((a, b) => a.localeCompare(b));
  // Filter to only selected labels for site chart (hierarchical filtering)
  const filteredLabelsForSiteChart = allLabelsFromHierarchy.filter(l => selectedLabelsForSiteChart.includes(l));
  // ============ EDIT END: Filter sites and groups based on user selection ============
  // ============ EDIT END: Dynamic groups from data ============

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
        const site = params[0]?.axisValue;
        let tooltip = `<strong>Site: ${site}</strong><br/>`;
        let total = 0;
        params.forEach(p => {
          if (p.seriesName === 'Total') return;
          const raw = filteredStats.recruitmentBySiteLabel?.[site]?.[p.seriesName] || 0;
          if (raw > 0) {
            const pctStr = siteChartPercentMode ? ` (${p.value}%)` : '';
            tooltip += `${p.marker} ${p.seriesName}: ${raw}${pctStr}<br/>`;
            total += raw;
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
    xAxis: {
      type: 'value',
      name: siteChartPercentMode ? '%' : 'Subjects',
      max: siteChartPercentMode ? 100 : undefined,
      axisLabel: siteChartPercentMode ? { formatter: '{value}%' } : undefined,
    },
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
        data: filteredSitesForChart.map(site => {
          const raw = filteredStats.recruitmentBySiteLabel?.[site]?.[label] || 0;
          if (!siteChartPercentMode) return raw;
          const total = filteredLabelsForSiteChart.reduce(
            (sum, l) => sum + (filteredStats.recruitmentBySiteLabel?.[site]?.[l] || 0), 0
          );
          return total > 0 ? Math.round((raw / total) * 1000) / 10 : 0;
        }),
        itemStyle: {
          color: getPersistentLabelColor(label), // Consistent colors across all charts
        },
        label: {
          show: siteChartPercentMode,
          position: 'inside',
          fontSize: 10,
          formatter: (params) => (params.value > 0 ? `${params.value}%` : ''),
        },
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
            const total = filteredLabelsForSiteChart.reduce(
              (sum, l) => sum + (filteredStats.recruitmentBySiteLabel?.[site]?.[l] || 0), 0
            );
            return siteChartPercentMode ? '' : total;
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
          .map(label => `${label}: ${filteredStats.recruitmentBySiteLabel?.[name]?.[label] || 0}`)
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
            (sum, label) => sum + (filteredStats.recruitmentBySiteLabel?.[site]?.[label] || 0), 0
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
        const site = params[0]?.axisValue;
        let tooltip = `<strong>Site: ${site}</strong><br/>`;
        let total = 0;
        params.forEach(p => {
          if (p.seriesName === 'Total') return;
          const raw = filteredStats.recruitmentBySiteGroup?.[site]?.[p.seriesName] || 0;
          if (raw > 0) {
            const pctStr = siteChartPercentMode ? ` (${p.value}%)` : '';
            tooltip += `${p.marker} ${p.seriesName}: ${raw}${pctStr}<br/>`;
            total += raw;
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
    xAxis: {
      type: 'value',
      name: siteChartPercentMode ? '%' : 'Subjects',
      max: siteChartPercentMode ? 100 : undefined,
      axisLabel: siteChartPercentMode ? { formatter: '{value}%' } : undefined,
    },
    yAxis: {
      type: 'category',
      data: filteredSitesForChart,
      axisLabel: { fontSize: 11 },
    },
    series: [
      // One series per group (stacked)
      ...allGroups.map((group) => ({
        name: group,
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: filteredSitesForChart.map(site => {
          const raw = filteredStats.recruitmentBySiteGroup?.[site]?.[group] || 0;
          if (!siteChartPercentMode) return raw;
          const total = allGroups.reduce(
            (sum, g) => sum + (filteredStats.recruitmentBySiteGroup?.[site]?.[g] || 0), 0
          );
          return total > 0 ? Math.round((raw / total) * 1000) / 10 : 0;
        }),
        itemStyle: {
          color: getPersistentGroupColor(group),
        },
        label: {
          show: siteChartPercentMode,
          position: 'inside',
          fontSize: 10,
          formatter: (params) => (params.value > 0 ? `${params.value}%` : ''),
        },
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
            const total = allGroups.reduce(
              (sum, g) => sum + (filteredStats.recruitmentBySiteGroup?.[site]?.[g] || 0), 0
            );
            return siteChartPercentMode ? '' : total;
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
      max: Math.max(...allGroups.map(c => filteredStats.recruitmentByGroup?.[c] || 0)) * 1.2 || 10
    },
    ...allLabels.slice(0, 3).map((label, idx) => ({
      name: `Label: ${label}`,
      max: Math.max(...allGroups.map(c => filteredStats.recruitmentByLabelGroup?.[c]?.[label] || 0)) * 1.5 || 10,
    })),
    {
      name: 'Active Wards',
      max: Object.keys(filteredStats.recruitmentByWard || {}).length || 5
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
        data: allGroups.map((group) => ({
          value: [
            filteredStats.recruitmentByGroup?.[group] || 0,
            ...allLabels.slice(0, 3).map(label => filteredStats.recruitmentByLabelGroup?.[group]?.[label] || 0),
            Object.keys(filteredStats.recruitmentByWard || {}).filter(w =>
              // Check if ward has recruitment for this group
              (filteredStats.recruitmentByWardGroup?.[w]?.[group] || 0) > 0
            ).length,
          ],
          name: group,
          itemStyle: { color: getPersistentGroupColor(group) },
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
      description: `Participant study identifier${selectedStudy ? ` (e.g., ${selectedStudy}-XXX-XXXX)` : ''}`,
    },
    {
      field: 'label',
      headerName: 'Label',
      width: 100,
      description: `Participant cohort label${allLabelsFromHierarchy.length > 0 ? ` (${allLabelsFromHierarchy.slice(0, 4).join(', ')}${allLabelsFromHierarchy.length > 4 ? ', ...' : ''})` : ''}`,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          variant="outlined"
          sx={{ borderColor: getPersistentLabelColor(params.value), color: getPersistentLabelColor(params.value) }}
        />
      ),
    },
    {
      field: 'group',
      headerName: 'Group',
      width: 100,
      description: `Participant group${Object.keys(labelHierarchy).length > 0 ? ` (${Object.keys(labelHierarchy).join(', ')})` : ''}`,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {params.value.split(', ').map(g => (
            <Chip
              key={g}
              label={g}
              size="small"
              sx={{ bgcolor: getPersistentGroupColor(g), color: '#fff' }}
            />
          ))}
        </Box>
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
      description: 'Participant screening identifier',
    },
    {
      field: 'birthYear',
      headerName: 'Birth Year',
      width: 100,
      description: 'Participant birth year',
    },
  ];

  // Loading state - shows a real attained/total progress bar while the production-mode
  // per-patient reference-resolution loop (see getRecruitmentDetail in fhirService.js) is
  // in flight; falls back to an indeterminate spinner otherwise (e.g. mock mode, which has
  // no per-item loop and is already fast).
  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="100vh" gap={2}>
        {fetchProgress ? (
          <Box sx={{ width: 320 }}>
            <LinearProgress
              variant="determinate"
              value={(fetchProgress.attained / fetchProgress.total) * 100}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
              Loading patients: {fetchProgress.attained} / {fetchProgress.total}
            </Typography>
          </Box>
        ) : (
          <CircularProgress />
        )}
      </Box>
    );
  }

  console.log('stat got is ', stats);
  console.log('target got is ', studyTargets);
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Current Recruitment Tracking
      </Typography>
      {/* <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Participant-level recruitment details with label information from FHIR data
      </Typography> */}
      <Divider sx={{ mb: 3 }} />

      {/* Filter Controls */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <StudySelection />
          </Grid>

          {selectedStudy && (
            <Grid item xs={12} md={3}>
              <SiteSelection />
            </Grid>
          )}

          {/* Ward filter - shared Redux-backed component (requires study + site),
              with local, patient-data-derived options as a fallback */}
          {selectedStudy && (
            <Grid item xs={12} md={3}>
              <WardSelection size="small" localWards={localWardOptions} />
            </Grid>
          )}

          {/* Group filter - shared Redux-backed component, independent of Ward/Site */}
          {selectedStudy && (
            <Grid item xs={12} md={3}>
              <GroupFilter size="small" />
            </Grid>
          )}
        </Grid>
      </Box>

      {/* ============ Refactored Statistics Rows (4 Rows) ============ */}

      {/* ============ Refactored Statistics Rows (4 Rows) - COMMENTED OUT FOR COMPACT VIEW ============ */}
      {/* 
      <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
        This Week Screening <Typography component="span" variant="caption" color="text.secondary">(from last Monday to today)</Typography>
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2} sx={{ bgcolor: 'background.paper' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total</Typography>
              <Typography variant="h3" color="primary">{filteredStats.thisWeekScreening}</Typography>
            </CardContent>
          </Card>
        </Grid>
        {getOrderedGroups(Object.keys(filteredStats.byGroup || {})).map((group, index) => (
          <Grid item xs={12} sm={6} md={3} key={group}>
            <Card elevation={1}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>{group}</Typography>
                <Typography variant="h4" sx={{ color: getChartColor(index) }}>
                  {filteredStats.thisWeekScreeningByGroup?.[group] || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid> 
      */}

      {/* ============ New Compact Statistics Table (2026-02-05) ============ */}
      <TableContainer component={Paper} elevation={2} sx={{ mb: 3 }}>
        <Table size="small" aria-label="recruitment statistics table">
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Metric</TableCell>
              {getOrderedGroups(Object.keys(filteredStats.byGroup || {})).map((group) => (
                <TableCell key={group} align="center" sx={{ fontWeight: 'bold' }}>{group}</TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Row 1: This Week Screening */}
            <TableRow>
              <TableCell component="th" scope="row">
                <Typography variant="body2" fontWeight="bold">This Week Screening</Typography>
                {/* <Typography variant="caption" color="text.secondary">from last Monday to today</Typography> */}
              </TableCell>
              {getOrderedGroups(Object.keys(filteredStats.byGroup || {})).map((group) => (
                <TableCell key={group} align="center">
                  <Typography variant="h6" sx={{ color: getPersistentGroupColor(group) }}>
                    {filteredStats.thisWeekScreeningByGroup?.[group] || 0}
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="center">
                <Typography variant="h6" color="primary" fontWeight="bold">{filteredStats.thisWeekScreening}</Typography>
              </TableCell>
            </TableRow>

            {/* Row 2: Total Screening */}
            <TableRow>
              <TableCell component="th" scope="row">
                <Typography variant="body2" fontWeight="bold">Total Screening</Typography>
                <Typography variant="caption" color="text.secondary">Cumulative</Typography>
              </TableCell>
              {getOrderedGroups(Object.keys(filteredStats.byGroup || {})).map((group) => (
                <TableCell key={group} align="center">
                  <Typography variant="h6" sx={{ color: getPersistentGroupColor(group) }}>
                    {filteredStats.screeningByGroup?.[group] || 0}
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="center">
                <Typography variant="h6" color="primary" fontWeight="bold">{filteredStats.totalScreening}</Typography>
              </TableCell>
            </TableRow>

            {/* Row 3: This Week Recruitment */}
            <TableRow>
              <TableCell component="th" scope="row">
                <Typography variant="body2" fontWeight="bold">This Week Recruitment</Typography>
                {/* <Typography variant="caption" color="text.secondary">from last Monday to today</Typography> */}
              </TableCell>
              {getOrderedGroups(Object.keys(filteredStats.byGroup || {})).map((group) => (
                <TableCell key={group} align="center">
                  <Typography variant="h6" sx={{ color: getPersistentGroupColor(group) }}>
                    {filteredStats.thisWeekRecruitmentByGroup?.[group] || 0}
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="center">
                <Typography variant="h6" color="primary" fontWeight="bold">{filteredStats.thisWeekRecruitment}</Typography>
              </TableCell>
            </TableRow>

            {/* Row 4: Total Recruitment */}
            <TableRow>
              <TableCell component="th" scope="row">
                <Typography variant="body2" fontWeight="bold">Total Recruitment</Typography>
                <Typography variant="caption" color="text.secondary">Currently Enrolled</Typography>
              </TableCell>


              {/* Group Recruitment Cells */}
              {getOrderedGroups(Object.keys(filteredStats.byGroup || {})).map((group) => {
                const target = studyTargets.byGroup?.[group] || 0;
                const count = filteredStats.recruitmentByGroup?.[group] || 0;
                const groupColor = getPersistentGroupColor(group);
                return (
                  <TableCell key={group} align="center">
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                        <Typography variant="h6" fontWeight="bold" sx={{ color: groupColor }}>{count}</Typography>
                        {target > 0 && (
                          <Typography variant="caption" color="text.secondary">/ {target}</Typography>
                        )}
                      </Box>
                      {target > 0 && (
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((count / target) * 100, 100)}
                          sx={{
                            width: '80%',
                            height: 4,
                            borderRadius: 2,
                            mt: 0.5,
                            '& .MuiLinearProgress-bar': { backgroundColor: groupColor }
                          }}
                        />
                      )}
                    </Box>
                  </TableCell>
                );
              })
              }
              
              {/* Total Recruitment Cell */}
              <TableCell align="center">
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography variant="h6" color="primary" fontWeight="bold">{filteredStats.totalRecruitment}</Typography>
                    {studyTargets.totalTarget > 0 && (
                      <Typography variant="caption" color="text.secondary">/ {studyTargets.totalTarget}</Typography>
                    )}
                  </Box>
                  {studyTargets.totalTarget > 0 && (
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((filteredStats.totalRecruitment / studyTargets.totalTarget) * 100, 100)}
                      sx={{ width: '80%', height: 4, borderRadius: 2, mt: 0.5 }}
                    />
                  )}
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Labels Breakdown Card */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                By Label
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {Object.entries(filteredStats.recruitmentByLabel || {}).map(([label, count]) => (
                  <Chip
                    key={label}
                    label={`${label}: ${count}`}
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: getPersistentLabelColor(label), color: getPersistentLabelColor(label) }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ============ EDIT START: Recruitment Progress Chart with Targets (2026-02-04) ============ */}
      {/* Recruitment Progress Chart - Shows progress towards targets for all groups */}
      {
        studyTargets.totalTarget > 0 && (
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
                  data: ['Total', ...progressChartGroupsBottomUp],
                  axisLabel: { fontSize: 12, fontWeight: 'bold' },
                },
                series: [
                  // Current recruitment (filled bars)
                  {
                    name: 'Current',
                    type: 'bar',
                    data: [
                      {
                        value: filteredStats.totalRecruitment,
                        itemStyle: {
                          color: '#1976d2',
                          borderRadius: [0, 4, 4, 0],
                        },
                      },
                      ...progressChartGroupsBottomUp.map((group) => ({
                        value: filteredStats.recruitmentByGroup?.[group] || 0,
                        itemStyle: {
                          color: getPersistentGroupColor(group),
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
                          : studyTargets.byGroup?.[progressChartGroupsBottomUp[idx - 1]] || 0;
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
                      ...progressChartGroupsBottomUp.map((group) => studyTargets.byGroup?.[group] || 0),
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
              style={{ height: `${Math.max(200, (progressTargetGroups.length + 1) * 60)}px`, width: '100%' }}
              opts={{ renderer: 'canvas' }}
              notMerge={true}
            />
          </Paper>
        )
      }
      {/* ============ EDIT END: Recruitment Progress Chart with Targets ============ */}

      {/* ============ EDIT START: Multi-level Label Hierarchy Display (2026-02-04) ============ */}
      {/* Label Definitions - Shows hierarchical label structure from study */}
      {
        studyTargets.labelHierarchy && studyTargets.labelHierarchy.length > 0 && (
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
                          size="small"
                          sx={{ bgcolor: getPersistentGroupColor(group), color: '#fff', fontWeight: 'bold' }}
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
                                  sx={{
                                    cursor: 'help',
                                    borderColor: getPersistentLabelColor(labelItem.label),
                                    color: getPersistentLabelColor(labelItem.label),
                                  }}
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
        )
      }
      {/* ============ EDIT END: Multi-level Label Hierarchy Display ============ */}

      {/* Charts Section */}
      <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>
        Recruitment Analytics
      </Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Group Distribution Pie Chart */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2 }}>
            {stats.totalRecruitment > 0 ? (
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

        {/* ============ EDIT START: Label Distribution flip card (2026-07-09) ============ */}
        {/* Label Distribution - flip card: front = % stacked bar by group, back = original count bar chart */}
        <Grid item xs={12} md={4}>
          <Box sx={{ perspective: '1200px', height: '332px' }}>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.6s',
                transform: labelCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front face - stacked % bar chart */}
              <Paper
                elevation={2}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  p: 2,
                  backfaceVisibility: 'hidden',
                  overflow: 'hidden',
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => setLabelCardFlipped(true)}
                  sx={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}
                  title="Show label count chart"
                >
                  <FlipCameraAndroidIcon fontSize="small" />
                </IconButton>
                {labelGroupPercentGroups.length > 0 ? (
                  <ReactECharts
                    option={labelGroupStackedPercentBarChartOption}
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
                      Label Distribution by Group (%)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      No data available for selected filters
                    </Typography>
                  </Box>
                )}
              </Paper>

              {/* Back face - original label count bar chart */}
              <Paper
                elevation={2}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  p: 2,
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  overflow: 'hidden',
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => setLabelCardFlipped(false)}
                  sx={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}
                  title="Show % breakdown chart"
                >
                  <FlipCameraAndroidIcon fontSize="small" />
                </IconButton>
                {Object.keys(stats.recruitmentByLabel || {}).length > 0 ? (
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
            </Box>
          </Box>
        </Grid>
        {/* ============ EDIT END: Label Distribution flip card ============ */}

        {/* Recruitment Overview Radar Chart - moved to third column */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2 }}>
            {filteredStats.totalRecruitment > 0 ? (
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
                            secondary={`${groupLabels.length} labels • ${stats.byGroup?.[group] || 0} subjects`}
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
              {/* Flip to percentage-stacked view */}
              <Tooltip title={wardChartType === 'pie' ? 'Not available for pie chart' : (wardChartPercentMode ? 'Show subject counts' : 'Show as percentage')}>
                <span>
                  <IconButton
                    size="small"
                    disabled={wardChartType === 'pie'}
                    onClick={() => setWardChartPercentMode((prev) => !prev)}
                    color={wardChartPercentMode ? 'primary' : 'default'}
                  >
                    <FlipCameraAndroidIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
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
                            secondary={`${groupLabels.length} labels • ${stats.byGroup?.[group] || 0} subjects`}
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
              {/* Flip to percentage-stacked view */}
              <Tooltip title={siteChartType === 'pie' ? 'Not available for pie chart' : (siteChartPercentMode ? 'Show subject counts' : 'Show as percentage')}>
                <span>
                  <IconButton
                    size="small"
                    disabled={siteChartType === 'pie'}
                    onClick={() => setSiteChartPercentMode((prev) => !prev)}
                    color={siteChartPercentMode ? 'primary' : 'default'}
                  >
                    <FlipCameraAndroidIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
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
      {/* <Paper elevation={3}>
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
            rows={recruitedTableData}
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
      </Paper> */}

      {/* Data Source Info */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Total records: {data?.total || 0}{(currentWard || currentGroup) ? ` | Filtered Screening: ${filteredTableData.length}` : ''} |
          Recruited listed: {recruitedTableData.length} |
          Last updated: {data?.meta?.lastUpdated || 'N/A'}
        </Typography>
      </Box>

      <Footer />
    </Box >
  );
};

export default TrackingCurrentPage;
