import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderSunburstChart = (summaryData, summaryDataValues, titleText) => {
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

  const data = uniqueConditions.map((condition, index) => ({
    name: condition,
    value: summaryData.condition.reduce(
      (sum, cond, idx) => (cond === condition ? sum + parseInt(summaryDataValues[idx], 10) : sum),
      0
    ),
    itemStyle: {
      color: conditionColorMap[condition],
    },
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
      formatter: '{b}: {c}',
    },
    series: [
      {
        type: 'sunburst',
        radius: [0, '85%'],
        data: data,
        universalTransition: true,
        label: {
          show: true,
          rotate: 'radial',
          fontSize: 10,
          color: '#000',
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
        },
        emphasis: {
          focus: 'ancestor',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            borderColor: '#ff5722',
            borderWidth: 3,
          },
          label: {
            fontSize: 14,
            fontWeight: 'bold',
            color: '#ff5722',
          },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '400px', marginTop: '16px' }} />;
};
