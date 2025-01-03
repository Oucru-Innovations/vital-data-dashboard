// src/services/apiService.js
import axios from 'axios';

const API_URL = 'https://e2f74625-eb0f-41fd-8375-fa0fa15b0654.mock.pstmn.io'; // mock API base URL

// Create an axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000, // timeout after 10 seconds
});

// Function to get summary data
export const getSummaryData = async () => {
  try {
    const response = await apiClient.get('/summary');
    return response.data;
  } catch (error) {
    console.error("Error fetching summary data", error);
    return {};
  }
};

// Function to get detail data
export const getDetailData = async () => {
  try {
    const response = await apiClient.get('/detail');
    return response.data;
  } catch (error) {
    console.error("Error fetching detail data", error);
    return {};
  }
};

// Fetch summary data by data type
export const getSummaryDataByDataType = async (params) => {
  try {
    const response = await apiClient.get('/summary/datatype', { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching summary data by data type", error);
    return {};
  }
};

// Fetch summary data by study
export const getSummaryDataByStudy = async () => {
  try {
    const response = await apiClient.get('/summary/study');
    return response.data;
  } catch (error) {
    console.error("Error fetching summary data by study", error);
    return {};
  }
};

// Fetch summary data by device
export const getSummaryDataByDevice = async () => {
  try {
    const response = await apiClient.get('/summary/device');
    return response.data;
  } catch (error) {
    console.error("Error fetching summary data by device", error);
    return {};
  }
};

//Fetch summary data by condition
export const getSummaryDataByCondition = async () => {
  try {
    const response = await apiClient.get('/summary/condition');
    return response.data;
  } catch (error) {
    console.error("Error fetching summary data by condition", error);
    return {};
  }
};
