import axios from 'axios';
import config from '../config';

const API_BASE_URL = 'https://e2f74625-eb0f-41fd-8375-fa0fa15b0654.mock.pstmn.io';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,  // Set a timeout for requests
});

// Fetch data from API
export const fetchSummaryData = async () => {
  try {
    const response = await api.get('/summary');
    return response.data;
  } catch (error) {
    console.error('Error fetching summary data:', error);
    throw error;
  }
};

export const fetchDetailData = async () => {
  try {
    const response = await api.get('/detail');
    return response.data;
  } catch (error) {
    console.error('Error fetching detail data:', error);
    throw error;
  }
};

// Export mock data for testing purposes
// export const mockData = {
//   summaryMockData: require('../mock/mockData.json'),
//   detailMockDataAPI: require('../mock/mockData.json'),
// };
