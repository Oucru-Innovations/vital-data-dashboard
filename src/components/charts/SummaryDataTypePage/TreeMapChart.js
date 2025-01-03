import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderTreeMapChart = (summaryData) => {
  const uniqueDatatypes = Array.from(new Set(summaryData.datatype));
  const uniqueStudies = Array.from(new Set(summaryData.study));

  const datatypeColors = ['#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#f44336'];
  const datatypeColorMap = uniqueDatatypes.reduce((acc, datatype, index) => {
    acc[datatype] = datatypeColors[index % datatypeColors.length];
    return acc;
  }, {});

  const data = uniqueDatatypes.map((datatype) => ({
    name: datatype,
    value: summaryData.session
      .map((_, index) => (summaryData.datatype[index] === datatype ? parseInt(summaryData.session[index], 10) : 0))
      .reduce((a, b) => a + b, 0), // Total sessions for each datatype
    children: uniqueStudies.map((study, index) => ({
      name: study,
      value:
        summaryData.datatype[index] === datatype ? parseInt(summaryData.session[index], 10) : 0,
      itemStyle: { color: datatypeColorMap[datatype] },
    })),
    itemStyle: { color: datatypeColorMap[datatype] },
  }));

  const option = {
    title: {
      text: 'Session Distribution',
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
        type: 'treemap',
        data: data,
        leafDepth: 1,
        label: {
          show: true,
          formatter: '{b}',
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
        },
        levels: [
          {
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 2,
              gapWidth: 1,
            },
            label: {
              show: true,
              fontSize: 14,
            },
          },
        ],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '400px', marginTop: '16px' }} />;
};
