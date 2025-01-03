import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderSunburstChart = (summaryData, summaryDataValues,titleText) => {
  const uniqueDatatypes = Array.from(new Set(summaryData.condition));
  const uniqueStudies = Array.from(new Set(summaryData.study));

  const datatypeColors = ['#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#f44336'];
  const studyColors = ['#81c784', '#64b5f6', '#ba68c8', '#ffb74d', '#e57373'];

  const datatypeColorMap = uniqueDatatypes.reduce((acc, datatype, index) => {
    acc[datatype] = datatypeColors[index % datatypeColors.length];
    return acc;
  }, {});

  const studyColorMap = uniqueStudies.reduce((acc, study, index) => {
    acc[study] = studyColors[index % studyColors.length];
    return acc;
  }, {});

  const data = summaryData.condition.map((datatype, index) => ({
    name: datatype,
    value: parseInt(summaryDataValues[index]),
    itemStyle: {
      color: datatypeColorMap[datatype],
    },
    children: [
      {
        name: summaryData.study[index],
        value: parseInt(summaryDataValues[index]),
        itemStyle: {
          color: studyColorMap[summaryData.study[index]],
        },
      },
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
