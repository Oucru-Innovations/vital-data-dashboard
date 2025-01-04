import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderRadarChart = (summaryData, titleText) => {
  const uniqueDevices = [...new Set(summaryData.device)].filter(Boolean); // Remove null/undefined
  const metrics = ['Patients', 'Duration (mins)', 'Sessions'];

  // Define radar indicators based on the metrics
  const indicator = metrics.map((metric) => ({
    name: metric,
    max: Math.max(
      ...uniqueDevices.map((device) => {
        switch (metric) {
          case 'Patients':
            return parseInt(summaryData.patient[summaryData.device.indexOf(device)], 10) || 0;
          case 'Duration (mins)':
            return parseFloat(summaryData.duration[summaryData.device.indexOf(device)], 10) || 0;
          case 'Sessions':
            return parseInt(summaryData.session[summaryData.device.indexOf(device)], 10) || 0;
          default:
            return 0;
        }
      })
    ) * 1.2, // Add 20% buffer for better scaling
  }));

  // Prepare data for radar series
  const seriesData = uniqueDevices.map((device) => ({
    name: device,
    value: [
      parseInt(summaryData.patient[summaryData.device.indexOf(device)], 10) || 0,
      parseFloat(summaryData.duration[summaryData.device.indexOf(device)], 10) || 0,
      parseInt(summaryData.session[summaryData.device.indexOf(device)], 10) || 0,
    ],
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
      trigger: 'item',
    },
    legend: {
      bottom: 0,
      data: uniqueDevices,
      textStyle: {
        fontSize: 12,
        color: '#666',
      },
    },
    radar: {
      indicator: indicator,
      shape: 'circle',
      splitLine: {
        lineStyle: {
          color: '#ddd',
        },
      },
      splitArea: {
        areaStyle: {
          color: ['#f7f9fc', '#eef1f6'], // Alternate colors for better readability
        },
      },
      axisLine: {
        lineStyle: {
          color: '#bbb',
        },
      },
    },
    series: [
      {
        type: 'radar',
        data: seriesData,
        areaStyle: {
          opacity: 0.2,
        },
        emphasis: {
          lineStyle: {
            width: 3,
          },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '400px', marginTop: '16px' }} />;
};
