/**
 * TimelineChart.jsx - Chart Components for Recruitment Tracking
 *
 * This file provides reusable chart components for visualizing recruitment data.
 * Used by both MonthlyReport.jsx and TrackingWeekly.jsx pages.
 *
 * CHARTS EXPORTED:
 * ================
 * 1. renderRecruitmentChart - Combined bar/line chart for recruitment progress
 * 2. renderStatusChart - Pie chart for patient status distribution
 * 3. renderTimelineChart - Stacked bar chart for study timeline progress
 *
 * TIMEPOINT SUPPORT:
 * ==================
 * The charts automatically detect and handle multiple date formats:
 * - Daily: "2026-01-15" → displays as "Jan 15"
 * - Weekly: "2026-W03" → displays as "W03"
 * - Monthly: "2026-01" → displays as "Jan 2026"
 * - Quarterly: "2026-Q1" → displays as "Q1 2026"
 * - Yearly: "2026" → displays as "2026"
 *
 * DATE FILTERING FIX (2026-01-14):
 * ================================
 * Previously, the chart used string comparison to filter future dates:
 *   study.date < today.toISOString()
 *
 * This FAILED for weekly/quarterly formats because:
 *   "2026-W03" < "2026-01-14T..." → false (W > 0 in ASCII)
 *   "2026-Q1" < "2026-01-14T..." → false (Q > 0 in ASCII)
 *
 * The fix adds parsePeriodDate() to convert period strings to Date objects
 * for proper date comparison across all formats.
 *
 * @see WEEKLY_CHART_DATE_COMPARISON_FIX.md for detailed explanation
 *
 * LAST UPDATED: 2026-01-15
 */

import React from 'react';
import ReactECharts from 'echarts-for-react';
// eslint-disable-next-line no-unused-vars
import { format, parse } from 'date-fns';

import { Box } from '@mui/material';

/**
 * Color palette for charts
 * Used consistently across all chart types
 */
const COLORS = ['#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#f44336'];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format date label based on timepoint format
 *
 * Automatically detects the period format from the date string
 * and returns a human-readable label for chart axes.
 *
 * FORMAT DETECTION & OUTPUT:
 * ==========================
 * | Input Format | Example Input | Output |
 * |--------------|---------------|--------|
 * | Daily        | "2026-01-15"  | "Jan 15" |
 * | Weekly       | "2026-W03"    | "W03" |
 * | Monthly      | "2026-01"     | "Jan 2026" |
 * | Quarterly    | "2026-Q1"     | "Q1 2026" |
 * | Yearly       | "2026"        | "2026" |
 *
 * @param {string} dateStr - Period date string in any supported format
 * @returns {string} Human-readable date label
 */
