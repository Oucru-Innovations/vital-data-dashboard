/**
 * TrackingWeekly.jsx - Weekly Recruitment Tracking Page
 *
 * This page displays weekly recruitment tracking data with hierarchical filtering.
 * It mirrors the MonthlyReport.jsx implementation but focuses on weekly data aggregation.
 *
 * KEY FEATURES:
 * =============
 * - Weekly recruitment summary cards showing recent week totals
 * - Recruitment table with weekly breakdown by study
 * - Study timeline visualization
 * - Hierarchical filtering: Study → Site → Ward → Condition
 * - Live filter updates - tables refresh when any filter changes
 *
 * DATA SOURCES:
 * =============
 * DEVELOPMENT MODE (localhost):
 * - Mock data from src/mockData/tracking/*.json
 * - Tables generated from patient-level mock data
 * - Allows testing without backend API
 *
 * PRODUCTION MODE:
 * - Backend APIs for aggregated data
 * - Real-time data from production database
 *
 * MIXED MODE SUPPORT:
 * ===================
 * The page intelligently handles studies that have mock data vs those that don't:
 * - Studies WITH mock files (e.g., 13NV): Uses generated data from patients
 * - Studies WITHOUT mock files (e.g., 54EI): Falls back to production API
 *
 * This is controlled by the `usingMockGeneration` flag.
 *
 * FILTER HIERARCHY:
 * =================
 * 1. Study (required) - Primary filter, enables other filters
 * 2. Site (optional) - Filtered by study's site references
 * 3. Ward (optional) - Filtered by study-site alias pattern
 * 4. Condition (optional) - Filters by CAP/VAP
 *
 * @see MonthlyReport.jsx - Monthly version with identical filter pattern
 * @see FILTER_IMPLEMENTATION_REPORT.md - Comprehensive documentation
 *
 * LAST UPDATED: 2026-01-15
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
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useSelector, useDispatch } from 'react-redux';

// Layout components
import Footer from '../../components/toolbars/Footer';

// Weekly page specific components
import WeeklyRecruitmentCard from '../../components/cards/TrackingWeeklyPage/WeeklyRecruitmentCard';
import RecruitmentTable from '../../components/tables/TrackingWeeklyPage/RecruitmentTable';
import StudyTimeline from '../../components/charts/TrackingWeeklyPage/StudyTimeline';

// Shared filter components (also used in MonthlyReport.jsx)
import { SiteSelection, WardSelection, ConditionFilter } from '../../components/filters';

// API services for production data
import { getPeriodTotalRecruitment, getPeriodTotalScreening, getStudyTimeline, getStudyTracking } from '../../services/apiService';

// Data processing utilities
import {
    inferWeeklyChanges,
    transposeData,
    processTimelineData,
} from './utils/recruitmentProcessing';

// Redux state management for filter selections
import {
    setStudy,
    selectCurrentSite,
    selectCurrentWard,
    selectCurrentCondition,
} from '../../store/studySlice';

// FHIR service for mock data and data generation in development mode
import {
    getProcessedStudies,
    getProcessedRecruitmentDetail,
    calculateMonthlyStats,
    generateScreeningSummary,
    generateRecruitmentDetails,
    isDevelopmentMode,
} from '../../services/fhirService';

/**
 * TrackingWeeklyPage Component
 *
 * Weekly recruitment tracking with hierarchical filtering support.
 * Supports filtering by: Study → Site → Ward → Condition
 *
 * ENVIRONMENT-BASED BEHAVIOR:
 * ===========================
 * DEVELOPMENT MODE (localhost):
 * - Uses mock data from: src/mockData/tracking/
 * - File pattern: {studyCode}-{siteCode}-{wardCode} {condition}.json
 * - Generates tables from patient data
 *
 * PRODUCTION MODE:
 * - Calls backend APIs with filter parameters
 * - Displays API response directly
 *
 * STATE MANAGEMENT:
 * =================
 * This component uses a combination of Redux and local state:
 *
 * REDUX STATE (shared across pages):
 * - currentSite: Currently selected site object
 * - currentWard: Currently selected ward object
 * - currentCondition: Currently selected condition (CAP/VAP)
 *
 * LOCAL STATE (page-specific):
 * - selectedStudy: Study code for API calls
 * - endDate: Report end date filter
 * - recruitmentData: All data for display components
 * - patientData: Participant-level data for generation
 * - usingMockGeneration: Flag to track data source
 *
 * WHY LOCAL + REDUX:
 * ==================
 * - Study selection is stored locally AND in localStorage for persistence
 * - Site/Ward/Condition are Redux because they need to sync between components
 * - recruitmentData is local because it's page-specific aggregated data
 */
