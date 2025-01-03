import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderGroupedBarChart = (summaryData, titleText) => {
  const uniqueConditions = [...new Set(summaryData.condition)].filter(Boolean); // Remove null/undefined

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

  const conditionColorMap = uniqueConditions.reduce((acc, condition, index) => {
    acc[condition] = modernColors[index % modernColors.length];
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
      data: uniqueConditions,
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
      data: ['Patients', 'Duration (mins)', 'Sessions'],
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
    series: uniqueConditions.map((condition) => ({
      name: condition,
      type: 'bar',
      emphasis: {
        focus: 'series',
      },
      data: [
        parseFloat(summaryData.patient[summaryData.condition.indexOf(condition)] || 0),
        parseFloat(summaryData.duration[summaryData.condition.indexOf(condition)] || 0),
        parseFloat(summaryData.session[summaryData.condition.indexOf(condition)] || 0),
      ],
      itemStyle: {
        color: conditionColorMap[condition],
      },
    })),
  };

  return <ReactECharts option={option} style={{ height: '400px', marginTop: '16px' }} />;
};
