import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderTreeMapChart = (summaryData, summaryDataValues, titleText) => {
  const uniqueDatatypes = Array.from(new Set(summaryData.condition));
  const uniqueStudies = Array.from(new Set(summaryData.study));

  const datatypeColors = ['#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#f44336'];
  const datatypeColorMap = uniqueDatatypes.reduce((acc, datatype, index) => {
    acc[datatype] = datatypeColors[index % datatypeColors.length];
    return acc;
  }, {});

  const data = uniqueDatatypes.map((datatype) => ({
    name: datatype,
    value: summaryDataValues
      .map((_, index) => (summaryData.condition[index] === datatype ? parseInt(summaryDataValues[index], 10) : 0))
      .reduce((a, b) => a + b, 0),
    children: uniqueStudies.map((study, index) => ({
      name: study,
      value:
        summaryData.condition[index] === datatype ? parseInt(summaryDataValues[index], 10) : 0,
      itemStyle: { color: datatypeColorMap[datatype] },
    })),
    itemStyle: { color: datatypeColorMap[datatype] },
  }));

  const option = {
    title: {
      text: titleText,
      left: 'center',
      textStyle: {
        fontSize: 20,
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
        type: 'treemap',
        data: data,
        leafDepth: 1,
        label: {
          show: true,
          fontSize: 12,
          formatter: '{b}',
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
        },
        emphasis: {
          focus: 'descendant',
          itemStyle: {
            borderWidth: 3,
            borderColor: '#ff5722',
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '400px', marginTop: '16px' }} />;
};
