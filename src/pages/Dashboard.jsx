import React, { useEffect, useState, Suspense } from 'react';
import { Box, Typography, Grid, Divider } from '@mui/material';
import Footer from '../components/toolbars/Footer';
import config from '../config';
import { summaryMockData, sunburstMockData, heatmapMockData, 
  detailMockDataAPI, summaryMockDataAPI
 } from '../mock/mockData';
import { getSummaryData, getDetailData } from '../services/apiService';

// Lazy load large components for performance
const SummaryCard = React.lazy(() => import('../components/cards/SummaryCards'));
const SunburstChart = React.lazy(() => import('../components/charts/SunBurstChart').then((module) => ({ default: module.SunburstChart })));
const HeatmapChart = React.lazy(() => import('../components/charts/HeatmapChart').then((module) => ({ default: module.HeatmapChart })));
const FileAnalysis = React.lazy(() => import('../components/FileAnalysis'));
const StudyTrends = React.lazy(() => import('../components/StudyTrends'));
const FileSizeInsights = React.lazy(() => import('../components/FileSizeInsights'));

const getData = async (dataMode, mockData, fetchFunction) => {
  if (dataMode === 'mock') {
    // Using mock data
    return mockData;
  } else {
    try {
      // Fetching from the API
      const data = await fetchFunction();
      return data;
    } catch (error) {
      console.error('Error fetching API data:', error);
      return null;
    }
  }
};

const DashboardSection = ({ title, children }) => (
  <Box sx={{ mb: 4 }}>
    <Typography variant="h5" sx={{ mb: 2 }}>
      {title}
    </Typography>
    {children}
  </Box>
);

const Dashboard = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const fetchDataFromAPI = async () => {
  //     try {
  //       const summary = await fetchData(getSummaryData);
  //       const detail = await fetchData(getDetailData);
  //       setSummaryData(summary);
  //       setDetailData(detail);
  //     } catch (error) {
  //       console.error('Error fetching dashboard data:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchDataFromAPI();
  // }, []);
  useEffect(() => {
    const fetchDataFromSource = async () => {
      try {
        const summary = await getData(config.dataMode, summaryMockData, getSummaryData);
        const detail = await getData(config.dataMode, detailMockDataAPI, getDetailData);

        setSummaryData(summary);
        setDetailData(detail);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchDataFromSource();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
          Loading Dashboard...
        </Typography>
      </Box>
    );
  }

  if (!summaryData || !detailData) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3, color: 'red' }}>
          Failed to load dashboard data.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
          Vital Data Dashboard
        </Typography>

        {/* Section 1: Overview */}
        <DashboardSection title="Data Collection Overview">
          {/* Summary Cards */}
          <Grid container spacing={4} sx={{ mb: 4 }}>
            {[
              { title: 'Total Files Collected', value: summaryData.fileCount.reduce((a, b) => a + b, 0), color: { 50: '#e3f2fd', 700: '#1976d2', 800: '#0d47a1' } },
              { title: 'Total Days Collected', value: summaryData.study.length, color: { 50: '#e8f5e9', 700: '#388e3c', 800: '#1b5e20' } },
              { title: 'Total Duration', value: `${summaryData.totalDuration.reduce((a, b) => a + b, 0)} mins`, color: { 50: '#fff3e0', 700: '#f57c00', 800: '#e65100' } },
              { title: 'Total File Size', value: `${(summaryData.totalSize.reduce((a, b) => a + b, 0) / 1024).toFixed(2)} GB`, color: { 50: '#ffebee', 700: '#d32f2f', 800: '#b71c1c' } },

              // New Summary Cards
              {
                title: 'Maximum Files',
                value: summaryData.study[summaryData.fileCount.indexOf(Math.max(...summaryData.fileCount))],
                color: { 50: '#ede7f6', 700: '#673ab7', 800: '#311b92' },
              },
              {
                title: 'Largest Data Size',
                value: summaryData.study[summaryData.totalSize.indexOf(Math.max(...summaryData.totalSize))],
                color: { 50: '#e1f5fe', 700: '#0288d1', 800: '#01579b' },
              },
              {
                title: 'Common File Type',
                value: summaryData.fileType[summaryData.fileCount.indexOf(Math.max(...summaryData.fileCount))],
                color: { 50: '#f3e5f5', 700: '#ab47bc', 800: '#6a1b9a' },
              },
              {
                title: 'Largest File Type',
                value: summaryData.fileType[summaryData.totalSize.indexOf(Math.max(...summaryData.totalSize))],
                color: { 50: '#fbe9e7', 700: '#ff7043', 800: '#bf360c' },
              },
            ].map((card, idx) => (
              <Grid item xs={12} sm={6} md={3} key={idx}>
                <Suspense fallback={<Typography>Loading...</Typography>}>
                  <SummaryCard {...card} />
                </Suspense>
              </Grid>
            ))}
          </Grid>



          {/* Charts */}
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Suspense fallback={<Typography>Loading Sunburst Chart...</Typography>}>
                <SunburstChart data={summaryData} />
              </Suspense>
            </Grid>
            <Grid item xs={12} md={6}>
              <Suspense fallback={<Typography>Loading Heatmap Chart...</Typography>}>
                <HeatmapChart data={summaryData} />
              </Suspense>
            </Grid>
          </Grid>
        </DashboardSection>

        {/* Section 2: File Analysis */}
        <DashboardSection title="File Count and Type Analysis">
          <Suspense fallback={<Typography>Loading File Analysis...</Typography>}>
            <FileAnalysis summaryData={summaryData} detailData={detailData} />
          </Suspense>
        </DashboardSection>

        {/* Section 3: Study Trends */}
        <DashboardSection title="Trends by Study and File Type">
          <Suspense fallback={<Typography>Loading Study Trends...</Typography>}>
            <StudyTrends summaryData={summaryData} detailData={detailData}/>
          </Suspense>
        </DashboardSection>

        {/* Section 4: File Size Insights */}
        <DashboardSection title="Size Distribution and Outliers">
          <Suspense fallback={<Typography>Loading File Size Insights...</Typography>}>
            <FileSizeInsights detailData={detailData}/>
          </Suspense>
        </DashboardSection>
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default Dashboard;
