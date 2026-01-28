import { format, addMonths, subMonths, addWeeks, subWeeks, startOfWeek, endOfWeek, getWeek, parseISO } from 'date-fns';

// Set universal current date for all calculations
export const CURRENT_DATE = new Date();

// Monthly functions
export const getCurrentMonth = () => CURRENT_DATE.toLocaleString('default', { month: 'long' });
export const getCurrentMonthDate = () => format(CURRENT_DATE, 'yyyy-MM-dd');
export const getPreviousMonthDate = () => format(subMonths(CURRENT_DATE, 1), 'yyyy-MM-dd');

// Weekly functions
export const getCurrentWeek = () => {
  const monday = startOfWeek(CURRENT_DATE, { weekStartsOn: 1 });
  return format(monday, 'MMM dd, yyyy');
};
export const getCurrentWeekDate = () => format(startOfWeek(CURRENT_DATE, { weekStartsOn: 1 }), 'yyyy-MM-dd');
export const getPreviousWeekDate = () => format(startOfWeek(subWeeks(CURRENT_DATE, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');

// Common functions
export const transposeData = (data) => {
  const keys = Object.keys(data);
  const length = data[keys[0]].length;
  const result = [];
  for (let i = 0; i < length; i++) {
    const obj = {};
    for (const key in data) {
      obj[key] = data[key][i];
    }
    result.push(obj);
  }
  return result;
}

export const inferMonthlyChanges = (data) => {
  const monthlyChanges = [];
  const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));

  for (let i = 0; i < sortedData.length; i++) {
    const currentMonth = sortedData[i];
    const previousMonth = sortedData[i - 1] || { recruited_number: 0 };
    const change = calculatePercentageChange(currentMonth.recruited_number, previousMonth.recruited_number);

    monthlyChanges.push({
      date: currentMonth.date,
      totalrecruited: currentMonth.recruited_number,
      change
    });
  }
  return monthlyChanges.slice(-3); // return last 3 months
}

export const inferWeeklyChanges = (data) => {
  const weeklyChanges = [];
  const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));

  for (let i = 0; i < sortedData.length; i++) {
    const currentWeek = sortedData[i];
    const previousWeek = sortedData[i - 1] || { totalrecruited: 0, screened_number: 0 };

    // Check if we found recruited_number or totalrecruited
    // The API might return totalrecruited, generated data has recruited_number
    const currentRecruited = currentWeek.totalrecruited ?? currentWeek.recruited_number ?? 0;
    const previousRecruited = previousWeek.totalrecruited ?? previousWeek.recruited_number ?? 0;

    const change = calculatePercentageChange(currentRecruited, previousRecruited);

    // Create a proper date object from the week date
    const weekDate = new Date(currentWeek.date);

    // Only format the date if it's valid
    let weekLabel;
    if (isNaN(weekDate.getTime())) {
      // Fallback to index-based week number if date is invalid
      // Or check if it's ISO week string like "2026-W01"
      if (typeof currentWeek.date === 'string' && currentWeek.date.includes('-W')) {
        weekLabel = currentWeek.date; // Keep strict ISO week if that's what we have
      } else {
        weekLabel = `Week ${i + 1}`;
      }
    } else {
      // Get the Monday of the week
      const monday = startOfWeek(weekDate, { weekStartsOn: 1 });
      weekLabel = format(monday, 'MMM dd, yyyy');
    }

    weeklyChanges.push({
      week: weekLabel,
      totalRecruited: currentRecruited,
      totalScreened: currentWeek.screened_number, // Pass through if available
      change
    });
  }
  return weeklyChanges.slice(-4); // return last 4 weeks
}

export const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return 0;
  return ((current - previous) / previous * 100).toFixed(1);
};

export const processTimelineData = (timelineData) => {
  return timelineData.map(study => ({
    ...study,
    // studyCode: study.studyCode,
    name: study.studyCode,
    start: study.start ? new Date(study.period.start) : null,
    end: study.end ? new Date(study.period.end) : null,
  }));
};