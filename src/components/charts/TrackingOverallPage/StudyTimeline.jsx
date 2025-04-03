import React from 'react';
import { format, parse } from 'date-fns';
import { Box, Typography, Paper } from '@mui/material';
import ReactECharts from 'echarts-for-react';

const COLORS = ['#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#f44336'];

const StudyTimeline = ({ studies }) => {
  // Use mock data if studies is empty
  const data = studies?.length > 0 ? studies : [
    
  ];

  // Sort studies by name
  const sortedStudies = [...data].sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  // Find the earliest start date and latest end date
  const today = new Date(); // This will be our “today” line.
  const startDate = new Date(new Date().getTime()  - 365 * 24 * 60 * 60 * 1000); // 1 year ago
  const endDate = new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year in the future

  // Prepare data for ECharts
  const seriesData = sortedStudies.filter(study => study.end > startDate).map((study, index) => ({
    name: study.name,
    value: [
      study.start<startDate? startDate : study.start,
      study.end>endDate? endDate : study.end,
    ]
  }));

  const option = {
    title: {
      text: 'Timeline Tracking',
      left: 'center',
    },
    xAxis: { type: 'time' },
    yAxis: { type: 'category' },
    series: [
      {
        type: 'custom',
        renderItem: (params, api) => {
          const start = api.value(0);
          const end = api.value(1);
          const idx = api.value(2);
          const [x0, y0] = api.coord([start, idx]);
          const [x1] = api.coord([end, idx]);
          return {
            type: 'rect',
            shape: {
              x: x0,
              y: y0 - 5,
              width: x1 - x0,
              height: 10,
            },
            
          style: {
            fill: COLORS[idx % COLORS.length],
            opacity: 0.8
          }
            // style: api.style(),
          };
        },
        encode: {
          x: [0, 1],
          y: 2,
        },
        data: seriesData.map((item, i) => [item.value[0], item.value[1], item.name]),
      },

      {
        // empty line series for the “today” markLine
        type: 'line',
        data: [],
        markLine: {
          symbol: 'none',
          data: [
            {
              xAxis: today.getTime(),
              label: {
                show:true,
                formatter: format(today, 'dd/MM/yyyy'),
                position: 'end',
                color: 'red',
                rotate: 360,
                // distance: -10,
        // align: 'center',
                // align: 'left',
                // verticalAlign: 'middle',
                fontSize: 12,
                // padding: [0, 0, 0, 30], // Adds some padding to prevent overlap
              }
            },
          ],
          lineStyle: {
            color: 'red',
            width: 2,
            type: 'solid'
          },
        },
      },





    ],
  };
  
  return (
    <Paper elevation={3} sx={{ p: 2, mt: 3 }}>
      <Box sx={{ height: 400 }}>
        <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
      </Box>
    </Paper>
  );
};

export default StudyTimeline;
