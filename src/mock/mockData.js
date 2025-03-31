// src/mock/mockData.js
import generatedFileData from '../mock/generated_detail_data.json';

export const sunburstMockData = {
    labels: ['All Studies', '24EI', '24EIa', '24EIb', 'PPG', 'ECG', 'Accelerometry'],
    parents: ['', 'All Studies', 'All Studies', 'All Studies', '24EI', '24EI', '24EIa'],
    values: [1000, 400, 300, 300, 200, 200, 300],
};
  
export const heatmapMockData = {
    fileTypes: ['PPG', 'ECG', 'Accelerometry', 'Ultrasound'],
    studies: ['24EI', '24EIa', '24EIb', '05EI', '06EI'],
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
    fileTypes: ['PPG', 'ECG', 'PPG', 'Accelerometry', 'Ultrasound'], // Types
};
  
export const tableMockData = [
    { id: 1, Study: '24EI', FileType: 'PPG', FileName: 'file1.ppg', FileSize: 10, Duration: 5 },
    { id: 2, Study: '24EIa', FileType: 'ECG', FileName: 'file2.ecg', FileSize: 15, Duration: 8 },
    { id: 3, Study: '24EIb', FileType: 'PPG', FileName: 'file3.ppg', FileSize: 12, Duration: 6 },
    { id: 4, Study: '05EI', FileType: 'Accelerometry', FileName: 'file4.gyro', FileSize: 20, Duration: 10 },
    { id: 5, Study: '06EI', FileType: 'Ultrasound', FileName: 'file5.us', FileSize: 25, Duration: 12 },
];

export const stackedBarMockData = {
    x: ['2023-01-01', '2023-01-02', '2023-01-03'], // Dates
    studies: ['24EI', '24EIa', '24EIb'], // Studies
    fileTypes: ['PPG', 'ECG', 'Accelerometry'], // File types
    values: [
      { study: '24EI', type: 'PPG', count: 50 },
      { study: '24EI', type: 'ECG', count: 30 },
      { study: '24EIa', type: 'Accelerometry', count: 40 },
    ],
};
  
export const violinMockData = {
    studies: ['24EI', '24EIa', '24EIb'],
    fileTypes: ['PPG', 'ECG', 'Accelerometry'],
    durations: [
      { study: '24EI', type: 'PPG', values: [5, 7, 8, 6, 7] },
      { study: '24EI', type: 'ECG', values: [6, 8, 5, 7, 6] },
      { study: '24EIa', type: 'Accelerometry', values: [10, 12, 11, 9, 10] },
    ],
};

export const groupedBarMockData = {
    dates: ['2023-01-01', '2023-01-02', '2023-01-03'],
    fileTypes: ['PPG', 'ECG', 'Accelerometry'],
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
    fileTypes: ['PPG', 'ECG', 'PPG', 'Accelerometry', 'ECG', 'PPG', 'Accelerometry', 'ECG', 'PPG', 'Accelerometry'],
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

export const detailMockDataAPI = {
  "study": [
      "24EI",
      "24EI",
      "24EI",
      "24EI",
      "24EIa",
      "24EIa",
      "24EIa",
      "24EIa",
      "24EIb",
      "24EIb",
      "24EIb",
      "24EIb",
      "05EI",
      "05EI",
      "05EI",
      "05EI"
  ],
  "fileType": [
      "PPG",
      "ECG",
      "Gyro",
      "Ultrasound",
      "PPG",
      "ECG",
      "Gyro",
      "Ultrasound",
      "PPG",
      "ECG",
      "Gyro",
      "Ultrasound",
      "PPG",
      "ECG",
      "Gyro",
      "Ultrasound"
  ],
  "fileName": [
      "file1.ppg",
      "file2.ecg",
      "file3.gyro",
      "file4.us",
      "file5.ppg",
      "file6.ecg",
      "file7.gyro",
      "file8.us",
      "file9.ppg",
      "file10.ecg",
      "file11.gyro",
      "file12.us",
      "file13.ppg",
      "file14.ecg",
      "file15.gyro",
      "file16.us"
  ],
  "fileSize": [
      10,
      15,
      20,
      25,
      12,
      18,
      22,
      28,
      14,
      19,
      0,
      30,
      16,
      21,
      23,
      0
  ],
  "duration": [
      5,
      8,
      10,
      12,
      6,
      7,
      11,
      13,
      6,
      9,
      0,
      14,
      7,
      10,
      12,
      0
  ],
  "date": [
      "2023-01-01",
      "2023-01-02",
      "2023-01-03",
      "2023-01-04",
      "2023-01-01",
      "2023-01-02",
      "2023-01-03",
      "2023-01-04",
      "2023-01-05",
      "2023-01-06",
      "2023-01-07",
      "2023-01-08",
      "2023-01-09",
      "2023-01-10",
      "2023-01-11",
      "2023-01-12"
  ]
};

export const detailMockGeneratedDataAPI = (() => {
  const data = generatedFileData; // Assuming it's an array of objects
  return data;
  // Initialize the arrays
  const study = [];
  const fileType = [];
  const fileName = [];
  const fileSize = [];
  const duration = [];
  const date = [];

  // Map through the generated data and populate the arrays
  data.forEach((item) => {
    study.push(item.study);
    fileType.push(item.fileType);
    fileName.push(item.fileName);
    fileSize.push(item.fileSize);
    duration.push(item.duration);
    date.push(item.date);
  });

  return { study, fileType, fileName, fileSize, duration, date };
})();

export const summaryMockDataAPI = {
  "study": [
      "24EI",
      "24EI",
      "24EI",
      "24EI",
      "24EIa",
      "24EIa",
      "24EIa",
      "24EIa",
      "24EIb",
      "24EIb",
      "24EIb",
      "24EIb",
      "05EI",
      "05EI",
      "05EI",
      "05EI"
  ],
  "fileType": [
      "PPG",
      "ECG",
      "Gyro",
      "Ultrasound",
      "PPG",
      "ECG",
      "Gyro",
      "Ultrasound",
      "PPG",
      "ECG",
      "Gyro",
      "Ultrasound",
      "PPG",
      "ECG",
      "Gyro",
      "Ultrasound"
  ],
  "fileCount": [
      50,
      40,
      30,
      20,
      60,
      50,
      40,
      30,
      0,
      70,
      20,
      10,
      40,
      35,
      25,
      15
  ],
  "totalSize": [
      500,
      400,
      300,
      200,
      600,
      500,
      400,
      300,
      0,
      700,
      200,
      100,
      400,
      350,
      250,
      150
  ],
  "totalDuration": [
      100,
      80,
      60,
      40,
      120,
      100,
      80,
      60,
      0,
      140,
      40,
      20,
      80,
      70,
      50,
      30
  ]
}