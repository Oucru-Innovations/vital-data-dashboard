import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderChordDiagram = (summaryData, titleText) => {
  const uniqueConditions = [...new Set(summaryData.condition)].filter(Boolean); // Exclude null/undefined conditions

  // Generate matrix data for relationships between conditions and metrics
  const matrix = uniqueConditions.map((condition) =>
    ['Patients', 'Duration (hours)', 'Sessions'].map((metric, index) => {
      switch (metric) {
        case 'Patients':
          return parseInt(summaryData.patient[summaryData.condition.indexOf(condition)] || 0, 10);
        case 'Duration (hours)':
          return parseFloat(summaryData.duration[summaryData.condition.indexOf(condition)] || 0);
        case 'Sessions':
          return parseInt(summaryData.session[summaryData.condition.indexOf(condition)] || 0, 10);
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
          ...uniqueConditions.map((condition) => ({ name: condition })),
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
