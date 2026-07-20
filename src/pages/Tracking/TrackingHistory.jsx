/**
 * TrackingHistory.jsx - Historical Recruitment Tracking Page
 *
 * Displays historical recruitment data with charts, screening summary,
 * recruitment details, and patient-level drill-down using FHIR mock data.
 *
 * Cloned from MonthlyReport.jsx with simplified data flow:
 * - Uses only fhirService functions for data loading
 * - Site/Ward/Group filters use the shared, Redux-integrated SiteSelection/
 *   WardSelection/GroupFilter components (same pattern as TrackingCurrent.jsx -
 *   "condition" has been migrated to "group" throughout; ConditionFilter/
 *   currentCondition are the legacy CAP/VAP-only concept and should not be used),
 *   so selections are dispatched to Redux and reach the fetch (see fetchPatientData)
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
  LinearProgress,
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
  Button,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { useSelector } from 'react-redux';
import ReactECharts from 'echarts-for-react';

// Layout components
import Footer from '../../components/toolbars/Footer';

// Shared filter components (Redux-integrated: all read currentStudy/currentSite/
// currentWard directly from Redux rather than via props; GroupFilter/currentGroup
// is the current concept - "condition" was migrated to "group")
import { StudySelection, SiteSelection, WardSelection, GroupFilter } from '../../components/filters';

// Existing reusable components from MonthlyReport
import RecruitmentTable from '../../components/tables/TrackingMonthlyPage/RecruitmentTable';

// Redux state management
import {
  selectCurrentStudy,
  selectCurrentSite,
  selectCurrentWard,
  selectCurrentGroup,
  selectAlias,
} from '../../store/studySlice';

// FHIR service functions for data loading and processing
import {
  getProcessedScreeningDetail,
  calculateMonthlyStats,
  generateRecruitmentDetails,
} from '../../services/fhirService';

// Shared chart color palette utilities
import { STATUS_COLORS, heatColorForPercent } from '../../utils/colorPalette';

// Shared ward/site organization-hierarchy helper
import { wardCodeToSite } from '../../utils/orgHierarchy';

// Shared CSV export utility
import { downloadCsv } from '../../utils/csvExport';

// Percentage a reason token's count represents of a row's total screened patients
const reasonPercent = (count, screened) => (screened > 0 ? (count / screened) * 100 : 0);

/**
 * Renders a Type/Category screening breakdown table (with dynamic per-reason
 * heat-mapped percentage columns) paired with its stacked-bar chart and a CSV
 * download button. Shared between the Group/Site and Ward screening summary
 * sections, which previously duplicated this ~80-line block.
 */
