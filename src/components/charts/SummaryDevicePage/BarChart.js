import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderBarChart = (summaryData, summaryDataValues, titleText) => {
  const uniqueDevices = [...new Set(summaryData.device)].filter(Boolean); // Remove null/undefined

  // Modern color palette
  const modernColors = [
    '#FF6F61', // Coral
    '#6B5B95', // Purple
    '#88B04B', // Green
    '#F7CAC9', // Pink
    '#92A8D1', // Blue
    '#955251', // Rose
    '#B565A7', // Orchid
    '#009B77', // Emerald
    '#DD4124', // Tomato
    '#D65076', // Amethyst
  ];

  const deviceColorMap = uniqueDevices.reduce((acc, device, index) => {
    acc[device] = modernColors[index % modernColors.length];
    return acc;
  }, {});

  const durationByDevice = uniqueDevices.map(
    (device, index) => parseFloat(summaryDataValues[index] || 0)
  );

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
      formatter: '{b}<br />{a}: {c} hours',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: uniqueDevices,
      name: 'Device',
      axisLabel: {
        fontSize: 12,
        color: '#666',
        rotate: 30, // Rotate labels for better readability
      },
    },
    yAxis: {
      type: 'value',
      name: 'Duration (hours)',
      axisLabel: {
        fontSize: 12,
        color: '#666',
      },
    },
    series: [
      {
        name: 'Duration',
        type: 'bar',
        data: durationByDevice,
        itemStyle: {
          color: (params) => deviceColorMap[params.name],
        },
        emphasis: {
          focus: 'series',
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '400px', marginTop: '16px' }} />;
};
