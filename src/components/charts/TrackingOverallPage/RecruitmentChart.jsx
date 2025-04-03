import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Box } from '@mui/material';

const COLORS = ['#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#f44336'];

export const renderRecruitmentChart = (studies) => {
  const chartData = studies.map(study => ({
    name: study.name,
    target: study.targetCount,
    enrolled: study.enrolledCount,
    active: study.activeCount
  }));

  const option = {
    title: {
      text: 'Recruitment Progress',
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {
      data: ['Target', 'Enrolled', 'Active'],
      right: '10%',
    },
    xAxis: {
      type: 'category',
      data: chartData.map(d => d.name),
      axisLabel: {
        rotate: 45,
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Number of Patients',
    },
    series: [
      {
        name: 'Target',
        type: 'bar',
        stack: 'total',
        data: chartData.map(d => d.target),
        itemStyle: {
          color: COLORS[0],
        },
      },
      {
        name: 'Enrolled',
        type: 'bar',
        stack: 'total',
        data: chartData.map(d => d.enrolled),
        itemStyle: {
          color: COLORS[1],
        },
      },
      {
        name: 'Active',
        type: 'bar',
        stack: 'total',
        data: chartData.map(d => d.active),
        itemStyle: {
          color: COLORS[2],
        },
      },
    ],
  };

  return (
    <Box sx={{ width: '100%', height: 400 }}>
      <ReactECharts option={option} />
    </Box>
  );
};
