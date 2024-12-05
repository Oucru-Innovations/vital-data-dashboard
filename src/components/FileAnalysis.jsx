import React from 'react';
import { Box, Typography, Grid, Divider } from '@mui/material';
import { BubbleChart, TreemapChart } from '../components/charts';
import FileTable from '../components/DataTable';

const FileAnalysis = ({ summaryData, detailData }) => {
  // Process data for bubble chart
  const bubbleData = summaryData.fileType.map((type, index) => ({
    fileType: type,
    fileCount: summaryData.fileCount[index],
    fileSize: summaryData.totalSize[index],
    study: summaryData.study[index],
  }));

  return (
    <Box sx={{ padding: 4 }}>
      <Grid container spacing={4}>
        {/* Bubble Chart */}
        <Grid item xs={12} md={6}>
          <BubbleChart
            data={{
              studies: bubbleData.map((d) => d.study),
              fileSizes: bubbleData.map((d) => d.fileSize),
              fileCounts: bubbleData.map((d) => d.fileCount),
              fileTypes: bubbleData.map((d) => d.fileType),
            }}
          />
        </Grid>

        

        <Grid item xs={12} md={6}>
          {/* <Typography variant="h6" sx={{ mb: 1 }}>
            Duration Distribution by Study and File Type
          </Typography> */}
          <TreemapChart data={summaryData} />
        </Grid>

        {/* File Table */}
        <Grid item xs={12} md={12}>
          <FileTable data={detailData} />
        </Grid>

      </Grid>
      <Divider sx={{ my: 4 }} />
    </Box>
  );
};

export default FileAnalysis;
