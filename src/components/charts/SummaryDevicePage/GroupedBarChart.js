import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderGroupedBarChart = (summaryData, titleText) => {
  const uniqueDevices = [...new Set(summaryData.device)].filter(Boolean); // Remove null/undefined

  // Modern color palette
  // const modernColors = [
  //   '#FF6F61', // Coral
  //   '#6B5B95', // Purple
  //   '#88B04B', // Green
  //   '#F7CAC9', // Pink
  //   '#92A8D1', // Blue
  //   '#955251', // Rose
  //   '#B565A7', // Orchid
  //   '#009B77', // Emerald
  //   '#DD4124', // Tomato
  //   '#D65076', // Amethyst
  // ];
  const modernColors = ['#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#f44336',
    '#009688', '#795548', '#e91e63', '#607d8b', '#ffc107'];

  const deviceColorMap = uniqueDevices.reduce((acc, device, index) => {
    acc[device] = modernColors[index % modernColors.length];
    return acc;
  }, {});

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
      axisPointer: { type: 'shadow' },
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
      bottom: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['Patients', 'Duration (hours)', 'Sessions'],
      name: 'Metrics',
      axisLabel: {
        fontSize: 12,
        color: '#666',
      },
    },
    yAxis: {
      type: 'value',
      name: 'Value',
      axisLabel: {
        fontSize: 12,
        color: '#666',
      },
    },
    series: uniqueDevices.map((device) => ({
      name: device,
      type: 'bar',
      emphasis: {
        focus: 'series',
      },
      data: [
        parseFloat(summaryData.patient[summaryData.device.indexOf(device)] || 0),
        parseFloat(summaryData.duration[summaryData.device.indexOf(device)] || 0),
        parseFloat(summaryData.session[summaryData.device.indexOf(device)] || 0),
      ],
      itemStyle: {
        color: deviceColorMap[device],
      },
    })),
  };

  return <ReactECharts option={option} style={{ height: '400px', marginTop: '16px' }} />;
};
