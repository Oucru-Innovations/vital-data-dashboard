import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Divider } from '@mui/material';
import { HistogramChart, ScatterPlotChart } from '../components/charts';
import config from '../config';
import { fileSizeInsightsMockData } from '../mock/mockData';

const FileSizeInsights = () => {
  const [fileSizeData, setFileSizeData] = useState(null);

  useEffect(() => {
    if (config.useMock) {
      setFileSizeData(fileSizeInsightsMockData);
    } else {
      const fetchFileSizeData = async () => {
        const response = await fetch('/api/fileSizeInsights');
        const data = await response.json();
        setFileSizeData(data);
      };

      fetchFileSizeData();
    }
  }, []);

  if (!fileSizeData) {
    return <Typography>Loading...</Typography>;
  }

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
          <HistogramChart data={fileSizeData} />
        </Grid>

        {/* Scatter Plot */}
        <Grid item xs={12} md={6}>
          {/* <Typography variant="h6" sx={{ mb: 1 }}>
            File Sizes Over Time by Study
          </Typography> */}
          <ScatterPlotChart data={fileSizeData} />
        </Grid>
      </Grid>
      <Divider sx={{ my: 4 }} />
    </Box>
  );
};

export default FileSizeInsights;
