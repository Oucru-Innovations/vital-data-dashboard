import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Divider } from '@mui/material';
import { HistogramChart } from './charts/DashboardPage/HistogramChart';
import { ScatterPlotChart } from './charts/DashboardPage/ScatterChart';
import { RoseChart } from './charts/DashboardPage/RoseChart';
import { GradientStackedAreaChart } from './charts/DashboardPage/GradientStackedAreaChart';


const FileSizeInsights = ({ detailData }) => {
  // const fileSizeData = detailData

  return (
    <Box sx={{ padding: 4 }}>
      {/* <Typography variant="h5" sx={{ mb: 2 }}>
        Size Distribution and Outliers
      </Typography> */}
      <Grid container spacing={4}>
        {/* Histogram */}
        <Grid item xs={12} md={6}>
          {/* <Typography variant="h6" sx={{ mb: 1 }}>
            File Size Distribution by Study
          </Typography> */}
          <HistogramChart data={detailData} />
        </Grid>

        {/* Scatter Plot */}
        <Grid item xs={12} md={6}>
          {/* <Typography variant="h6" sx={{ mb: 1 }}>
            File Sizes Over Time by Study
          </Typography> */}
          <ScatterPlotChart data={detailData} />
        </Grid>

        {/* Scatter Plot */}
        <Grid item xs={12} md={6}>
          {/* <Typography variant="h6" sx={{ mb: 1 }}>
            File Sizes Over Time by Study
          </Typography> */}
          <RoseChart data={detailData} />
        </Grid>

        {/* Radar Plot */}
        <Grid it  em xs={12} md={6}>
          {/* <Typography variant="h6" sx={{ mb: 1 }}>
            File Sizes Over Time by Study
          </Typography> */}
          <GradientStackedAreaChart data={detailData} />
        </Grid>
      </Grid>
      <Divider sx={{ my: 4 }} />
    </Box>
  );
};

export default FileSizeInsights;