const formatDateLabel = (dateStr) => {
  if (!dateStr) return dateStr;

  // Daily: "2026-01-15" → "Jan 15"
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`;
  }

  // Weekly: "2026-W03" → "W03"
  if (/^\d{4}-W\d{2}$/.test(dateStr)) {
    return dateStr.substring(5); // "2026-W03" → "W03"
  }

  // Monthly: "2026-01" → "Jan 2026"
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [year, month] = dateStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  }

  // Quarterly: "2026-Q1" → "Q1 2026"
  if (/^\d{4}-Q\d$/.test(dateStr)) {
    const [year, quarter] = dateStr.split('-');
    return `${quarter} ${year}`;
  }

  // Yearly: "2026" → "2026"
  if (/^\d{4}$/.test(dateStr)) {
    return dateStr;
  }

  // Fallback
  return dateStr;
};

/**
 * Get chart title based on timepoint format
 *
 * Determines the appropriate chart title by detecting the period format
 * from the first data point's date string.
 *
 * @param {Array} chartData - Array of recruitment data objects with date property
 * @returns {string} Chart title reflecting the timepoint type
 *
 * @example
 * getChartTitle([{ date: "2026-W03", ... }]) // → "Weekly Recruitment Progress"
 * getChartTitle([{ date: "2026-01", ... }])  // → "Monthly Recruitment Progress"
 */
const getChartTitle = (chartData) => {
  if (!chartData || chartData.length === 0) {
    return 'Recruitment Progress';
  }

  const dateStr = chartData[0].date;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return 'Daily Recruitment Progress';
  } else if (/^\d{4}-W\d{2}$/.test(dateStr)) {
    return 'Weekly Recruitment Progress';
  } else if (/^\d{4}-\d{2}$/.test(dateStr)) {
    return 'Monthly Recruitment Progress';
  } else if (/^\d{4}-Q\d$/.test(dateStr)) {
    return 'Quarterly Recruitment Progress';
  } else if (/^\d{4}$/.test(dateStr)) {
    return 'Yearly Recruitment Progress';
  }

  return 'Recruitment Progress';
};

/**
 * Convert period date string to Date object for comparison
 *
 * CRITICAL FUNCTION for proper date filtering across all timepoint formats.
 *
 * WHY THIS EXISTS:
 * ================
 * String comparison fails for non-ISO date formats:
 *   "2026-W03" < "2026-01-14T..." → false (because "W" > "0" in ASCII)
 *   "2026-Q1" < "2026-01-14T..." → false (because "Q" > "0" in ASCII)
 *
 * This function converts period strings to actual Date objects so we can
 * use proper date comparison (date1 <= date2) instead of string comparison.
 *
 * CONVERSION RULES:
 * =================
 * | Format    | Example      | Converts To         | Logic |
 * |-----------|--------------|---------------------|-------|
 * | Daily     | "2026-01-15" | Date("2026-01-15")  | ISO format |
 * | Weekly    | "2026-W03"   | Date(2026, 0, 15)   | First day of week 3 |
 * | Monthly   | "2026-01"    | Date("2026-01-01")  | First of month |
 * | Quarterly | "2026-Q2"    | Date(2026, 3, 1)    | First of quarter |
 * | Yearly    | "2026"       | Date(2026, 0, 1)    | First of year |
 *
 * WEEKLY CALCULATION:
 * ===================
 * Week number is approximated: week 1 starts Jan 1, each week is 7 days.
 * Date = Jan 1 + (weekNum - 1) * 7 days
 * Example: W03 = Jan 1 + 14 days = Jan 15
 *
 * Note: This is an approximation. ISO week dates have more complex rules
 * (Week 1 contains first Thursday), but this is sufficient for filtering.
 *
 * @param {string} dateStr - Period date string in any supported format
 * @returns {Date} JavaScript Date object for comparison
 *
 * @see WEEKLY_CHART_DATE_COMPARISON_FIX.md for bug fix documentation
 */
const parsePeriodDate = (dateStr) => {
  if (!dateStr) return new Date(0); // Very old date for invalid input

  // Daily: "2026-01-15" - already valid ISO date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }

  // Weekly: "2026-W03" - use first day of that week
  if (/^\d{4}-W\d{2}$/.test(dateStr)) {
    const [year, week] = dateStr.split('-');
    const weekNum = parseInt(week.substring(1));
    // Approximate: week 1 starts around Jan 1, each week is 7 days
    const date = new Date(parseInt(year), 0, 1 + (weekNum - 1) * 7);
    return date;
  }

  // Monthly: "2026-01" - use first day of month
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + '-01');
  }

  // Quarterly: "2026-Q1" - use first day of quarter
  if (/^\d{4}-Q\d$/.test(dateStr)) {
    const [year, quarter] = dateStr.split('-');
    const quarterNum = parseInt(quarter.substring(1));
    const month = (quarterNum - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
    return new Date(parseInt(year), month, 1);
  }

  // Yearly: "2026" - use first day of year
  if (/^\d{4}$/.test(dateStr)) {
    return new Date(parseInt(dateStr), 0, 1);
  }

  // Fallback
  return new Date(dateStr);
};

// ============================================
// CHART COMPONENTS
// ============================================

/**
 * Render Recruitment Progress Chart
 *
 * Creates a combined bar/line chart showing:
 * - Target (gray bars) - recruitment targets per period
 * - Period Recruitment (blue line) - actual enrollments per period
 * - Cumulative Recruitment (green line) - running total of enrollments
 *
 * CHART LAYOUT:
 * =============
 * - X-axis: Time periods (formatted by formatDateLabel)
 * - Left Y-axis: Period count (bar + period line)
 * - Right Y-axis: Cumulative count (cumulative line)
 *
 * DATA FILTERING:
 * ===============
 * Filters out future periods using parsePeriodDate() for proper
 * date comparison across all timepoint formats.
 *
 * EXPECTED INPUT DATA STRUCTURE:
 * ==============================
 * [{
 *   date: "2026-W03",           // Period identifier
 *   target: 10,                  // Target for this period
 *   recruited_number: 5,         // Enrolled this period
 *   cumulative_recruited: 15     // Total enrolled to date
 * }, ...]
 *
 * @param {Array} stages - Array of recruitment data objects
 * @returns {JSX.Element} ECharts component wrapped in Box
 */
export const renderRecruitmentChart = (stages) => {
  const today = new Date();

  // Filter out future periods
  // Uses parsePeriodDate() for proper date comparison across all formats
  const chartData = stages
    .filter(study => {
      // Convert period date to comparable Date object
      const studyDate = parsePeriodDate(study.date);
      return studyDate <= today;
    })
    .map(study => ({
      ...study,
      // month: new Date(study.month).toLocaleString('default', { month: 'long' }),
      // target: study.target || 10 // Set default target or get from API
    }));

  // ECharts configuration
  const option = {
    title: {
      text: getChartTitle(chartData),
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['Target', 'Period Recruitment', 'Cumulative Recruitment'],
      top: 30
    },
    xAxis: {
      type: 'category',
      data: chartData.map(d => d.date),
      axisLabel: {
        rotate: 45,
        formatter: formatDateLabel
      }
    },
    yAxis: [
      {
        type: 'value',
        name: 'Period Count',
        position: 'left',
        nameGap: 35,
        splitLine: { show: false },
        axisLabel: {
          padding: [0, 15, 0, 0]  // Add padding to labels
        }
      },
      {
        type: 'value',
        name: 'Cumulative Count',
        position: 'right',
        nameGap: 35,
        splitLine: { show: false },
        axisLabel: {
          padding: [0, 0, 0, 15]  // Add padding to labels
        }
      }
    ],
    series: [
      // {
      //   name: 'Target',
      //   type: 'bar',
      //   data: chartData.map(d => ({
      //     value: d.target,
      //     label: {
      //       // show: true,
      //       position: 'top'
      //     }
      //   })),
      //   barWidth: '40%',
      //   itemStyle: {
      //     color: '#e0e0e0'
      //   }
      // },
      {
        name: 'Period Recruitment',
        type: 'line',
        data: chartData.map(d => ({
          value: d.recruited_number,
          label: {
            show: true,
            position: 'top'
          }
        })),
        lineStyle: {
          width: 3,
          color: '#1976d2'
        }
      },
      {
        name: 'Cumulative Recruitment',
        type: 'line',
        yAxisIndex: 1,
        symbol: 'circle',
        symbolSize: 8,
        data: chartData.map(d => ({
          value: d.cumulative_recruited,
          label: {
            show: true,
            position: 'top'
          }
        })),
        lineStyle: {
          width: 3,
          color: '#4caf50'
        },
        itemStyle: {
          color: '#4caf50'
        }
      },
      // {
      //   // empty line series for the “today” markLine
      //   type: 'line',
      //   data: [],
      //   markLine: {
      //     symbol: 'none',
      //     data: [
      //       {
      //         xAxis: today.getTime(),
      //         label: {
      //           show:true,
      //           formatter: format(today, 'dd/MM/yyyy'),
      //           position: 'end',
      //           color: 'red',
      //           rotate: 360,
      //           // distance: -10,
      //   // align: 'center',
      //           // align: 'left',
      //           // verticalAlign: 'middle',
      //           fontSize: 12,
      //           // padding: [0, 0, 0, 30], // Adds some padding to prevent overlap
      //         }
      //       },
      //     ],
      //     lineStyle: {
      //       color: 'red',
      //       width: 2,
      //       type: 'solid'
      //     },
      //   },
      // },
    ]
  };

  return (
    <Box sx={{ width: '100%', height: 400 }}>
      <ReactECharts option={option} />
    </Box>
  );
};


/**
 * Render Patient Status Distribution Chart
 *
 * Creates a pie chart showing the distribution of patients by status:
 * - Active: Currently enrolled patients
 * - Completed: Patients who finished the study
 * - Dropped: Patients who withdrew or were removed
 *
 * EXPECTED INPUT DATA STRUCTURE:
 * ==============================
 * {
 *   activePatients: 45,
 *   completedPatients: 30,
 *   droppedPatients: 5
 * }
 *
 * @param {Object} recruitmentData - Object with patient counts by status
 * @returns {JSX.Element} ECharts pie chart component
 */
export const renderStatusChart = (recruitmentData) => {
  const data = [
    { name: 'Active', value: recruitmentData.activePatients },
    { name: 'Completed', value: recruitmentData.completedPatients },
    { name: 'Dropped', value: recruitmentData.droppedPatients },
  ];

  const option = {
    title: {
      text: 'Patient Status Distribution',
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: 'Status',
        type: 'pie',
        radius: '55%',
        center: ['50%', '60%'],
        data: data.map((item, index) => ({
          ...item,
          itemStyle: {
            color: COLORS[index % COLORS.length],
          },
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
    grid: {
      top: 100,    // Increase top margin to accommodate legend
      bottom: 60,  // Add bottom margin for rotated x-axis labels
      left: 80,    // Add left margin for y-axis labels
      right: 80    // Add right margin for second y-axis labels
    },
  };

  return (
    <Box sx={{ width: '100%', height: 400 }}>
      <ReactECharts option={option} />
    </Box>
  );
};

/**
 * Render Study Timeline Progress Chart
 *
 * Creates a stacked bar chart showing the progress of multiple studies.
 * Each study shows:
 * - Progress (green): Percentage of study duration elapsed
 * - Remaining (blue): Percentage of study duration remaining
 *
 * CALCULATION:
 * ============
 * elapsed = (now - startDate) / (endDate - startDate) * 100
 * remaining = 100 - elapsed
 *
 * EXPECTED INPUT DATA STRUCTURE:
 * ==============================
 * [{
 *   name: "54EI",
 *   startDate: "2025-01-01",
 *   endDate: "2027-12-31"
 * }, ...]
 *
 * @param {Array} studies - Array of study objects with name, startDate, endDate
 * @returns {JSX.Element} ECharts stacked bar chart component
 */
export const renderTimelineChart = (studies) => {
  const now = new Date().getTime();

  // Calculate progress for each study
  const timelineData = studies.map(study => {
    const startDate = new Date(study.startDate).getTime();
    const endDate = new Date(study.endDate).getTime();
    const elapsed = ((now - startDate) / (endDate - startDate)) * 100;
    const remaining = 100 - elapsed;
    return {
      name: study.name,
      elapsed: elapsed,
      remaining: remaining
    };
  });

  const option = {
    title: {
      text: 'Study Timeline Progress',
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params) => {
        const study = timelineData.find(d => d.name === params[0].name);
        return `
          <div>
            <p>${study.name}</p>
            <p>Progress: ${study.elapsed.toFixed(1)}%</p>
          </div>
        `;
      },
    },
    legend: {
      data: ['Progress', 'Remaining'],
      right: '10%',
    },
    xAxis: {
      type: 'category',
      data: timelineData.map(d => d.name),
      axisLabel: {
        rotate: 45,
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Progress (%)',
      min: 0,
      max: 100,
      interval: 20,
    },
    series: [
      {
        name: 'Progress',
        type: 'bar',
        stack: 'total',
        data: timelineData.map(d => d.elapsed),
        itemStyle: {
          color: COLORS[0],
        },
      },
      {
        name: 'Remaining',
        type: 'bar',
        stack: 'total',
        data: timelineData.map(d => d.remaining),
        itemStyle: {
          color: COLORS[1],
        },
      },
    ],
  };

  return (
    <Box sx={{ width: '100%', height: 400 }}>
      <ReactECharts option={option} />
    </Box>
  );
};
