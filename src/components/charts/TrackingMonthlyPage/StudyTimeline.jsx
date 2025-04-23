import React from 'react';
import { format, parse } from 'date-fns';
import { Box, Typography, Paper } from '@mui/material';
import ReactECharts from 'echarts-for-react';

const COLORS = ['#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#f44336'];

const StudyTimeline = ({ studies }) => {
  // Use mock data if studies is empty
  const data = studies?.length > 0 ? studies : [];

  // Sort studies by name
  const sortedStudies = [...data].sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  // Find the earliest start date and latest end date
  const today = new Date(); // This will be our "today" line
  const startDate = new Date(new Date().getTime() - 12 * 30 * 24 * 60 * 60 * 1000); // 12 months ago
  const endDate = new Date(new Date().getTime() + 12 * 30 * 24 * 60 * 60 * 1000); // 12 months in the future

  // Prepare data for ECharts
  const seriesData = sortedStudies.filter(study => study.end > startDate).map((study, index) => ({
    name: study.name,
    value: [
      study.start < startDate ? startDate : study.start,
      study.end > endDate ? endDate : study.end,
    ]
  }));

  const option = {
    title: {
      text: 'Monthly Timeline Tracking',
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
          };
        },
        encode: {
          x: [0, 1],
          y: 2,
        },
        data: seriesData.map((item, i) => [item.value[0], item.value[1], item.name]),
      },
      {
        // empty line series for the "today" markLine
        type: 'line',
        data: [],
        markLine: {
          symbol: 'none',
          data: [
            {
              xAxis: today.getTime(),
              label: {
                show: true,
                formatter: format(today, 'dd/MM/yyyy'),
                position: 'end',
                color: 'red',
                rotate: 360,
                fontSize: 12,
              }
            },
          ],
          lineStyle: {
            color: 'red',
            width: 2,
            type: 'solid'
          },
        }
      }
    ],
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const study = sortedStudies.find(s => s.name === params.name);
        return `
          <div style="font-weight: bold">${study.name}</div>
          <div>Start: ${format(study.start, 'dd/MM/yyyy')}</div>
          <div>End: ${format(study.end, 'dd/MM/yyyy')}</div>
          <div>Duration: ${Math.ceil((study.end - study.start) / (30 * 24 * 60 * 60 * 1000))} months</div>
        `;
      }
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 4 }}>
      <Box sx={{ height: 400 }}>
        <ReactECharts option={option} style={{ height: '100%' }} />
      </Box>
    </Paper>
  );
};

export default StudyTimeline; 