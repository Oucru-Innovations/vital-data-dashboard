import React, { useEffect, useState, useCallback } from 'react';
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
  TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { useSelector, useDispatch } from 'react-redux';
import Footer from '../../components/toolbars/Footer';
import MonthlyRecruitmentCard from '../../components/cards/TrackingMonthlyPage/MonthlyRecruitmentCard';
import RecruitmentTable from '../../components/tables/TrackingMonthlyPage/RecruitmentTable';
import StudyTimeline from '../../components/charts/TrackingMonthlyPage/StudyTimeline';
import { getPeriodTotalRecruitment, getStudyTimeline, getStudyTracking, getStudyLifetimeRecruitment, getPeriodTotalScreening } from '../../services/apiService';
import {
  inferMonthlyChanges,
  transposeData,
  processTimelineData,
} from './utils/recruitmentProcessing';
import { renderRecruitmentChart } from '../../components/charts/TrackingStudyPage/TimelineChart';
import ScreeningTable from '../../components/tables/TrackingMonthlyPage/ScreeningTable';
import { SiteSelection, WardSelection, ConditionFilter } from '../../components/filters';
import PatientDetailTable from '../../components/tables/TrackingMonthlyPage/PatientDetailTable';
import {
  setStudy,
  selectCurrentStudy,
  selectCurrentSite,
  selectCurrentWard,
  selectAlias,
  selectCurrentCondition,
} from '../../store/studySlice';
import {
  getProcessedStudies,
  getProcessedRecruitmentDetail,
  calculateMonthlyStats,
  generateScreeningSummary,
  generateRecruitmentDetails,
  isDevelopmentMode,
} from '../../services/fhirService';

