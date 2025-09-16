// src/services/apiService.js
import axios from 'axios';

// const API_URL = 'https://e2f74625-eb0f-41fd-8375-fa0fa15b0654.mock.pstmn.io'; // mock API base URL
// const API_URL=process.env.REACT_APP_MODE === 'deploy' ? process.env.REACT_APP_API_URL_DEPLOY:process.env.REACT_APP_API_URL_MOCK ;
const API_URL='http://localhost:3001'; // Local development API base URL
// console.log('API_URL:', API_URL);
// Create an axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000, // timeout after 10 seconds
});

// Function to get summary data
export const getSummaryData = async () => {
  try {
    const response = await apiClient.get('/summary/all');
    return response.data;
  } catch (error) {
    console.error("Error fetching summary data", error);
    return {};
  }
};

// Function to get detail data
export const getDetailData = async () => {
  try {
    const response = await apiClient.get('/files/detail');
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
export const getSummaryDataByStudy = async (params) => {
  try {
    const response = await apiClient.get('/summary/study', { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching summary data by study", error);
    return {};
  }
};

// Fetch summary data by device
export const getSummaryDataByDevice = async (params) => {
  try {
    const response = await apiClient.get('/summary/device', { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching summary data by device", error);
    return {};
  }
};

//Fetch summary data by condition
export const getSummaryDataByCondition = async (params) => {
  try {
    const response = await apiClient.get('/summary/condition', { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching summary data by condition", error);
    return {};
  }
};

export const getUniquePatients = async (params) => {
  try {
    const response = await apiClient.get('/summary/patient/unique', { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching unique patients", error);
    return {};
  }
};

// Function to get recruitment data with customizable period
export const getRecruitmentData = async (params = {}) => {
  try {
    const response = await apiClient.get('/tracking/recruitment', { params });
    return {
      data: response.data || []
    };
  } catch (error) {
    console.error("Error fetching recruitment data", error);
    return {
      data: []
    };
  }
};

// Function to get all study recruitment data this month
export const getStudyTracking = async (params) => {
  
  try {
    // Add default parameters for getting the last 3 months
    const defaultParams = {
      period: 'weekly',
      limit: 1,
      sort: 'date DESC',
      end_date: new Date().toISOString().split('T')[0]
    };
    
    // Merge default params with any provided params
    const finalParams = { ...defaultParams, ...params };
    console.log('finalParams', finalParams)
    const response = await apiClient.get('/tracking/recruitment/project', { params: finalParams });
    return {
      data: response.data || []
    };
  } catch (error) {
    console.error("Error fetching overall recruitment data", error);
    return {
      data: []
    };
  }
};

// Function to get study timeline data
export const getStudyTimeline = async (params) => {
  try {
    const response = await apiClient.get('/tracking/timeline', { params });
    return {
      data: response.data || []
    };
  } catch (error) {
    console.error("Error fetching study timeline data", error);
    return {};
  }
};

// Function to get overall recruitment data for latest 3 months
export const getPeriodTotalRecruitment = async (params = {}) => {
  try {
    // Add default parameters for getting the last 3 months
    const defaultParams = {
      period: 'weekly',
      limit: 1,
      sort: 'date DESC',
      end_date: new Date().toISOString().split('T')[0]
    };
    
    // Merge default params with any provided params
    const finalParams = { ...defaultParams, ...params };
    
    const response = await apiClient.get('/tracking/recruitment/study', { params: finalParams });
    return {
      data: response.data || []
    };
  } catch (error) {
    console.error("Error fetching overall recruitment data", error);
    return {
      data: []
    };
  }
};

// Function to get a study's lifetime recruitment data
export const getStudyLifetimeRecruitment = async (study, params = {}) => {
  try {
    const response = await apiClient.get(`/tracking/recruitment/${study}`, { params });
    return {
      data: response.data || []
    };
  } catch (error) {
    console.error("Error fetching study lifetime recruitment data", error);
    return {
      data: []
    };
  }
};

export const getPeriodTotalScreening = async (params = {}) => {
  try {
    // Add default parameters for getting the last 3 months
    const defaultParams = {
      period: 'monthly',
      limit: 1,
      sort: 'date DESC',
      end_date: new Date().toISOString().split('T')[0],
      study:'55EI,39EIa,54EI'
    };
    
    // Merge default params with any provided params
    const finalParams = { ...defaultParams, ...params };
    
    const response = await apiClient.get('/tracking/screening/project', { params: finalParams });
    return {
      data: response.data || []
    };
  } catch (error) {
    console.error("Error fetching period total screening data", error);
    return {
      data: []
    };
  }
};
export const getStudyMonthlyScreening = async (params = {}) => {
  try {
    // Add default parameters for getting the last 3 months
    const defaultParams = {
      period: 'monthly',
      limit: 1,
      sort: 'date DESC',
      end_date: new Date().toISOString().split('T')[0]
    };
    
    // Merge default params with any provided params
    const finalParams = { ...defaultParams, ...params };
    
    const response = await apiClient.get('/tracking/screening/study', { params: finalParams });
    return {
      data: response.data || []
    };
  } catch (error) {
    console.error("Error fetching study monthly screening data", error);
    return {
      data: []
    };
  }
};




export default {
  getSummaryData,
  getDetailData,
  getSummaryDataByDataType,
  getSummaryDataByStudy,
  getSummaryDataByDevice,
  getSummaryDataByCondition,
  getUniquePatients,
  getStudyTracking,
  getStudyTimeline,
  getPeriodTotalRecruitment,
  getStudyLifetimeRecruitment,
  getRecruitmentData,
};