const ScreeningSummaryPanel = ({ title, chartSubtitle, rows, reasonHeaders, chartOption, chartHeight, onDownload }) => (
  <Box sx={{ mt: 4 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
        {title}
      </Typography>
      <Button size="small" startIcon={<DownloadIcon />} onClick={onDownload}>
        Download CSV
      </Button>
    </Box>
    <Grid container spacing={2}>
      <Grid item xs={12} md={5}>
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: chartHeight }}>
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
                {reasonHeaders.map((reason) => (
                  <TableCell align="right" key={reason}><strong>{reason}</strong></TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.type || '—'}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell align="right">{row.screened}</TableCell>
                  <TableCell align="right">{row.enrolled}</TableCell>
                  <TableCell align="right">{row.ineligible}</TableCell>
                  <TableCell align="right">{row.declined}</TableCell>
                  <TableCell align="right">{row.other}</TableCell>
                  {reasonHeaders.map((reason) => {
                    const count = row.reasons?.[reason] || 0;
                    const percent = reasonPercent(count, row.screened);
                    const heat = heatColorForPercent(percent);
                    return (
                      <TableCell
                        align="right"
                        key={reason}
                        sx={{ backgroundColor: heat.color, color: heat.dark ? '#fff' : 'inherit' }}
                      >
                        {percent.toFixed(0)}%
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
      <Grid item xs={12} md={7}>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {chartSubtitle}
          </Typography>
          <ReactECharts
            option={chartOption}
            style={{ height: `${chartHeight}px`, width: '100%' }}
            opts={{ renderer: 'canvas' }}
            notMerge={true}
          />
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

const TrackingHistory = () => {
  // Redux state - Study/Site/Ward/Group are all owned by the shared StudySelection/
  // SiteSelection/WardSelection/GroupFilter components, which dispatch them to Redux.
  // currentGroup is a full group object (e.g. {name: "CAP", ...}), not a plain string.
  const currentStudy = useSelector(selectCurrentStudy);
  const currentSite = useSelector(selectCurrentSite);
  const currentWard = useSelector(selectCurrentWard);
  const currentGroup = useSelector(selectCurrentGroup);
  // Computed alias pattern ("{studyCode}-{siteCode}-{wardAlias}"), used for the
  // CSV export filename instead of re-deriving study/site/ward manually there.
  const alias = useSelector(selectAlias);

  // Study code derived from Redux (StudySelection owns fetching/persisting/dispatching it)
  const selectedStudy = currentStudy|| '';

  // Time period and date selection
  const [selectedTimepoint, setSelectedTimepoint] = useState('weekly');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(new Date());

  // Default Start Date to the selected study's period start whenever the study changes,
  // so the chart initially shows the study's full recruitment window rather than nothing.
  // Keyed on the study's period.start string (not the study object, which may change
  // identity every render) so it doesn't stomp a manual Start Date edit on unrelated re-renders.
  const studyPeriodStart = selectedStudy?.period?.start || null;
  useEffect(() => {
    setStartDate(studyPeriodStart ? new Date(studyPeriodStart) : null);
  }, [studyPeriodStart]);

  // Loading state (used for initial page load spinner)
  const [loading] = useState(false);

  // Participant data from mock tracking files
  const [patientData, setPatientData] = useState({
    patients: [],
    monthlyStats: [],
    loading: false,
  });

  // Real attained/total progress for the slow, per-patient reference-resolution loop in
  // getRecruitmentDetail's production-mode path (see fhirService.js). null when not fetching
  // or in mock mode (that path has no per-item loop, so no progress events are emitted).
  const [fetchProgress, setFetchProgress] = useState(null);

  // Generated recruitment/screening data for charts and tables
  const [recruitmentData, setRecruitmentData] = useState({
    studyData: [],          // For RecruitmentTable and charts
    screeningData: [],      // For screening summary
  });

  // Primary client-side ward/group filter: fetchPatientData only scopes its fetch by
  // study/site (see comment there), so Ward and Group narrowing happens entirely here
  // against the already-loaded dataset - no extra fetch per Ward/Group change. Ward
  // Organization `id` (e.g. "WardHTDED", from getOrganizationWard.json) matches the raw
  // `p.ward` string on patient records (both ultimately come from the same
  // managingOrganization reference id), so it's a reliable client-side filter.
  const filteredPatients = useMemo(() => {
    let filtered = patientData.patients;
    if (currentWard?.id) {
      filtered = filtered.filter(p => p.ward === currentWard.id);
    }
    const groupName = currentGroup?.name;
    if (groupName) {
      filtered = filtered.filter(p =>
        p.condition === groupName ||
        (p.groups && p.groups.includes(groupName))
      );
    }
    return filtered;
  }, [patientData.patients, currentWard, currentGroup]);

  // Local fallback options for WardSelection/GroupFilter, derived from the already-loaded
  // (Study+Site-scoped) patient data - see LOCAL FALLBACK docs on those components. Sourced
  // from the unfiltered patientData.patients (not filteredPatients) so the dropdown keeps
  // showing every ward/group option even after narrowing the current selection to one.
  // Ward codes strip the "Ward" prefix (matching WardSelection's `id: Ward${code}`
  // synthesis) so the reconstructed id equals the raw p.ward string filteredPatients matches against.
  const localWardOptions = useMemo(() => {
    const counts = {};
    patientData.patients.forEach((p) => {
      if (!p.ward) return;
      const code = p.ward.replace(/^Ward/i, '');
      counts[code] = (counts[code] || 0) + 1;
    });
    return Object.entries(counts).map(([code, count]) => ({ code, count }));
  }, [patientData.patients]);

  /**
   * Fetch patient-level data from mock tracking files
   * Uses getProcessedRecruitmentDetail which auto-selects mock file based on filters.
   *
   * IMPORTANT: This only fetches by Study + Site. Ward and Group are deliberately
   * NOT passed here and NOT in the dependency array - in mock mode, getScreeningDetail
   * picks an increasingly specific mock file per ward/group combination, which means
   * including them here would re-fetch a whole new dataset on every Ward/Group change
   * instead of filtering the data already loaded. Ward/Group narrowing is handled
   * entirely client-side by `filteredPatients` below, matching TrackingCurrent's
   * fetch-by-Site-then-filter-locally pattern.
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
        studyCode: selectedStudy?.studyCode || selectedStudy,
        siteCode: currentSite?.code,
        // Required by inferRecruitmentQuery's production-mode site filter, which only
        // scopes the query when BOTH siteCode and organization.id are present (see
        // fhirService.js). Without this, the site filter is silently skipped and every
        // site's data is returned. Ward stays client-side filtered (see filteredPatients).
        organization: currentSite || null,
      };

      const patients = await getProcessedScreeningDetail(filters, (attained, total) =>
        setFetchProgress({ attained, total })
      );
      const monthlyStats = calculateMonthlyStats(patients);

      setPatientData({ patients, monthlyStats, loading: false });

    } catch (error) {
      console.error('[TrackingHistory] Error fetching patient data:', error);
      setPatientData({ patients: [], monthlyStats: [], loading: false });
    } finally {
      setFetchProgress(null);
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
      // selectedStudy.groups[].name + description -> {name: description}
      const targetPerGroup = selectedStudy?.group?.reduce((acc, g) => {
        acc[g.name] = parseInt(g.description) || 0;
        return acc;
      }, {'Total': selectedStudy?.recruitment?.targetNumber || 0}) || {'Total': selectedStudy?.recruitment?.targetNumber || 0};
      let studyData = generateRecruitmentDetails(filteredPatients, selectedStudy, {

        targetRecruitment: targetPerGroup[currentGroup?.name || 'Total'] || 0,
        studyStartDate: selectedStudy?.period?.start ? new Date(selectedStudy.period.start) : null,
        studyEndDate: selectedStudy?.period?.end ? new Date(selectedStudy.period.end) : null,
        startDate,
        endDate,
        limit: null,
        timepoint: selectedTimepoint,
      });

      // generateRecruitmentDetails still emits zero-filled periods from the study's calendar
      // start (needed so cumulative sums stay correct), so truncate the chart's visible window
      // here rather than passing startDate as studyStartDate, which would reset cumulative counts.
      if (startDate) {
        studyData = studyData.filter(row => !row.periodStart || new Date(row.periodStart) >= startDate);
      }

      setRecruitmentData({
        studyData,
        screeningData: [], // Screening summary now uses screeningStats from filteredPatients
      });
    } catch (error) {
      console.error('[TrackingHistory] Error generating chart data:', error);
    }
  }, [filteredPatients, selectedStudy, selectedTimepoint, startDate, endDate]);

  // Fetch patient data when study or site changes
  // (fetchPatientData changes identity when either changes, see its deps above;
  // Ward/Group narrowing is applied client-side via filteredPatients, not by re-fetching)
  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);

  // ===== CHART OPTIONS (derived from recruitmentData.studyData) =====

  // Aggregate studyData by period (sum across categories/groups)
  const chartData = useMemo(() => {
    console.log('[TrackingHistory] chartData input - studyData rows:', recruitmentData.studyData.length);
    
    console.log('[TrackingHistory] chartData input - raw:', recruitmentData);
    
    const byPeriod = {};
    recruitmentData.studyData.forEach(row => {
      console.log('date', row.date, byPeriod[row.date], row);
      if (!byPeriod[row.date]) {
        byPeriod[row.date] = { recruited: 0, cumRecruited: 0, screened: 0, cumScreened: 0, periodIndex: row.period_index, periodStart: row.periodStart };
      }
      byPeriod[row.date].recruited += row.recruited_number || 0;
      byPeriod[row.date].screened += row.screened_number || 0;
      // For cumulative, take the max across categories (they overlap for Total)
      byPeriod[row.date].cumRecruited = Math.max(byPeriod[row.date].cumRecruited, row.cumulative_recruited || 0);
      byPeriod[row.date].cumScreened = Math.max(byPeriod[row.date].cumScreened, row.cumulative_screened || 0);
    });
    const periods = Object.keys(byPeriod).sort();

    // Target calculations
    const totalTarget = recruitmentData.studyData.find(r => r.target)?.target || 0;
    const totalPeriods = periods.length;
    const cumRecruited = periods.map(p => byPeriod[p].cumRecruited);

    // The visible window (periods) may only be the most recent slice of a longer study
    // (see generateRecruitmentDetails' `limit` option). totalPeriodsCount/absoluteIndex let us
    // position the target lines at their true place in the overall study (based on real
    // calendar time, via period_index from generateRecruitmentDetails) instead of resetting
    // them to "period 1" at the left edge of the chart.
    const totalPeriodsCount = recruitmentData.studyData.find(r => r.total_periods)?.total_periods || totalPeriods;
    const absoluteIndices = periods.map((p, i) =>
      byPeriod[p].periodIndex != null ? byPeriod[p].periodIndex : Math.max(0, totalPeriodsCount - totalPeriods) + i
    );

    // Static target: linear distribution (total / overall periods, evenly spread)
    const cumTarget = periods.map((_, i) =>
      Math.round(totalTarget * (absoluteIndices[i] + 1) / totalPeriodsCount)
    );
    console.log('[DEBUG TrackingHistory] static target for periods', periods, 'absoluteIndices', absoluteIndices, 'cumTarget', cumTarget);
    // Adaptive target: recalculates each period based on actual recruitment.
    // actualBeforeWindow is the true cumulative recruited immediately before the visible window
    // (derived from the already-cumulative cumRecruited data), so the adaptive line starts from
    // where the study actually stands rather than assuming a fresh start at the window's edge.
    const actualBeforeWindow = cumRecruited.length > 0
      ? cumRecruited[0] - (byPeriod[periods[0]].recruited || 0)
      : 0;
    const adaptiveCumTarget = [];
    for (let i = 0; i < periods.length; i++) {
      const absoluteIndex = absoluteIndices[i];
      const actualPrev = i === 0 ? actualBeforeWindow : cumRecruited[i - 1];
      const remaining = Math.max(0, totalTarget - actualPrev);
      const remainingPeriods = totalPeriodsCount - absoluteIndex;
      const needed = remainingPeriods > 0 ? Math.ceil(remaining / remainingPeriods) : remaining;
      console.log(`[DEBUG TrackingHistory] adaptive target for period ${periods[i]} (absolute index ${absoluteIndex}): actualPrev=${actualPrev}, remaining=${remaining}, remainingPeriods=${remainingPeriods}, needed=${needed}`);
      adaptiveCumTarget.push(actualPrev + needed);
    }

    console.log('[TrackingHistory] chartData output - periods:', periods, 'target:', totalTarget, 'obj', {
      
      periods,
      recruited: periods.map(p => byPeriod[p].recruited),
      cumRecruited,
      screened: periods.map(p => byPeriod[p].screened),
      cumScreened: periods.map(p => byPeriod[p].cumScreened),
      cumTarget,
      adaptiveCumTarget,
      totalTarget,
    }
    );
    // Date-paired series for the cumulative charts, which use a real time axis so gaps
    // between periods render as proportional visual space instead of an even category step.
    const dateOf = p => byPeriod[p].periodStart || p;
    const cumScreened = periods.map(p => byPeriod[p].cumScreened);

    return {
      periods,
      recruited: periods.map(p => byPeriod[p].recruited),
      screened: periods.map(p => byPeriod[p].screened),
      totalTarget,
      cumRecruitedByDate: periods.map((p, i) => [dateOf(p), cumRecruited[i]]),
      cumScreenedByDate: periods.map((p, i) => [dateOf(p), cumScreened[i]]),
      cumTargetByDate: periods.map((p, i) => [dateOf(p), cumTarget[i]]),
      adaptiveCumTargetByDate: periods.map((p, i) => [dateOf(p), adaptiveCumTarget[i]]),
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
    xAxis: { type: 'time', axisLabel: { rotate: 30, formatter: '{yyyy}-{MM}-{dd}' } },
    yAxis: { type: 'value', name: 'Cumulative Recruited' },
    series: [
      {
        name: 'Cumulative Recruited',
        type: 'line',
        data: chartData.cumRecruitedByDate,
        smooth: true,
        areaStyle: { opacity: 0.15 },
        itemStyle: { color: '#2e7d32' },
        lineStyle: { width: 2 },
      },
      {
        name: 'Planned Target',
        type: 'line',
        data: chartData.cumTargetByDate,
        lineStyle: { width: 2, type: 'dashed' },
        itemStyle: { color: '#d32f2f' },
        symbol: 'none',
      },
      {
        name: 'Adaptive Target',
        type: 'line',
        data: chartData.adaptiveCumTargetByDate,
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
    xAxis: { type: 'time', axisLabel: { rotate: 30, formatter: '{yyyy}-{MM}-{dd}' } },
    yAxis: { type: 'value', name: 'Cumulative Screened' },
    series: [{
      name: 'Cumulative Screened',
      type: 'line',
      data: chartData.cumScreenedByDate,
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
      return wardCodeToSite(ward) || ward.slice(0, 4) || 'Unknown';
    };

    // Catch-all/non-informative reason tokens that shouldn't get their own breakdown column
    const EXCLUDED_REASON_TOKENS = ['no exclusion reason', 'others', 'enrolled'];

    // A patient's reason may already be a single string or an array of reasons.
    // 1. Concatenate whatever we have into one comma-joined string, then split it back
    //    apart so both shapes end up normalized to the same flat list of trimmed tokens.
    const getReasonTokens = (patient) => {
      const raw = Array.isArray(patient.reason) ? patient.reason.join(',') : (patient.reason || '');
      return raw.split(',')
        .map(r => r.trim())
        .filter(r => r && !EXCLUDED_REASON_TOKENS.some(token => r.toLowerCase().includes(token)));
    };

    const init = () => ({ screened: 0, enrolled: 0, ineligible: 0, declined: 0, other: 0, reasons: {} });
    const incrementReasonCounts = (bucket, tokens) => {
      tokens.forEach(token => {
        bucket.reasons[token] = (bucket.reasons[token] || 0) + 1;
      });
    };
    const byGroup = {};
    const bySite = {};
    const byWard = {};
    const total = init();
    // 2. Set of every unique reason token seen, used as the dynamic breakdown header
    const reasonSet = new Set();

    filteredPatients.forEach(p => {
      // console.log('hehe',p);
      const status = classify(p);
      const reasonTokens = getReasonTokens(p);
      reasonTokens.forEach(token => reasonSet.add(token));

      total.screened++;
      total[status]++;
      // 3. Count of occurrence per reason token
      incrementReasonCounts(total, reasonTokens);

      (p.groups || []).forEach(g => {
        if (!byGroup[g]) byGroup[g] = init();
        byGroup[g].screened++;
        byGroup[g][status]++;
        incrementReasonCounts(byGroup[g], reasonTokens);
      });

      const site = wardToSite(p.ward);
      if (!bySite[site]) bySite[site] = init();
      bySite[site].screened++;
      bySite[site][status]++;
      incrementReasonCounts(bySite[site], reasonTokens);

      const ward = p.ward || 'Unknown';
      if (!byWard[ward]) byWard[ward] = init();
      byWard[ward].screened++;
      byWard[ward][status]++;
      incrementReasonCounts(byWard[ward], reasonTokens);
    });

    // "No INC #N" (non-inclusion) reasons are listed before "EXC #N" (exclusion) reasons,
    // with any other reason token trailing after both; numeric-aware within each group
    // so "#2" sorts before "#10".
    const reasonGroupPriority = (token) => {
      if (/^no\s*inc/i.test(token)) return 0;
      if (/^exc/i.test(token)) return 1;
      return 2;
    };
    const reasonHeaders = Array.from(reasonSet).sort((a, b) => {
      const priorityDiff = reasonGroupPriority(a) - reasonGroupPriority(b);
      return priorityDiff !== 0 ? priorityDiff : a.localeCompare(b, undefined, { numeric: true });
    });

    // Build table rows: by Group, by Site, then Total (Ward gets its own table below)
    const rows = [];
    Object.keys(byGroup).sort().forEach(g => {
      rows.push({ id: `group-${g}`, category: g, type: 'Group', ...byGroup[g] });
    });
    Object.keys(bySite).sort().forEach(s => {
      rows.push({ id: `site-${s}`, category: s, type: 'Site', ...bySite[s] });
    });
    rows.push({ id: 'total', category: 'Total', type: '', ...total });

    // Build chart data - groups & sites only
    const chartCategories = [
      ...Object.keys(byGroup).sort().map(g => `[G] ${g}`),
      ...Object.keys(bySite).sort().map(s => `[S] ${s}`),
    ];
    const chartEnrolled = [
      ...Object.keys(byGroup).sort().map(g => byGroup[g].enrolled),
      ...Object.keys(bySite).sort().map(s => bySite[s].enrolled),
    ];
    const chartIneligible = [
      ...Object.keys(byGroup).sort().map(g => byGroup[g].ineligible),
      ...Object.keys(bySite).sort().map(s => bySite[s].ineligible),
    ];
    const chartDeclined = [
      ...Object.keys(byGroup).sort().map(g => byGroup[g].declined),
      ...Object.keys(bySite).sort().map(s => bySite[s].declined),
    ];
    const chartOther = [
      ...Object.keys(byGroup).sort().map(g => byGroup[g].other),
      ...Object.keys(bySite).sort().map(s => bySite[s].other),
    ];

    // Ward table rows + chart data, kept separate so the ward breakdown gets its own summary section
    const wardTotal = init();
    Object.keys(byWard).forEach(w => {
      wardTotal.screened += byWard[w].screened;
      wardTotal.enrolled += byWard[w].enrolled;
      wardTotal.ineligible += byWard[w].ineligible;
      wardTotal.declined += byWard[w].declined;
      wardTotal.other += byWard[w].other;
      Object.entries(byWard[w].reasons).forEach(([token, count]) => {
        wardTotal.reasons[token] = (wardTotal.reasons[token] || 0) + count;
      });
    });
    const wardRows = Object.keys(byWard).sort().map(w => ({ id: `ward-${w}`, category: w, type: 'Ward', ...byWard[w] }));
    wardRows.push({ id: 'ward-total', category: 'Total', type: '', ...wardTotal });

    const wardChartCategories = Object.keys(byWard).sort();
    const wardChartEnrolled = Object.keys(byWard).sort().map(w => byWard[w].enrolled);
    const wardChartIneligible = Object.keys(byWard).sort().map(w => byWard[w].ineligible);
    const wardChartDeclined = Object.keys(byWard).sort().map(w => byWard[w].declined);
    const wardChartOther = Object.keys(byWard).sort().map(w => byWard[w].other);

    return {
      rows, chartCategories, chartEnrolled, chartIneligible, chartDeclined, chartOther, total,
      wardRows, wardChartCategories, wardChartEnrolled, wardChartIneligible, wardChartDeclined, wardChartOther, wardTotal,
      reasonHeaders,
    };
  }, [filteredPatients]);

  /**
   * Export a screening summary table (rows + dynamic reason columns) as a CSV download
   */
  const downloadScreeningSummaryCsv = useCallback((rows, reasonHeaders, filename) => {
    const headers = ['Type', 'Category', 'Screened', 'Enrolled', 'Ineligible', 'Declined', 'Other', ...reasonHeaders];
    const csvRows = rows.map(row => [
      row.type || '',
      row.category,
      row.screened,
      row.enrolled,
      row.ineligible,
      row.declined,
      row.other,
      ...reasonHeaders.map(reason => row.reasons?.[reason] || 0),
    ]);
    downloadCsv(headers, csvRows, filename);
  }, []);

  /**
   * Build the CSV filename: ScreeningTable_{StudyId[-Site][-Ward][-Group]}_{dd.MM.YYYY.hh.mm.ss}_.csv
   * Uses the `alias` computed selector (already composes study/site/ward into one
   * pattern, e.g. "13NV-003-4") instead of re-inferring each part here, plus the
   * current group appended separately since alias doesn't include it.
   */
  const buildScreeningCsvFilename = useCallback(() => {
    const idParts = [alias || selectedStudy || 'Study'];
    if (currentGroup?.name) idParts.push(currentGroup.name);

    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const timestamp = [
      pad(now.getDate()), pad(now.getMonth() + 1), now.getFullYear(),
      pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds()),
    ].join('.');

    return `ScreeningTable_${idParts.join('-')}_${timestamp}_.csv`;
  }, [alias, selectedStudy, currentGroup]);

  const screeningSummaryChartOption = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Enrolled', 'Ineligible', 'Declined', 'Other'] },
    xAxis: {
      type: 'value',
      name: 'Patients',
    },
    yAxis: {
      type: 'category',
      inverse: true, // Render top-to-bottom in the same order as chartCategories (and the table), instead of ECharts' default bottom-up
      data: screeningStats.chartCategories,
      axisLabel: { fontSize: 11, interval: 0 }, // interval: 0 forces every category tick to show, none skipped
    },
    series: [
      { name: 'Enrolled', type: 'bar', stack: 'total', data: screeningStats.chartEnrolled, itemStyle: { color: STATUS_COLORS.enrolled } },
      { name: 'Ineligible', type: 'bar', stack: 'total', data: screeningStats.chartIneligible, itemStyle: { color: STATUS_COLORS.ineligible } },
      { name: 'Declined', type: 'bar', stack: 'total', data: screeningStats.chartDeclined, itemStyle: { color: STATUS_COLORS.declined } },
      { name: 'Other', type: 'bar', stack: 'total', data: screeningStats.chartOther, itemStyle: { color: STATUS_COLORS.other } },
    ],
    grid: { left: '3%', right: '5%', bottom: 30, top: 40, containLabel: true },
  }), [screeningStats]);

  // Shared height for the Screening Summary table + chart so neither clips rows the other one shows
  const screeningChartHeight = Math.max(360, screeningStats.chartCategories.length * 32);

  const wardScreeningChartOption = useMemo(() => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Enrolled', 'Ineligible', 'Declined', 'Other'] },
    xAxis: {
      type: 'value',
      name: 'Patients',
    },
    yAxis: {
      type: 'category',
      inverse: true, // Render top-to-bottom in the same order as wardChartCategories (and the ward table)
      data: screeningStats.wardChartCategories,
      axisLabel: { fontSize: 11, interval: 0 }, // interval: 0 forces every category tick to show, none skipped
    },
    series: [
      { name: 'Enrolled', type: 'bar', stack: 'total', data: screeningStats.wardChartEnrolled, itemStyle: { color: STATUS_COLORS.enrolled } },
      { name: 'Ineligible', type: 'bar', stack: 'total', data: screeningStats.wardChartIneligible, itemStyle: { color: STATUS_COLORS.ineligible } },
      { name: 'Declined', type: 'bar', stack: 'total', data: screeningStats.wardChartDeclined, itemStyle: { color: STATUS_COLORS.declined } },
      { name: 'Other', type: 'bar', stack: 'total', data: screeningStats.wardChartOther, itemStyle: { color: STATUS_COLORS.other } },
    ],
    grid: { left: '3%', right: '5%', bottom: 30, top: 40, containLabel: true },
  }), [screeningStats]);

  // Shared height for the Ward Screening Summary table + chart
  const wardScreeningChartHeight = Math.max(360, screeningStats.wardChartCategories.length * 32);

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

      {/* Filter Controls: Study/Site/Ward/Group */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Study Selection (shared component - fetches list, persists, dispatches setStudy) */}
        <Grid item xs={12} md={3}>
          <StudySelection fullWidth />
        </Grid>

        {/* Site Selection (shared component - works correctly with alias matching) */}
        {selectedStudy && (
          <Grid item xs={12} md={3}>
            <SiteSelection size="medium" fullWidth />
          </Grid>
        )}

        {/* Ward Selection (shared component - Redux-integrated, alias matching,
            with local, patient-data-derived options as a fallback) */}
        {selectedStudy && (
          <Grid item xs={12} md={3}>
            <WardSelection size="medium" fullWidth localWards={localWardOptions} />
          </Grid>
        )}

        {/* Group filter (shared component - dispatches to currentGroup, independent of Ward/Site) */}
        {selectedStudy && (
          <Grid item xs={12} md={3}>
            <GroupFilter size="medium" showLabel sx={{ width: '100%' }} />
          </Grid>
        )}
      </Grid>

      {/* Period Controls: Timepoint + Start/End Date, grouped together since they jointly
          define the charts' visible window */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          {/* Timepoint Selection */}
          <Grid item xs={12} md={4}>
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

          {/* Start Date Picker - truncates charts to periods on/after this date (cumulative
              totals still reflect the full history, only the visible window is narrowed) */}
          <Grid item xs={12} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newDate) => setStartDate(newDate)}
                slotProps={{ textField: { fullWidth: true }, field: { clearable: true } }}
                maxDate={endDate || new Date()}
              />
            </LocalizationProvider>
          </Grid>

          {/* End Date Picker */}
          <Grid item xs={12} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newDate) => setEndDate(newDate)}
                slotProps={{ textField: { fullWidth: true } }}
                maxDate={new Date()}
                minDate={startDate || undefined}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>
      </Paper>

      {/* Real attained/total progress for the slow, per-patient reference-resolution loop
          in getRecruitmentDetail's production-mode path (see fhirService.js) */}
      {fetchProgress && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress
            variant="determinate"
            value={(fetchProgress.attained / fetchProgress.total) * 100}
          />
          <Typography variant="caption" color="text.secondary">
            Loading patients: {fetchProgress.attained} / {fetchProgress.total}
          </Typography>
        </Box>
      )}

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

      {/* Screening Summary: table by group / site + chart */}
      {filteredPatients.length > 0 && (
        <ScreeningSummaryPanel
          title="Screening Summary by Group / Site"
          chartSubtitle="Screening outcome by Group / Site"
          rows={screeningStats.rows}
          reasonHeaders={screeningStats.reasonHeaders}
          chartOption={screeningSummaryChartOption}
          chartHeight={screeningChartHeight}
          onDownload={() => downloadScreeningSummaryCsv(screeningStats.rows, screeningStats.reasonHeaders, buildScreeningCsvFilename())}
        />
      )}

      {/* Ward Screening Summary: table by ward + chart (split out from Group/Site summary above) */}
      {filteredPatients.length > 0 && (
        <ScreeningSummaryPanel
          title="Screening Summary by Ward"
          chartSubtitle="Screening outcome by Ward"
          rows={screeningStats.wardRows}
          reasonHeaders={screeningStats.reasonHeaders}
          chartOption={wardScreeningChartOption}
          chartHeight={wardScreeningChartHeight}
          onDownload={() => downloadScreeningSummaryCsv(screeningStats.wardRows, screeningStats.reasonHeaders, buildScreeningCsvFilename())}
        />
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
