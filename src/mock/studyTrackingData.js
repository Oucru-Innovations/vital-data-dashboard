
study_recruited = {
  "date": [
    "2023-01-01T00:00:00",
    "2023-02-01T00:00:00",
    "2023-03-01T00:00:00",
    "2023-04-01T00:00:00",
    "2023-05-01T00:00:00",
    "2023-06-01T00:00:00",
    "2023-07-01T00:00:00",
    "2023-08-01T00:00:00",
    "2023-09-01T00:00:00",
    "2023-10-01T00:00:00",
    "2023-11-01T00:00:00",
    "2023-12-01T00:00:00",
    "2024-01-01T00:00:00",
    "2024-02-01T00:00:00",
    "2024-03-01T00:00:00"
  ],
  "study": [
    "01NVa_Dengue",
    "01NVa_Dengue",
    "01NVa_Dengue",
    "01NVa_Dengue",
    "01NVa_Dengue",
    "01NVa_Dengue",
    "01NVa_Dengue",
    "01NVa_Dengue",
    "01NVa_Dengue",
    "01NVa_Dengue",
    "01NVa_Dengue",
    "01NVa_Dengue",
    "01NVa_Dengue",
    "01NVa_Dengue",
    "01NVa_Dengue"
  ],
  "recruited_number": [
    14,
    21,
    21,
    23,
    21,
    10,
    9,
    14,
    3,
    9,
    4,
    8,
    4,
    3,
    2
  ],
  "cumulative_recruited": [
    "14",
    "35",
    "56",
    "79",
    "100",
    "110",
    "119",
    "133",
    "136",
    "145",
    "149",
    "157",
    "161",
    "164",
    "166"
  ]
}

timeline = {
  "name": [
    "01NVa_Dengue",
    "01NVa_Sepsis",
    "01NVb",
    "01NVe",
    "05EI",
    "06NV",
    "17EI",
    "24EI",
    "28EI",
    "31TB"
  ],
  "start": [
    "2023-01-01",
    "2023-01-01",
    "2023-01-01",
    "2023-05-01",
    "2023-01-01",
    "2023-12-01",
    "2023-01-01",
    "2023-08-01",
    "2023-05-01",
    "2023-04-01"
  ],
  "end": [
    "2024-07-01",
    "2024-07-01",
    "2024-01-01",
    "2024-05-01",
    "2029-01-01",
    "2024-12-01",
    "2024-01-01",
    "2024-01-01",
    "2024-06-01",
    "2024-04-01"
  ]
}

// Mock data for tracking/overall
export const mockOverallRecruitmentData = {
  recruited_month: [
    "2023-03-01T00:00:00+07:00",
    "2023-04-01T00:00:00+07:00",
    "2023-05-01T00:00:00+07:00",
    "2023-06-01T00:00:00+07:00",
    "2023-07-01T00:00:00+07:00",
    "2023-08-01T00:00:00+07:00",
    "2023-09-01T00:00:00+07:00",
    "2023-10-01T00:00:00+07:00",
    "2023-11-01T00:00:00+07:00",
    "2023-12-01T00:00:00+07:00",
    "2024-01-01T00:00:00+07:00",
    "2024-02-01T00:00:00+07:00",
    "2024-03-01T00:00:00+07:00"
  ],
  total_recruited: [
    14,
    21,
    21,
    23,
    21,
    10,
    9,
    14,
    3,
    9,
    4,
    8,
    4
  ]
};

// Helper function to get mock response
export const getMockResponse = (endpoint, params = {}) => {
  switch (endpoint) {
    case '/tracking/study':
      return {
        data: study_recruited,
        status: 200,
        statusText: 'OK',
      };
    case '/tracking/timeline':
      return {
        data: timeline,
        status: 200,
        statusText: 'OK',
      };
    case '/tracking/overall':
      return {
        data: mockOverallRecruitmentData,
        status: 200,
        statusText: 'OK',
      };
    default:
      return {
        data: {},
        status: 404,
        statusText: 'Not Found',
      };
  }
};