const MonthlyReport = () => {
  // Redux state management
  const dispatch = useDispatch();

  // Get current filter selections from Redux store
  const currentStudy = useSelector(selectCurrentStudy);
  const currentSite = useSelector(selectCurrentSite);
  const currentWard = useSelector(selectCurrentWard);
  const currentCondition = useSelector(selectCurrentCondition);
  const alias = useSelector(selectAlias);

  // Local component state for recruitment data
  const [recruitmentData, setRecruitmentData] = useState({
    totalMonthly: [],
    studyData: [],
    timelineData: [],
    stages: [],
    loading: false
  });

  // Local component state for patient detail data
  const [patientData, setPatientData] = useState({
    patients: [],
    monthlyStats: [],
    loading: false
  });

  // Track whether we're using mock data generation or production API
  // This helps decide whether to block API updates in development mode
  const [usingMockGeneration, setUsingMockGeneration] = useState(false);

  // Local state for study selection
  // This keeps track of the studyCode (e.g., "54EI") for API calls
  // Changed from study name to studyCode for consistency with FHIR structure
  const [selectedStudy, setSelectedStudy] = useState(() => {
    // Initialize from localStorage or default to empty string
    return localStorage.getItem('selectedStudyCode') || '';
  });

  // Time period and date selection state
  const [selectedTimepoint, setSelectedTimepoint] = useState('weekly');
  const [endDate, setEndDate] = useState(new Date());

  /**
   * Fetch monthly recruitment tracking data
   *
   * This function retrieves aggregated recruitment data based on selected filters.
   * Currently uses only study filter, but is ready for site/ward filtering.
   *
   * TODO: Add site and ward parameters to API call
   * When backend supports site/ward filtering, update this call to:
   *
   * const response = await getStudyTracking({
   *   period: selectedTimepoint,
   *   limit: 12,
   *   sort: 'date DESC',
   *   end_date: endDate.toISOString().split('T')[0],
   *   study: selectedStudy,
   *   site: currentSite?.code,        // Add site filter
   *   ward: currentWard?.code,        // Add ward filter
   *   alias: alias                    // Or use computed alias
   * });
   *
   * The alias parameter is particularly useful as it automatically builds
   * hierarchical filters: "56EI" (study only), "56EI-003" (study+site),
   * or "56EI-003-1" (study+site+ward).
   */
  const fetchMonthlyData = async () => {
    try {
      // TODO REPLACE with BACKEND API: Update getStudyTracking call when backend supports hierarchical filtering
      // Expected API: GET /api/study-tracking
      // Expected parameters:
      //   - period: string - "daily", "weekly", "monthly", "quarterly", "yearly"
      //   - limit: number - max records to return
      //   - sort: string - sort order
      //   - end_date: string - filter data up to this date (YYYY-MM-DD)
      //   - study: string (required) - study code, e.g., "13NV"
      //   - site: string (optional) - site code, e.g., "003"
      //   - ward: string (optional) - ward code, e.g., "4"
      //   - condition: string (optional) - "CAP" or "VAP"
      // Expected response: { data: [{ date, recruited_number, cumulative_recruited, target }] }
      const response = await getStudyTracking({
        period: selectedTimepoint,
        limit: 12,
        sort: 'date DESC',
        end_date: endDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        study: selectedStudy
        // TODO REPLACE with BACKEND API: Uncomment when backend supports these parameters
        // site: currentSite?.code,
        // ward: currentWard?.code,
        // condition: currentCondition,
      });
      const monthlyTable = transposeData(response.data);
      console.log('monthlyTable', monthlyTable, inferMonthlyChanges(monthlyTable))
      const monthlyChange = inferMonthlyChanges(monthlyTable);

      // In development mode, check if we're using mock generation
      // If using mock generation: only update totalMonthly, keep generated studyData
      // If NOT using mock generation: update both (allows production API data for studies without mocks)
      if (isDevelopmentMode() && usingMockGeneration) {
        console.log('[fetchMonthlyData] Using mock generation, only updating totalMonthly');
        setRecruitmentData(prev => ({
          ...prev,
          totalMonthly: monthlyChange
        }));
      } else {
        console.log('[fetchMonthlyData] Using API data, updating studyData and totalMonthly');
        setRecruitmentData(prev => ({
          ...prev,
          studyData: monthlyTable,
          totalMonthly: monthlyChange
        }));
      }
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      setRecruitmentData(prev => ({
        ...prev,
        totalMonthly: []
      }));
    }
  };

  /**
   * Fetch study list (timeline data)
   *
   * This function populates the study dropdown with available studies.
   *
   * ENVIRONMENT-BASED BEHAVIOR:
   * ===========================
   * DEVELOPMENT MODE (localhost):
   * - Uses FHIR mock data from: src/mockData/fhir/getResearchStudy.json
   * - Processes ResearchStudy resources into study objects
   * - Provides: id, name, studyCode, status, site references
   *
   * PRODUCTION MODE:
   * - Calls backend API: getStudyTimeline()
   * - Returns processed timeline data from database
   *
   * WHY DUAL MODE:
   * ==============
   * - Development: Use FHIR structure to test site/ward filtering
   * - Production: Use existing timeline API for real data
   * - Both modes produce compatible study objects for dropdown
   *
   * STUDY OBJECT STRUCTURE:
   * ======================
   * {
   *   id: "Study54EI",
   *   name: "54EI Encephalitis Study",
   *   studyCode: "54EI",
   *   status: "active",
   *   site: [{ reference: "Organization/HospitalID" }]
   * }
   *
   * The studyCode is critical for site/ward filtering via alias patterns.
   */
  const fetchTimelineData = async () => {
    try {
      // Check if we're in development mode
      if (isDevelopmentMode()) {
        console.log('[MonthlyReport] DEVELOPMENT MODE: Using FHIR mock data for studies');

        // Fetch studies from FHIR mock data
        const studies = await getProcessedStudies();

        console.log(`[MonthlyReport] Loaded ${studies.length} studies from FHIR mock data`);
        console.log('[MonthlyReport] Sample studies:', studies.slice(0, 3));

        // Set timeline data with FHIR studies
        setRecruitmentData(prev => ({
          ...prev,
          timelineData: studies
        }));
      } else {
        console.log('[MonthlyReport] PRODUCTION MODE: Fetching studies from backend API');

        // Use existing timeline API (production)
        const response = await getStudyTimeline();
        const timelineTable = transposeData(response.data);
        const processedTimeline = processTimelineData(timelineTable);

        setRecruitmentData(prev => ({
          ...prev,
          timelineData: processedTimeline
        }));
      }
    } catch (error) {
      console.error('[MonthlyReport] Error fetching timeline/study data:', error);
      // Set empty array on error to prevent UI breaks
      setRecruitmentData(prev => ({
        ...prev,
        timelineData: []
      }));
    }
  };

  /**
   * Fetch screening data for the selected period
   *
   * Retrieves patient screening information based on filters.
   *
   * TODO: Add site and ward parameters to API call
   * When backend supports site/ward filtering, update this call to:
   *
   * const response = await getPeriodTotalScreening({
   *   period: selectedTimepoint,
   *   limit: 1,
   *   sort: 'date DESC',
   *   end_date: endDate.toISOString().split('T')[0],
   *   study: selectedStudy,
   *   site: currentSite?.code,        // Add site filter
   *   ward: currentWard?.code,        // Add ward filter
   *   alias: alias                    // Or use computed alias
   * });
   */
  const fetchScreeningData = async () => {
    try {
      // TODO REPLACE with BACKEND API: Update getPeriodTotalScreening call when backend supports hierarchical filtering
      // Expected API: GET /api/screening-summary
      // Expected parameters:
      //   - period: string - "daily", "weekly", "monthly", "quarterly", "yearly"
      //   - limit: number - max records to return
      //   - sort: string - sort order
      //   - end_date: string - filter data up to this date (YYYY-MM-DD)
      //   - study: string (required) - study code, e.g., "13NV"
      //   - site: string (optional) - site code, e.g., "003"
      //   - ward: string (optional) - ward code, e.g., "4"
      //   - condition: string (optional) - "CAP" or "VAP"
      // Expected response: { data: [{ date, study, screening_summary: { CAP: {...}, VAP: {...} } }] }
      const response = await getPeriodTotalScreening({
        period: selectedTimepoint,
        limit: 1,
        sort: 'date DESC',
        end_date: endDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        study: selectedStudy
        // TODO REPLACE with BACKEND API: Uncomment when backend supports these parameters
        // site: currentSite?.code,
        // ward: currentWard?.code,
        // condition: currentCondition,
      });
      const screeningTable = transposeData(response.data);
      console.log('screeningTable', screeningTable)

      // In development mode, check if we're using mock generation
      // If using mock generation: skip update, keep generated screeningData
      // If NOT using mock generation: update with API data (allows production API data for studies without mocks)
      if (isDevelopmentMode() && usingMockGeneration) {
        console.log('[fetchScreeningData] Using mock generation, skipping API update');
      } else {
        console.log('[fetchScreeningData] Using API data, updating screeningData');
        setRecruitmentData(prev => ({
          ...prev,
          screeningData: screeningTable
        }));
      }
    } catch (error) {
      console.error('Error fetching screening data:', error);
      // Only set empty array if not using mock generation
      if (!usingMockGeneration) {
        setRecruitmentData(prev => ({
          ...prev,
          screeningData: []
        }));
      }
    }
  };

  // const fetchRecruitmentData = async () => {
  //   try {
  //     const response = await getStudyTracking();
  //     const monthlyTable = transposeData(response);
  //     setRecruitmentData(prev => ({
  //       ...prev,
  //       studyData: monthlyTable,
  //     }));
  //   } catch (error) {
  //     console.error('Error fetching recruitment data:', error);
  //   }
  // };

  /**
   * Fetch lifetime recruitment data for a specific study
   *
   * Retrieves all-time recruitment statistics for the selected study.
   *
   * TODO: Add site and ward parameters to API call
   * When backend supports site/ward filtering, update this call to:
   *
   * const response = await getStudyLifetimeRecruitment(
   *   selectedStudy,
   *   currentSite?.code,    // Add site filter
   *   currentWard?.code     // Add ward filter
   * );
   *
   * Or modify the API service to accept an options object:
   * const response = await getStudyLifetimeRecruitment({
   *   study: selectedStudy,
   *   site: currentSite?.code,
   *   ward: currentWard?.code,
   *   alias: alias
   * });
   */
  const fetchStudyProgressData = async () => {
    try {
      const response = await getStudyLifetimeRecruitment(selectedStudy);
      const monthlyData = transposeData(response.data);
      setRecruitmentData(prev => ({
        ...prev,
        stages: monthlyData || []
      }));
    } catch (error) {
      console.error('Error fetching study progress data:', error);
    }
  };

  /**
   * Fetch recruitment detail (patient-level data)
   *
   * This function retrieves individual patient records and their journey through the study.
   * It uses the complete filter hierarchy: study → site → ward → condition.
   *
   * ENVIRONMENT-BASED BEHAVIOR:
   * ===========================
   * DEVELOPMENT MODE (localhost):
   * - Uses mock data from: src/mockData/tracking/
   * - File naming pattern: {studyCode}-{siteCode}-{wardCode} {condition}.json
   * - Examples:
   *   • "13NV.json" (study only)
   *   • "13NV-003.json" (study + site)
   *   • "13NV-003-4.json" (study + site + ward)
   *   • "13NV-003-4 CAP.json" (study + site + ward + condition)
   *
   * PRODUCTION MODE:
   * - Calls FHIR API: GET /ResearchSubject?study={study}&_include=ResearchSubject:subject
   * - Filters by study, site (via organization), ward (via managing org), condition
   * - Returns FHIR Bundle with ResearchSubject resources
   *
   * FILTER LOGIC:
   * =============
   * The function only fetches data when a study is selected (required minimum).
   * Site, ward, and condition are optional refinements.
   *
   * - studyCode: REQUIRED (e.g., "13NV")
   * - siteCode: OPTIONAL (e.g., "003" from currentSite.code)
   * - wardCode: OPTIONAL (e.g., "4" from currentWard.code)
   * - condition: OPTIONAL (e.g., "CAP" or "VAP" from currentCondition)
   *
   * DATA PROCESSING:
   * ================
   * 1. Fetches FHIR Bundle of ResearchSubject resources
   * 2. Preprocesses into patient summary objects with:
   *    - Basic info: id, screeningId, name, birthYear
   *    - Study info: condition, groups, ward, studyId
   *    - Status: currentStatus, statusText, reason
   *    - Dates: startDate, lastUpdate
   *    - Timeline: progress array with all states
   * 3. Calculates monthly statistics (screened, eligible, enrolled, etc.)
   *
   * EXAMPLE API RESPONSE STRUCTURE (FHIR):
   * =======================================
   * {
   *   "resourceType": "Bundle",
   *   "entry": [{
   *     "resource": {
   *       "resourceType": "ResearchSubject",
   *       "id": "3666",
   *       "extension": [
   *         { "url": ".../condition", "valueCodeableConcept": { "text": "CAP" } },
   *         { "url": ".../comparisonGroup", "valueId": "CAP" }
   *       ],
   *       "progress": [
   *         { "subjectState": { "coding": [{"code": "screening"}] }, "startDate": "2026-01-11" },
   *         { "subjectState": { "coding": [{"code": "on-study"}] }, "startDate": "2026-01-11" }
   *       ],
   *       "subject": {
   *         "identifier": [{ "value": "1" }],  // Screening ID
   *         "name": [{ "given": ["N1"] }],
   *         "link": [{ "other": { "name": [{ "given": ["13NV-165-0002-C"] }] } }]  // Study ID
   *       }
   *     }
   *   }]
   * }
   *
   * PROCESSED OUTPUT STRUCTURE:
   * ===========================
   * {
   *   id: "3666",
   *   screeningId: "1",
   *   name: "N1",
   *   birthYear: "2001",
   *   condition: "CAP",
   *   groups: ["CAP"],
   *   currentStatus: "on-study",
   *   statusText: "Enrolled",
   *   reason: "enrolled",
   *   startDate: "2026-01-11",
   *   lastUpdate: "2026-01-11",
   *   studyId: "13NV-165-0002-C",
   *   ward: "WardNTTHED",
   *   progress: [...]
   * }
   */
  const fetchRecruitmentDetail = useCallback(async () => {
    // Only fetch if a study is selected
    if (!selectedStudy) {
      console.log('[MonthlyReport] No study selected - skipping recruitment detail fetch');
      setPatientData({
        patients: [],
        monthlyStats: [],
        loading: false
      });
      return;
    }

    try {
      setPatientData(prev => ({ ...prev, loading: true }));

      // Extract ward code from matchedAlias if available
      // matchedAlias format: "13NV-003-0" → extract "0"
      // matchedAlias format: "13NV-003-4" → extract "4"
      let wardCode = null;
      if (currentWard?.matchedAlias) {
        const aliasParts = currentWard.matchedAlias.split('-');
        wardCode = aliasParts[aliasParts.length - 1]; // Get last part
      }

      console.log('[MonthlyReport] Fetching recruitment detail with filters:', {
        studyCode: selectedStudy,
        siteCode: currentSite?.code,
        wardCode: wardCode,
        wardObject: currentWard,
        condition: currentCondition,
      });

      // Build filters object for API call
      const filters = {
        studyCode: selectedStudy,
        siteCode: currentSite?.code,
        wardCode: wardCode,
        condition: currentCondition,
      };

      // Fetch and process patient data
      const patients = await getProcessedRecruitmentDetail(filters);

      console.log(`[MonthlyReport] Loaded ${patients.length} patients`);

      // Calculate monthly statistics from patient data
      const monthlyStats = calculateMonthlyStats(patients);

      console.log(`[MonthlyReport] Calculated ${monthlyStats.length} months of statistics`);

      // Update state with processed data
      setPatientData({
        patients,
        monthlyStats,
        loading: false
      });

      // In development mode, generate screening and recruitment data from patients if available
      if (isDevelopmentMode()) {
        if (patients.length > 0) {
          console.log('[MonthlyReport] Development mode: Generating screening summary and recruitment details from patient data');

          // Generate screening summary
          const screeningSummary = generateScreeningSummary(patients, selectedStudy, endDate);
          console.log('[MonthlyReport] Generated screening summary:', screeningSummary);

          // Generate recruitment details
          const recruitmentDetails = generateRecruitmentDetails(patients, selectedStudy, {
            endDate: endDate,
            limit: 12, // Show last 12 periods
            timepoint: selectedTimepoint, // Use selected timepoint for aggregation
          });
          console.log('[MonthlyReport] Generated recruitment details:', recruitmentDetails);

          // Update recruitment data state with generated data
          setRecruitmentData(prev => ({
            ...prev,
            screeningData: [screeningSummary],
            studyData: recruitmentDetails,
          }));

          // Mark that we're using mock generation - this prevents API from overwriting
          setUsingMockGeneration(true);
        } else {
          console.log('[MonthlyReport] Development mode: No patient data available (no mock file), allowing API to populate tables');
          // No mock data available - allow production API to populate these tables
          // This handles studies like 54EI that have production data but no mock files
          setUsingMockGeneration(false);

          // Clear any old generated data
          setRecruitmentData(prev => ({
            ...prev,
            screeningData: [],
            studyData: [],
          }));
        }
      }

    } catch (error) {
      console.error('[MonthlyReport] Error fetching recruitment detail:', error);

      // Set empty state on error
      setPatientData({
        patients: [],
        monthlyStats: [],
        loading: false
      });
    }
  }, [selectedStudy, currentSite, currentWard, currentCondition, selectedTimepoint, endDate]);

  /**
   * Effect: Fetch data when filters change
   *
   * Triggers data refresh when any filter selection changes:
   * - selectedStudy: Study name (current)
   * - selectedTimepoint: Data aggregation period (current)
   * - endDate: Report end date (current)
   *
   * TODO: Add site/ward dependencies when backend is ready
   * After backend implements site/ward filtering, add to dependency array:
   *
   * }, [selectedStudy, selectedTimepoint, endDate, currentSite, currentWard]);
   *
   * This will automatically refresh data when user changes site or ward selection.
   *
   * Note: We use selectedStudy (local state) instead of currentStudy (Redux state)
   * because API calls currently use the study name string. Once APIs are updated
   * to use full objects or the alias pattern, we can switch to Redux state entirely.
   */
  useEffect(() => {
    const fetchData = async () => {
      setRecruitmentData(prev => ({ ...prev, loading: true }));
      await Promise.all([
        fetchTimelineData(),
        fetchMonthlyData(),
        fetchScreeningData(),
        // fetchRecruitmentData(),
        // fetchStudyProgressData()
      ]);
      setRecruitmentData(prev => ({ ...prev, loading: false }));
    };
    fetchData();
    // TODO: Add currentSite, currentWard to dependencies when backend supports filtering
  }, [selectedStudy, selectedTimepoint, endDate]);

  /**
   * Effect: Fetch recruitment detail when filter selections change
   *
   * This separate effect handles patient-level recruitment detail data.
   * It depends on all filter selections to provide complete drill-down capability:
   *
   * FILTER HIERARCHY:
   * =================
   * - selectedStudy: REQUIRED - Must select a study first
   * - currentSite: OPTIONAL - Narrows to specific site
   * - currentWard: OPTIONAL - Narrows to specific ward
   * - currentCondition: OPTIONAL - Filters by CAP/VAP
   * - selectedTimepoint: Aggregation period for generated data (weekly, monthly, etc.)
   * - endDate: Report end date for filtering enrollments
   *
   * BEHAVIOR:
   * =========
   * When any filter changes, this effect triggers a new data fetch.
   * The fetch function handles the "no study selected" case internally.
   * Patient data is fetched once, then screening summary and recruitment details
   * are generated based on timepoint and endDate selections.
   *
   * EXAMPLE SCENARIOS:
   * ==================
   * 1. User selects "13NV" → Loads all 13NV patients
   * 2. User then selects site "003" → Reloads with 13NV-003 patients
   * 3. User then selects ward "4" → Reloads with 13NV-003-4 patients
   * 4. User then selects condition "CAP" → Reloads with 13NV-003-4 CAP patients
   * 5. User changes timepoint to "weekly" → Regenerates tables with weekly aggregation
   * 6. User changes end date → Regenerates tables with new date filter
   *
   * This provides seamless drill-down navigation through the data hierarchy.
   */
  useEffect(() => {
    fetchRecruitmentDetail();
  }, [selectedStudy, currentSite, currentWard, currentCondition, selectedTimepoint, endDate]);


  /**
   * Handle study selection change
   *
   * This function updates both local state and Redux state when user selects a study.
   *
   * IMPORTANT CHANGES:
   * ==================
   * - Dropdown value is now studyCode (e.g., "54EI") instead of study name
   * - This matches the FHIR identifier structure
   * - API calls will receive studyCode for filtering
   * - Site/ward filtering uses studyCode for alias pattern matching
   *
   * When a study is selected:
   * 1. Update local state with studyCode (e.g., "54EI")
   * 2. Persist studyCode to localStorage
   * 3. Find the full study object from timeline data by studyCode
   * 4. Dispatch setStudy action to Redux (clears site/ward automatically)
   *
   * EXAMPLE FLOW:
   * =============
   * User selects "54EI" from dropdown
   * → setSelectedStudy("54EI")
   * → localStorage.setItem("selectedStudyCode", "54EI")
   * → Find study object where studyCode === "54EI"
   * → Dispatch to Redux with full study object
   * → SiteSelection filters by prefix "54EI-"
   */
  const handleStudyChange = (event) => {
    const newStudyCode = event.target.value; // Now receives studyCode (e.g., "54EI")

    // Update local state with studyCode
    setSelectedStudy(newStudyCode);

    // Save studyCode to localStorage for persistence across page refreshes
    localStorage.setItem('selectedStudyCode', newStudyCode);

    // Update Redux state with full study object
    if (newStudyCode) {
      // Find the full study object from timelineData by studyCode
      const studyObject = recruitmentData.timelineData.find(
        (study) => study.studyCode === newStudyCode
      );

      if (studyObject) {
        console.log(`[MonthlyReport] Selected study: ${studyObject.name} (${newStudyCode})`);

        // Dispatch Redux action with full study object
        // This will automatically clear site and ward selections (see studySlice.js)
        dispatch(
          setStudy({
            id: studyObject.id,
            name: studyObject.name,
            studyCode: studyObject.studyCode,
            status: studyObject.status || 'active',
            site: studyObject.site || [],
          })
        );
      } else {
        console.warn(`[MonthlyReport] Study with code "${newStudyCode}" not found in timeline data`);
      }
    } else {
      // Clear study selection in Redux
      console.log('[MonthlyReport] Clearing study selection');
      dispatch(setStudy(null));
    }
  };

  const handleTimepointChange = (event) => {
    setSelectedTimepoint(event.target.value);
  };

  const handleEndDateChange = (newDate) => {
    setEndDate(newDate);
  };

  // const filteredData = selectedStudy
  //   ? recruitmentData.studyData.filter(study => study.study === selectedStudy)
  //   : recruitmentData.studyData;

  if (recruitmentData.loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }
console.log('recruitmentData', recruitmentData)
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Monthly Recruitment Report
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {/* Filter Controls Section
          This section contains all filter dropdowns arranged in a responsive grid:
          - Study: Primary filter (all other filters depend on this)
          - Site: Filtered by selected study's site references
          - Ward: Filtered by study-site combination using alias patterns
          - Timepoint: Data aggregation period (daily, weekly, monthly, etc.)
          - End Date: Last date to include in the report
      */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Study Selection Dropdown
            - Primary filter that drives site/ward options
            - Populates from timeline data (all available studies)
            - VALUE: studyCode (e.g., "54EI") not study name
            - DISPLAY: Shows both studyCode and name
            - Syncs with Redux store and localStorage
            - Changing study automatically clears site and ward (via Redux)
        */}
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Select Study</InputLabel>
            <Select
              value={selectedStudy}
              onChange={handleStudyChange}
              label="Select Study"
            >
              <MenuItem value="">All Studies</MenuItem>
              {recruitmentData.timelineData.map((study, idx) => (
                <MenuItem key={idx} value={study.studyCode}>
                  {study.studyCode} - {study.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Site Selection Dropdown
            - Shows only sites associated with selected study
            - Disabled when no study is selected
            - Managed by Redux state (see SiteSelection.jsx)
            - Changing site clears ward selection
        */}
        <Grid item xs={12} md={3}>
          <SiteSelection size="medium" fullWidth />
        </Grid>

        {/* Ward Selection Dropdown
            - Filtered by study-site alias pattern (e.g., "56EI-003-*")
            - Disabled when study OR site is not selected
            - Managed by Redux state (see WardSelection.jsx)
            - Shows ward name with matched alias for clarity
        */}
        <Grid item xs={12} md={3}>
          <WardSelection size="medium" fullWidth />
        </Grid>

        {/* Condition Filter Dropdown
            - Filters patients by medical condition (CAP/VAP)
            - Shows all conditions by default
            - Optional filter that works with study/site/ward
            - Managed by Redux state (see ConditionFilter.jsx)
            - Used for patient detail table filtering
        */}
        <Grid item xs={12} md={3}>
          <ConditionFilter size="medium" showLabel={true} sx={{ width: '100%' }} />
        </Grid>

        {/* Timepoint Selection Dropdown
            - Determines data aggregation period
            - Options: daily, weekly, monthly, quarterly, yearly
            - Independent of study/site/ward selection
        */}
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Select Timepoint</InputLabel>
            <Select
              value={selectedTimepoint}
              onChange={handleTimepointChange}
              label="Select Timepoint"
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
              <MenuItem value="yearly">Yearly</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* End Date Picker
            - Sets the last date to include in the report
            - Cannot select future dates
            - Used for historical reporting and filtering
        */}
        <Grid item xs={12} md={12}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={handleEndDateChange}
              slotProps={{ textField: { fullWidth: true } }}
              maxDate={new Date()}
            />
          </LocalizationProvider>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
        {
        // recruitmentData.totalMonthly?.length > 0 ? (
          recruitmentData.totalMonthly.map((monthData, index) => (
            <MonthlyRecruitmentCard
              key={index}
              date={monthData.date}
              totalRecruited={monthData.totalrecruited}
              change={monthData.change}
              loading={recruitmentData.loading}
            />
          ))
        // ) : (
        //   <MonthlyRecruitmentCard
        //     month="No Data"
        //     totalRecruited="0"
        //     change="0"
        //     loading={false}
        //   />
        // )
        }

      </Box>

      <Box sx={{ mt: 4 }}>
        {renderRecruitmentChart(recruitmentData.studyData)}
      </Box>

      <ScreeningTable data={recruitmentData.screeningData?.[0]} endDate={endDate} />

      <RecruitmentTable data={recruitmentData.studyData} endDate={endDate} />

      <StudyTimeline studies={recruitmentData.timelineData.filter(study => study.studyCode === selectedStudy)} />

      {/* Patient Detail Section
          This section shows individual patient recruitment details when a study is selected.

          FEATURES:
          =========
          - Displays patient-level screening and enrollment data
          - Shows patient journey through study stages
          - Sortable by any column
          - Expandable rows reveal complete timeline
          - Status color coding for quick identification
          - Condition badges (CAP/VAP)
          - Study ID for enrolled patients
          - Reasons for non-enrollment

          FILTERING:
          ==========
          Data is automatically filtered by current selections:
          - Study: REQUIRED (must select a study to see patients)
          - Site: OPTIONAL (narrows to specific hospital)
          - Ward: OPTIONAL (narrows to specific ward)
          - Condition: OPTIONAL (shows only CAP or VAP patients)

          VISIBILITY:
          ===========
          The table only appears when:
          1. A study is selected (selectedStudy is not empty)
          2. Data has finished loading (patientData.loading is false)

          This prevents showing an empty table or loading state unnecessarily.

          EMPTY STATE:
          ============
          If no patients match the current filters, the table displays
          a helpful empty state message suggesting filter adjustments.
      */}
      {selectedStudy && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 3 }} />
          <PatientDetailTable
            patients={patientData.patients}
            loading={patientData.loading}
            onRefresh={fetchRecruitmentDetail}
          />
        </Box>
      )}

      <Footer />
    </Box>
  );
};

export default MonthlyReport;
