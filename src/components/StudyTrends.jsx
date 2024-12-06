import React from 'react';
import { Box, Typography, Grid, Divider } from '@mui/material';
import { GroupedBarChart } from './charts/GroupedBarChart';
import { ViolinChart } from './charts/ViolinChart';
import { LineChartWithMarkers } from './charts/LineChart';
import { SankeyChart } from './charts/SankeyChart';


const StudyTrends = ({summaryData,detailData}) => {
  // const [groupedBarData, setGroupedBarData] = useState(null);
  // const [lineChartData, setLineChartData] = useState(null);
  // const [violinData, setViolinData] = useState(null);
  // const [treemapData, setTreemapData] = useState(null);

  // useEffect(() => {
  //   if (config.useMock) {
  //     setGroupedBarData(detailMockGeneratedDataAPI);
  //     setLineChartData(lineChartMockData);
  //     setViolinData(detailMockGeneratedDataAPI);
  //     setTreemapData(treemapMockData);
  //   } else {
  //     const fetchGroupedBarData = async () => {
  //       const response = await fetch('/api/groupedBarData');
  //       const data = await response.json();
  //       setGroupedBarData(data);
  //     };

  //     const fetchLineChartData = async () => {
  //       const response = await fetch('/api/lineChartData');
  //       const data = await response.json();
  //       setLineChartData(data);
  //     };

  //     const fetchViolinData = async () => {
  //       const response = await fetch('/api/violinData');
  //       const data = await response.json();
  //       setViolinData(data);
  //     };
      
  //     const fetchTreemapData = async () => {
  //       const response = await fetch('/api/TreemapData');
  //       const data = await response.json();
  //       setViolinData(data);
  //     };

  //     fetchGroupedBarData();
  //     fetchLineChartData();
  //     fetchViolinData();
  //     fetchTreemapData();
  //   }
  // }, []);

  // if (!groupedBarData || !lineChartData || !violinData) {
  //   return <Typography>Loading...</Typography>;
  // }

  return (
    <Box sx={{ padding: 4 }}>
      {/* <Typography variant="h5" sx={{ mb: 2 }}>
        Trends by Study and File Type
      </Typography> */}
      <Grid container spacing={4}>
        {/* Grouped Bar Chart */}
        <Grid item xs={12} md={6}>
          {/* <Typography variant="h6" sx={{ mb: 1 }}>
            Daily File Counts by File Type
          </Typography> */}
          <GroupedBarChart data={detailData} />
        </Grid>

        
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Cumulative File Counts Over Time
          </Typography>
          <LineChartWithMarkers data={detailData} />
        </Grid>
        {/*
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            File Distribution by Study and File Type
          </Typography>
          <TreemapChart data={treemapData} />
        </Grid>
        */}
        
        {/* Violin Plot */}
        <Grid item xs={12} md={6}>
          {/* <Typography variant="h6" sx={{ mb: 1 }}>
            Duration Distribution by Study and File Type
          </Typography> */}
          <ViolinChart data={detailData} />
        </Grid>

        {/* Sankey Chart */}
        <Grid item xs={12} md={6}>
          {/* <Typography variant="h6" sx={{ mb: 1 }}>
            Duration Distribution by Study and File Type
          </Typography> */}
          <SankeyChart data={detailData} />
        </Grid>
      </Grid>
      <Divider sx={{ my: 4 }} />
    </Box>
  );
};

export default StudyTrends;