import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderRadarChart = (summaryData, titleText) => {
  const uniqueConditions = [...new Set(summaryData.condition)].filter(Boolean); // Remove null/undefined
  const metrics = ['Patients', 'Duration (hours)', 'Sessions'];

  // Define radar indicators based on the metrics
  const indicator = metrics.map((metric) => ({
    name: metric,
    max: Math.max(
      ...uniqueConditions.map((condition) => {
        switch (metric) {
          case 'Patients':
            return parseInt(summaryData.patient[summaryData.condition.indexOf(condition)], 10) || 0;
          case 'Duration (hours)':
            return parseFloat(summaryData.duration[summaryData.condition.indexOf(condition)], 10) || 0;
          case 'Sessions':
            return parseInt(summaryData.session[summaryData.condition.indexOf(condition)], 10) || 0;
          default:
            return 0;
        }
      })
    ) * 1.2, // Add 20% buffer for better scaling
  }));

  // Prepare data for radar series
  const seriesData = uniqueConditions.map((condition) => ({
    name: condition,
    value: [
      parseInt(summaryData.patient[summaryData.condition.indexOf(condition)], 10) || 0,
      parseFloat(summaryData.duration[summaryData.condition.indexOf(condition)], 10) || 0,
      parseInt(summaryData.session[summaryData.condition.indexOf(condition)], 10) || 0,
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
      data: uniqueConditions,
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
