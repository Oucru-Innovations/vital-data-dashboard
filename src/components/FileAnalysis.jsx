import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Divider } from '@mui/material';
import { BubbleChart } from '../components/charts';
import FileTable from '../components/DataTable';
import config from '../config';
import { bubbleMockData, tableMockData, summaryMockDataAPI, detailMockDataAPI, detailMockGeneratedDataAPI } from '../mock/mockData';

const FileAnalysis = () => {
  const [bubbleData, setBubbleData] = useState(null);
  const [tableData, setTableData] = useState(null);

  useEffect(() => {
    if (config.useMock) {
      setBubbleData(summaryMockDataAPI);
      setTableData(detailMockGeneratedDataAPI);
    } else {
      const fetchTableData = async () => {
        const response = await fetch('/api/tableData');
        const data = await response.json();
        setTableData(data);
      };

      const fetchBubbleData = async () => {
        const response = await fetch('/api/bubbleData');
        const data = await response.json();
        setBubbleData(data);
      };

      fetchTableData();
      fetchBubbleData();
    }
  }, []);

  if (!bubbleData || !tableData) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box sx={{ padding: 4 }}>
      {/* <Typography variant="h5" sx={{ mb: 2 }}>
        File Count and Type Analysis
      </Typography> */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <BubbleChart data={bubbleData} />
        </Grid>
        <Grid item xs={12} md={6}>
          <FileTable data={tableData} />
        </Grid>
      </Grid>
      <Divider sx={{ my: 4 }} />
    </Box>
  );
};

export default FileAnalysis;
