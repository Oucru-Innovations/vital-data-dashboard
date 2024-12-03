import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { SunburstChart, HeatmapChart } from '../components/charts';

const Overview = () => {
  // Sample data for Sunburst and Heatmap (replace with real data)
  const sunburstData = {
    labels: ['All Studies', '24EI', '24EIa', '24EIb', 'PPG', 'ECG', 'Gyro'],
    parents: ['', 'All Studies', 'All Studies', 'All Studies', '24EI', '24EI', '24EIa'],
    values: [1000, 400, 300, 300, 200, 200, 300],
  };

  const heatmapData = {
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

  return (
    <Box sx={{ padding: 4 }}>
      {/* Title */}
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
        Data Collection Overview
      </Typography>

      {/* Sunburst and Heatmap Charts */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Collected Files Distribution
          </Typography>
          <SunburstChart data={sunburstData} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Collection Days Distribution
          </Typography>
          <HeatmapChart data={heatmapData} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Overview;
