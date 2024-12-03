// src/mock/mockData.js

export const sunburstMockData = {
    labels: ['All Studies', '24EI', '24EIa', '24EIb', 'PPG', 'ECG', 'Gyro'],
    parents: ['', 'All Studies', 'All Studies', 'All Studies', '24EI', '24EI', '24EIa'],
    values: [1000, 400, 300, 300, 200, 200, 300],
};
  
export const heatmapMockData = {
    x: ['PPG', 'ECG', 'Gyro', 'Ultrasound'],
    y: ['24EI', '24EIa', '24EIb', '05EI', '06EI'],
    z: [
      [5, 8, 10, 4],
      [6, 12, 14, 6],
      [3, 8, 12, 4],
      [9, 10, 5, 7],
      [6, 6, 8, 9],
    ],
};
  
export const summaryMockData = {
    totalFiles: 1000,
    totalDays: 365,
    totalDuration: '1000 hours',
    totalFileSize: '5 TB',
};
  
export const bubbleMockData = {
    studies: ['24EI', '24EIa', '24EIb', '05EI', '06EI'],
    fileSizes: [50, 30, 70, 90, 20], // Average file size per study
    fileCounts: [100, 150, 80, 120, 60], // Number of files per study
    fileTypes: ['PPG', 'ECG', 'PPG', 'Gyro', 'Ultrasound'], // Types
};
  
export const tableMockData = [
    { id: 1, Study: '24EI', FileType: 'PPG', FileName: 'file1.ppg', FileSize: 10, Duration: 5 },
    { id: 2, Study: '24EIa', FileType: 'ECG', FileName: 'file2.ecg', FileSize: 15, Duration: 8 },
    { id: 3, Study: '24EIb', FileType: 'PPG', FileName: 'file3.ppg', FileSize: 12, Duration: 6 },
    { id: 4, Study: '05EI', FileType: 'Gyro', FileName: 'file4.gyro', FileSize: 20, Duration: 10 },
    { id: 5, Study: '06EI', FileType: 'Ultrasound', FileName: 'file5.us', FileSize: 25, Duration: 12 },
];

export const stackedBarMockData = {
    x: ['2023-01-01', '2023-01-02', '2023-01-03'], // Dates
    studies: ['24EI', '24EIa', '24EIb'], // Studies
    fileTypes: ['PPG', 'ECG', 'Gyro'], // File types
    values: [
      { study: '24EI', type: 'PPG', count: 50 },
      { study: '24EI', type: 'ECG', count: 30 },
      { study: '24EIa', type: 'Gyro', count: 40 },
    ],
};
  
export const violinMockData = {
    studies: ['24EI', '24EIa', '24EIb'],
    fileTypes: ['PPG', 'ECG', 'Gyro'],
    durations: [
      { study: '24EI', type: 'PPG', values: [5, 7, 8, 6, 7] },
      { study: '24EI', type: 'ECG', values: [6, 8, 5, 7, 6] },
      { study: '24EIa', type: 'Gyro', values: [10, 12, 11, 9, 10] },
    ],
};

export const groupedBarMockData = {
    dates: ['2023-01-01', '2023-01-02', '2023-01-03'],
    fileTypes: ['PPG', 'ECG', 'Gyro'],
    fileCounts: {
      PPG: [50, 40, 30],
      ECG: [30, 20, 10],
      Gyro: [40, 50, 60],
    },
};

export const lineChartMockData = {
    dates: ['2023-01-01', '2023-01-02', '2023-01-03'],
    studies: ['24EI', '24EIa', '24EIb'],
    cumulativeCounts: {
      '24EI': [100, 140, 180],
      '24EIa': [120, 150, 180],
      '24EIb': [130, 170, 200],
    },
};

export const treemapMockData = {
    labels: [
      'All Studies',
      '24EI',
      '24EIa',
      '24EIb',
      'PPG (24EI)',
      'ECG (24EI)',
      'PPG (24EIa)',
      'Gyro (24EIa)',
    ],
    parents: [
      '', // Root node
      'All Studies', // Studies under root
      'All Studies',
      'All Studies',
      '24EI', // File types under studies
      '24EI',
      '24EIa',
      '24EIa',
    ],
    values: [400, 150, 120, 130, 90, 60, 70, 50], // File counts
    colors: ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#4caf50', '#2196f3', '#ff9800', '#9c27b0'], // Colors
};

export const fileSizeInsightsMockData = {
    fileSizes: [5, 20, 35, 8, 50, 100, 45, 60, 30, 15],
    fileTypes: ['PPG', 'ECG', 'PPG', 'Gyro', 'ECG', 'PPG', 'Gyro', 'ECG', 'PPG', 'Gyro'],
    fileNames: [
      'file1.ppg',
      'file2.ecg',
      'file3.ppg',
      'file4.gyro',
      'file5.ecg',
      'file6.ppg',
      'file7.gyro',
      'file8.ecg',
      'file9.ppg',
      'file10.gyro',
    ],
    dates: [
      '2023-01-01',
      '2023-01-02',
      '2023-01-03',
      '2023-01-04',
      '2023-01-05',
      '2023-01-06',
      '2023-01-07',
      '2023-01-08',
      '2023-01-09',
      '2023-01-10',
    ],
    studies: [
      '24EI',
      '24EIa',
      '24EI',
      '24EIb',
      '24EIa',
      '24EI',
      '24EIb',
      '24EIa',
      '24EI',
      '24EIb',
    ],
};
