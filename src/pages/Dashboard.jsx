import React, { Suspense } from 'react';
import { Box, Typography, Grid, Divider } from '@mui/material';
import Footer from '../components/Footer';
import config from '../config';
import { summaryMockData, sunburstMockData, heatmapMockData } from '../mock/mockData';

// Lazy load large components for performance
const SummaryCard = React.lazy(() => import('../components/SummaryCards'));
const SunburstChart = React.lazy(() => import('../components/charts').then(module => ({ default: module.SunburstChart })));
const HeatmapChart = React.lazy(() => import('../components/charts').then(module => ({ default: module.HeatmapChart })));
const FileAnalysis = React.lazy(() => import('../components/FileAnalysis'));
const StudyTrends = React.lazy(() => import('../components/StudyTrends'));
const FileSizeInsights = React.lazy(() => import('../components/FileSizeInsights'));

// Utility to fetch data (mock or API)
const getData = (mockData, apiData) => (config.useMock ? mockData : apiData || {});

const DashboardSection = ({ title, children }) => (
  <Box sx={{ mb: 4 }}>
    <Typography variant="h5" sx={{ mb: 2 }}>
      {title}
    </Typography>
    {children}
  </Box>
);

const Dashboard = () => {
  const summaryData = getData(summaryMockData, null);
  const sunburstData = getData(sunburstMockData, null);
  const heatmapData = getData(heatmapMockData, null);

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
              { title: 'Total Files Collected', value: summaryData.totalFiles, color: { 50: '#e3f2fd', 700: '#1976d2', 800: '#0d47a1' } },
              { title: 'Total Days Collected', value: summaryData.totalDays, color: { 50: '#e8f5e9', 700: '#388e3c', 800: '#1b5e20' } },
              { title: 'Total Duration', value: summaryData.totalDuration, color: { 50: '#fff3e0', 700: '#f57c00', 800: '#e65100' } },
              { title: 'Total File Size', value: summaryData.totalFileSize, color: { 50: '#ffebee', 700: '#d32f2f', 800: '#b71c1c' } },
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
              <Suspense fallback={<Typography>Loading...</Typography>}>
                <SunburstChart data={sunburstData} />
              </Suspense>
            </Grid>
            <Grid item xs={12} md={6}>
              <Suspense fallback={<Typography>Loading...</Typography>}>
                <HeatmapChart data={heatmapData} />
              </Suspense>
            </Grid>
          </Grid>
        </DashboardSection>

        {/* Section 2: File Analysis */}
        <DashboardSection title="File Count and Type Analysis">
          <Suspense fallback={<Typography>Loading...</Typography>}>
            <FileAnalysis />
          </Suspense>
        </DashboardSection>

        {/* Section 3: Study Trends */}
        <DashboardSection title="Trends by Study and File Type">
          <Suspense fallback={<Typography>Loading...</Typography>}>
            <StudyTrends />
          </Suspense>
        </DashboardSection>

        {/* Section 4: File Size Insights */}
        <DashboardSection title="Size Distribution and Outliers">
          <Suspense fallback={<Typography>Loading...</Typography>}>
            <FileSizeInsights />
          </Suspense>
        </DashboardSection>
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default Dashboard;