const TrackingWeeklyPage = () => {
    // ============================================
    // REDUX STATE MANAGEMENT
    // ============================================
    const dispatch = useDispatch();

    /**
     * Get current filter selections from Redux store
     *
     * These selectors return the current filter state managed by studySlice.js:
     * - currentSite: { id, name, code, alias[] } or null
     * - currentWard: { id, name, code, matchedAlias } or null
     * - currentCondition: "CAP" | "VAP" | null
     *
     * Note: currentStudy from Redux is available but we use local selectedStudy
     * for API calls because some APIs need just the studyCode string
     */
    const currentSite = useSelector(selectCurrentSite);
    const currentWard = useSelector(selectCurrentWard);
    const currentCondition = useSelector(selectCurrentCondition);

    // ============================================
    // LOCAL COMPONENT STATE
    // ============================================

    /**
     * Recruitment data state
     *
     * Contains all aggregated data for display components:
     * - totalWeekly: Weekly summary card data
     * - studyData: Recruitment table rows
     * - timelineData: Study list for dropdown and timeline chart
     * - screeningData: Screening summary (generated in dev mode)
     * - loading: Loading state for UI feedback
     */
    const [recruitmentData, setRecruitmentData] = useState({
        totalWeekly: [],
        studyData: [],
        timelineData: [],
        screeningData: [],
        loading: false
    });

    /**
     * Participant detail data state (internal use only)
     *
     * Used for generating screening and recruitment data from patient-level mock data.
     * Not directly displayed in UI - only used for data generation in development mode.
     *
     * eslint-disable-next-line: setPatientData is used but ESLint doesn't detect it
     * because it's called indirectly via fetchRecruitmentDetail
     */
    // eslint-disable-next-line no-unused-vars
    const [patientData, setPatientData] = useState({
        patients: [],
        weeklyStats: [],
        loading: false
    });

    /**
     * Selected study state
     *
     * Initialized from localStorage to persist selection across page refreshes.
     * Stores the studyCode (e.g., "13NV") not the full study object.
     *
     * WHY LOCALSTORAGE:
     * - Preserves user's study selection between sessions
     * - Synced with Redux when study is selected via handleStudyChange
     */
    const [selectedStudy, setSelectedStudy] = useState(() => {
        return localStorage.getItem('selectedStudyCode') || '';
    });

    /**
     * End date for report filtering
     *
     * Default: Current date
     * Used to filter recruitment data up to this date
     */
    const [endDate, setEndDate] = useState(new Date());

    /**
     * Flag to track data source mode
     *
     * CRITICAL for mixed mode support (studies with/without mock data):
     *
     * true = Using mock generation
     *   - Participant data was loaded from mock files
     *   - Tables generated from patient data
     *   - Block API updates to prevent overwriting
     *
     * false = Using production API
     *   - No mock data available for selected study
     *   - Allow API to populate tables
     *   - Used for studies like 54EI that have production data
     *
     * @see MIXED_MODE_DATA_SOURCES_FIX.md for detailed explanation
     */
    const [usingMockGeneration, setUsingMockGeneration] = useState(false);

    /**
     * Fetch weekly recruitment data
     *
     * TODO REPLACE with BACKEND API: Update when backend supports hierarchical filtering
     * Expected API: GET /api/period-total-recruitment
     * Expected parameters:
     *   - period: string - "weekly"
     *   - end_date: string - filter data up to this date (YYYY-MM-DD)
     *   - study: string (optional) - study code, e.g., "13NV"
     *   - site: string (optional) - site code, e.g., "003"
     *   - ward: string (optional) - ward code, e.g., "4"
     *   - condition: string (optional) - "CAP" or "VAP"
     * Expected response: { data: [{ week, totalrecruited, change }] }
     */
    const fetchWeeklyData = useCallback(async () => {
        try {
            setRecruitmentData(prev => ({
                ...prev,
                loading: true
            }));

            const response = await getPeriodTotalRecruitment({
                period: 'weekly',
                end_date: endDate.toISOString().split('T')[0],
                // TODO REPLACE with BACKEND API: Uncomment when backend supports these parameters
                // study: selectedStudy,
                // site: currentSite?.code,
                // ward: currentWard?.code,
                // condition: currentCondition,
            });

            const weeklyTable = transposeData(response.data);
            const weeklyChange = inferWeeklyChanges(weeklyTable);

            setRecruitmentData(prev => ({
                ...prev,
                totalWeekly: weeklyChange,
                loading: false
            }));
        } catch (error) {
            console.error('Error fetching weekly data:', error);
            setRecruitmentData(prev => ({
                ...prev,
                totalWeekly: [],
                loading: false
            }));
        }
    }, [endDate]);

    /**
     * Fetch study timeline data
     *
     * In development mode, uses FHIR mock data.
     * In production mode, calls backend API.
     */
    const fetchTimelineData = useCallback(async () => {
        try {
            // Check if we're in development mode
            if (isDevelopmentMode()) {
                console.log('[TrackingWeekly] DEVELOPMENT MODE: Using FHIR mock data for studies');
                const studies = await getProcessedStudies();
                console.log(`[TrackingWeekly] Loaded ${studies.length} studies from FHIR mock data`);
                console.log('studies', studies);
                setRecruitmentData(prev => ({
                    ...prev,
                    timelineData: studies.map(s => ({
                        ...s,
                        name: s.studyCode,
                        start: s.period.start ? new Date(s.period.start) : null,
                        end: s.period.end ? new Date(s.period.end) : null,
                    }))
                }));
            } else {
                // Production mode - use existing API
                const response = await getStudyTimeline();
                const timelineTable = transposeData(response.data);
                const processedTimeline = processTimelineData(timelineTable);
                setRecruitmentData(prev => ({
                    ...prev,
                    timelineData: processedTimeline
                }));
            }
        } catch (error) {
            console.error('Error fetching timeline data:', error);
            setRecruitmentData(prev => ({
                ...prev,
                timelineData: []
            }));
        }
    }, []);

    /**
     * Fetch recruitment data (study tracking)
     *
     * TODO REPLACE with BACKEND API: Update when backend supports hierarchical filtering
     * Expected API: GET /api/study-tracking
     * Expected parameters:
     *   - period: string - "weekly"
     *   - limit: number - max records to return
     *   - sort: string - sort order
     *   - end_date: string - filter data up to this date (YYYY-MM-DD)
     *   - study: string (required) - study code, e.g., "13NV"
     *   - site: string (optional) - site code, e.g., "003"
     *   - ward: string (optional) - ward code, e.g., "4"
     *   - condition: string (optional) - "CAP" or "VAP"
     * Expected response: { data: [{ date, recruited_number, cumulative_recruited, target }] }
     */
    const fetchRecruitmentData = useCallback(async () => {
        try {
            const recruitment = await getStudyTracking({
                period: 'weekly',
                limit: 12,
                sort: 'date DESC',
                end_date: endDate.toISOString().split('T')[0],
                study: selectedStudy,
                // TODO REPLACE with BACKEND API: Uncomment when backend supports these parameters
                // site: currentSite?.code,
                // ward: currentWard?.code,
                // condition: currentCondition,
            });

            const recruitmentTable = transposeData(recruitment.data);

            const screening = await getPeriodTotalScreening({
                period: 'weekly',
                end_date: endDate.toISOString().split('T')[0],
                study: selectedStudy,
                // TODO REPLACE with BACKEND API: Uncomment when backend supports these parameters
                // site: currentSite?.code,
                // ward: currentWard?.code,
                // condition: currentCondition,
            });
            console.log('screening', screening.data.screening_summary);

            const weeklyTable = recruitmentTable.map((entry) => {
                // TODO match with dates
                const screeningIndex = screening.data.study.indexOf(entry.study);
                if (screeningIndex !== -1) {
                    return {
                        ...entry,
                        screened_number: screening.data.screening_summary[screeningIndex].screened[1] || 0,
                        cumulative_screened: screening.data.screening_summary[screeningIndex].cummulative_screened[1] || 0,
                    };
                }
                return {
                    ...entry,
                    screening_summary: null
                };
            });

            console.log('weeklyTable', weeklyTable);

            // In development mode, check if we're using mock generation
            // If using mock generation: skip update, keep generated studyData
            // If NOT using mock generation: update with API data
            if (isDevelopmentMode() && usingMockGeneration) {
                console.log('[fetchRecruitmentData] Using mock generation, skipping API update');
            } else {
                console.log('[fetchRecruitmentData] Using API data, updating studyData');
                setRecruitmentData(prev => ({
                    ...prev,
                    studyData: weeklyTable,
                }));
            }
        } catch (error) {
            console.error('Error fetching recruitment data:', error);
        }
    }, [endDate, selectedStudy, usingMockGeneration]);

    /**
     * Fetch recruitment detail (patient-level data)
     *
     * Uses hierarchical filtering: study → site → ward → condition
     * In development mode, loads mock data and generates tables.
     * In production mode, calls FHIR API.
     */
    const fetchRecruitmentDetail = useCallback(async () => {
        // Only fetch if a study is selected
        if (!selectedStudy) {
            console.log('[TrackingWeekly] No study selected - skipping recruitment detail fetch');
            setPatientData({
                patients: [],
                weeklyStats: [],
                loading: false
            });
            return;
        }

        try {
            setPatientData(prev => ({ ...prev, loading: true }));

            // Extract ward code from matchedAlias if available
            let wardCode = null;
            if (currentWard?.matchedAlias) {
                const aliasParts = currentWard.matchedAlias.split('-');
                wardCode = aliasParts[aliasParts.length - 1];
            }

            console.log('[TrackingWeekly] Fetching recruitment detail with filters:', {
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
                organization: currentWard ?? currentSite,
            };

            // Fetch and process patient data
            const patients = await getProcessedRecruitmentDetail(filters);
            // console.log('patients', patients);

            console.log(`[TrackingWeekly] Loaded ${patients.length} patients`);

            // Calculate weekly statistics from patient data
            const weeklyStats = calculateMonthlyStats(patients); // Reuse monthly stats calculation
            console.log('weeklyStats', weeklyStats);
            console.log(`[TrackingWeekly] Calculated ${weeklyStats.length} periods of statistics`);

            // Update state with processed data
            setPatientData({
                patients,
                weeklyStats,
                loading: false
            });

            // In development mode, generate screening and recruitment data from patients if available
            if (isDevelopmentMode()) {
                if (patients.length > 0) {
                    console.log('[TrackingWeekly] Development mode: Generating screening summary and recruitment details from patient data');

                    // Find the selected study object to get metadata
                    const studyObj = recruitmentData.timelineData.find(s => s.studyCode === selectedStudy);

                    // Generate screening summary
                    const screeningSummary = generateScreeningSummary(patients, studyObj || selectedStudy, endDate);
                    console.log('[TrackingWeekly] Generated screening summary:', screeningSummary);


                    // Generate recruitment details with weekly aggregation
                    const recruitmentDetails = generateRecruitmentDetails(patients, selectedStudy, {
                        endDate: endDate,
                        // Pass study end date for remaining weeks calculation
                        studyEndDate: studyObj?.period?.end ? new Date(studyObj.period.end) : null,
                        // Pass target recruitment number
                        targetRecruitment: studyObj?.recruitment?.targetNumber || studyObj?.recruitment?.target || studyObj?.targetRecruitmentNumber || studyObj?.target || 0,
                        limit: 12,
                        timepoint: 'weekly', // Always weekly for this page
                    });
                    console.log('[TrackingWeekly] Generated recruitment details:', recruitmentDetails);

                    // Calculate weekly changes from the generated data for the cards
                    // We can reuse inferWeeklyChanges which we updated to handle recruited_number/screened_number
                    const weeklySummary = inferWeeklyChanges(recruitmentDetails);

                    // Update recruitment data state with generated data
                    setRecruitmentData(prev => ({
                        ...prev,
                        screeningData: [screeningSummary],
                        studyData: recruitmentDetails,
                        totalWeekly: weeklySummary, // Update cards with generated data
                    }));

                    // Mark that we're using mock generation
                    setUsingMockGeneration(true);
                } else {
                    console.log('[TrackingWeekly] Development mode: No patient data available, allowing API to populate tables');
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
            console.error('[TrackingWeekly] Error fetching recruitment detail:', error);

            setPatientData({
                patients: [],
                weeklyStats: [],
                loading: false
            });
        }
    }, [selectedStudy, currentSite, currentWard, currentCondition, endDate]);

    // ============================================
    // EFFECTS - Data Fetching Triggers
    // ============================================

    /**
     * Effect: Fetch aggregated data when study or date changes
     *
     * This effect handles the main data fetching for display components.
     * Runs when:
     * - selectedStudy changes (user selects different study)
     * - endDate changes (user adjusts date filter)
     *
     * Fetches in parallel:
     * 1. fetchWeeklyData() - Weekly summary cards
     * 2. fetchTimelineData() - Study list for dropdown
     * 3. fetchRecruitmentData() - Recruitment table data
     *
     * NOTE: Site/ward/condition filters are NOT in dependencies here
     * because those are handled by fetchRecruitmentDetail separately.
     * This prevents duplicate API calls.
     */
    useEffect(() => {
        const fetchData = async () => {
            setRecruitmentData(prev => ({ ...prev, loading: true }));
            await Promise.all([
                fetchWeeklyData(),
                fetchTimelineData(),
                fetchRecruitmentData(),
            ]);
            setRecruitmentData(prev => ({ ...prev, loading: false }));
        };
        fetchData();
    }, [selectedStudy, endDate, fetchWeeklyData, fetchTimelineData, fetchRecruitmentData]);

    /**
     * Effect: Fetch patient-level data when ANY filter changes
     *
     * This effect handles hierarchical filter updates for mock data generation.
     * Runs when ANY filter changes:
     * - selectedStudy: Required base filter
     * - currentSite: Optional site refinement
     * - currentWard: Optional ward refinement
     * - currentCondition: Optional condition filter
     * - endDate: Date range filter
     *
     * WHY SEPARATE FROM ABOVE:
     * - This handles patient-level data for mock generation
     * - Responds to site/ward/condition changes for drill-down
     * - Above effect only cares about study/date for aggregated APIs
     *
     * FLOW:
     * 1. User changes filter (e.g., selects site "003")
     * 2. This effect triggers fetchRecruitmentDetail
     * 3. Participant data loads with new filter
     * 4. If patients found: Generate tables, set usingMockGeneration=true
     * 5. If no patients: Clear tables, set usingMockGeneration=false
     */
    useEffect(() => {
        fetchRecruitmentDetail();
    }, [selectedStudy, currentSite, currentWard, currentCondition, endDate, fetchRecruitmentDetail]);

    // ============================================
    // EVENT HANDLERS
    // ============================================

    /**
     * Handle study selection change
     *
     * Updates both local state and Redux when user selects a study.
     *
     * FLOW:
     * 1. User selects study from dropdown (e.g., "13NV")
     * 2. Update local state with studyCode
     * 3. Save to localStorage for persistence
     * 4. Find full study object from timelineData
     * 5. Dispatch to Redux (this clears site/ward automatically)
     *
     * REDUX SIDE EFFECTS (see studySlice.js):
     * - Sets currentStudy with full object
     * - Clears currentSite to null
     * - Clears currentWard to null
     * - Keeps currentCondition (condition filter is study-independent)
     *
     * @param {Event} event - Select change event
     */
    const handleStudyChange = (event) => {
        const studyCode = event.target.value;
        setSelectedStudy(studyCode);
        localStorage.setItem('selectedStudyCode', studyCode);

        // Find the full study object and dispatch to Redux
        const selectedStudyObj = recruitmentData.timelineData.find(
            (study) => study.studyCode === studyCode
        );

        if (selectedStudyObj) {
            dispatch(setStudy(selectedStudyObj));
        }
    };

    /**
     * Handle end date change
     *
     * Updates the report end date filter.
     * This triggers data refresh via useEffect dependencies.
     *
     * @param {Date} newDate - New end date from DatePicker
     */
    const handleEndDateChange = (newDate) => {
        setEndDate(newDate);
    };

    // ============================================
    // RENDER - Loading State
    // ============================================

    if (recruitmentData.loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    // ============================================
    // RENDER - Main UI
    // ============================================

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Weekly Recruitment Tracking
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {/* ==========================================
          FILTER CONTROLS SECTION
          ==========================================
          Hierarchical filter dropdowns arranged in a responsive grid.
          Filters appear progressively based on selections:
          1. Study - Always visible (primary filter)
          2. Site - Appears when study is selected
          3. Ward - Appears when study AND site are selected
          4. Condition - Appears when study is selected
          5. End Date - Always visible

          NOTE: This differs from MonthlyReport.jsx which shows all filters.
          Here we conditionally render for cleaner UX when no study selected.
      */}
            <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                    {/* Study Selection Dropdown
              Primary filter - drives all other filter options.
              VALUE: studyCode (e.g., "13NV")
              DISPLAY: "{studyCode} - {name}"
              Syncs with Redux and localStorage
          */}
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
                                {recruitmentData.timelineData.map((study) => (
                                    <MenuItem key={study.id || study.studyCode} value={study.studyCode}>
                                        {study.studyCode}
                                        {/* - {study.name} */}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Site Selection - Only show when study is selected
              Uses shared SiteSelection component from filters/
              Automatically filters by study's site references
              @see SiteSelection.jsx for implementation details
          */}
                    {selectedStudy && (
                        <Grid item xs={12} md={3}>
                            <SiteSelection />
                        </Grid>
                    )}

                    {/* Ward Selection - Only show when study AND site are selected
              Uses shared WardSelection component from filters/
              Filters by alias pattern: "{studyCode}-{siteCode}-*"
              @see WardSelection.jsx for implementation details
          */}
                    {selectedStudy && currentSite && (
                        <Grid item xs={12} md={2}>
                            <WardSelection />
                        </Grid>
                    )}

                    {/* Condition Filter - Only show when study is selected
              Filters patients by CAP or VAP condition
              @see ConditionFilter.jsx for implementation details
          */}
                    {selectedStudy && (
                        <Grid item xs={12} md={2}>
                            <ConditionFilter />
                        </Grid>
                    )}

                    {/* End Date Picker
              Sets the last date to include in reports.
              maxDate prevents selecting future dates.
          */}
                    <Grid item xs={12} md={2}>
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
            </Box>

            {/* ==========================================
          WEEKLY SUMMARY CARDS
          ==========================================
          Display cards showing recruitment totals for recent weeks.
          Shows week-over-week change indicators.
          Falls back to "No Data" card if no data available.
      */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
                {
                    recruitmentData.totalWeekly?.length > 0 ? (
                        recruitmentData.totalWeekly.map((weekData, index) => (
                            <WeeklyRecruitmentCard
                                key={index}
                                week={weekData.week}
                                totalRecruited={weekData.totalRecruited ?? weekData.totalrecruited}
                                totalScreened={weekData.totalScreened}
                                change={weekData.change}
                                loading={recruitmentData.loading}
                            />
                        ))
                    ) : (
                        <WeeklyRecruitmentCard
                            week="No Data"
                            totalRecruited="0"
                            change="0"
                            loading={false}
                        />
                    )}
            </Box>

            {/* ==========================================
          RECRUITMENT TABLE
          ==========================================
          Displays weekly recruitment data in tabular format.
          Data source depends on usingMockGeneration flag:
          - true: Data generated from patient mock data
          - false: Data from production API
      */}
            <RecruitmentTable data={recruitmentData.studyData} endDate={endDate} />

            {/* ==========================================
          STUDY TIMELINE CHART
          ==========================================
          Visual timeline showing study progress.
          Filters to show only selected study if one is chosen,
          otherwise shows all studies for comparison.
      */}
            <StudyTimeline
                studies={selectedStudy
                    ? recruitmentData.timelineData.filter(study => study.studyCode === selectedStudy)
                    : recruitmentData.timelineData
                }
                currentDate={endDate}
            />

            <Footer />
        </Box>
    );
};

export default TrackingWeeklyPage;
