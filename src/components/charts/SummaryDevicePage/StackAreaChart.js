import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderStackedAreaChart = (summaryData, titleText) => {
  const uniqueDevices = [...new Set(summaryData.device)].filter(Boolean); // Remove null/undefined

  // Modern color palette
  const modernColors = [
    '#4caf50', // Green
    '#2196f3', // Blue
    '#ff9800', // Orange
    '#f44336', // Red
    '#9c27b0', // Purple
  ];

  const deviceColorMap = uniqueDevices.reduce((acc, device, index) => {
    acc[device] = modernColors[index % modernColors.length];
    return acc;
  }, {});

  const series = uniqueDevices.map((device) => ({
    name: device,
    type: 'line',
    stack: 'total',
    areaStyle: {
      opacity: 0.8,
    },
    emphasis: {
      focus: 'series',
    },
    itemStyle: {
      color: deviceColorMap[device],
    },
    data: summaryData.device.map((cond, index) =>
      cond === device ? parseInt(summaryData.session[index], 10) : 0
    ),
  }));

  const option = {
    title: {
      text: titleText,
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params) => {
        const content = params.map((p) => `${p.seriesName}: ${p.value}`).join('<br>');
        return `<b>${params[0].axisValueLabel}</b><br>${content}`;
      },
    },
    legend: {
      bottom: 0,
      data: uniqueDevices,
      textStyle: {
        fontSize: 12,
        color: '#666',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: uniqueDevices, // Use devices directly as categories
      name: 'Device',
      axisLabel: {
        rotate: 30,
        fontSize: 12,
        color: '#666',
      },
    },
    yAxis: {
      type: 'value',
      name: 'Sessions',
      axisLabel: {
        fontSize: 12,
        color: '#666',
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#ddd',
        },
      },
    },
    series: series,
  };

  return <ReactECharts option={option} style={{ height: '400px', marginTop: '16px' }} />;
};
