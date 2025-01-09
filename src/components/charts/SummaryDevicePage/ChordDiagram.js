import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderChordDiagram = (summaryData, titleText) => {
  const uniqueDevices = [...new Set(summaryData.device)].filter(Boolean); // Exclude null/undefined devices

  // Generate matrix data for relationships between devices and metrics
  const matrix = uniqueDevices.map((device) =>
    ['Patients', 'Duration (hours)', 'Sessions'].map((metric, index) => {
      switch (metric) {
        case 'Patients':
          return parseInt(summaryData.patient[summaryData.device.indexOf(device)] || 0, 10);
        case 'Duration (hours)':
          return parseFloat(summaryData.duration[summaryData.device.indexOf(device)] || 0);
        case 'Sessions':
          return parseInt(summaryData.session[summaryData.device.indexOf(device)] || 0, 10);
        default:
          return 0;
      }
    })
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
      trigger: 'item',
      formatter: '{b}: {c}',
    },
    series: [
      {
        type: 'chord',
        data: [
          ...uniqueDevices.map((device) => ({ name: device })),
          { name: 'Patients' },
          { name: 'Duration (hours)' },
          { name: 'Sessions' },
        ],
        matrix: matrix,
        ribbonType: true,
        itemStyle: {
          borderWidth: 1,
          borderColor: '#aaa',
        },
        lineStyle: {
          width: 1,
          opacity: 0.8,
        },
        label: {
          show: true,
          fontSize: 12,
          color: '#666',
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '400px', marginTop: '16px' }} />;
};
