import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderSunburstChart = (summaryData, summaryDataValues, titleText) => {
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

  const data = uniqueDevices.map((device, index) => ({
    name: device,
    value: summaryData.device.reduce(
      (sum, cond, idx) => (cond === device ? sum + parseInt(summaryDataValues[idx], 10) : sum),
      0
    ),
    itemStyle: {
      color: deviceColorMap[device],
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
