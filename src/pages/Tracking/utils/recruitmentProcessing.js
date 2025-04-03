import { format, addMonths, subMonths } from 'date-fns';

// Set universal current date for all calculations
export const CURRENT_DATE = new Date();

// Get current month name
export const getCurrentMonth = () => CURRENT_DATE.toLocaleString('default', { month: 'long' });

// Get current month in YYYY-MM-DD format
export const getCurrentMonthDate = () => format(CURRENT_DATE, 'yyyy-MM-dd');

// Get previous month's date
export const getPreviousMonthDate = () => format(subMonths(CURRENT_DATE, 1), 'yyyy-MM-dd');

// Convert column based to row based data
export const transposeData = (data) => {
    // convert from {'a':[], 'b':[]} to [{a:1,b:2},{a:3,b:4}]
    console.log('data', data);
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
  // sort the data by month
  const sortedData = data.sort((a, b) => new Date(a.month) - new Date(b.month));

  for (let i = 0; i < sortedData.length; i++) {
    const currentMonth = sortedData[i];
    const previousMonth = sortedData[i - 1] || { totalrecruited: 0 };
    const change = calculatePercentageChange(currentMonth.totalrecruited, previousMonth.totalrecruited);
    
    monthlyChanges.push({
      // format month to text of year MMMM yyyy
      month: format(new Date(currentMonth.month), 'MMMM yyyy'),
      // month: currentMonth.month,
      totalrecruited: currentMonth.totalrecruited,
      change
    });
  }
  return monthlyChanges.slice(-3); // return last 3 months
}


// Calculate percentage change between two values
export const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return 0;
  return ((current - previous) / previous * 100).toFixed(1);
};

// Process timeline data
export const processTimelineData = (timelineData) => {
  return timelineData.map(study => ({
    ...study,
    start: study.start? new Date(study.start): null ,
    end: study.end? new Date(study.end): null,
  }));
};