import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderGroupedBarChart = (summaryData, summaryDataValues, titleText) => {
  const uniqueDatatypes = [...new Set(summaryData.datatype)];
  const uniqueStudies = [...new Set(summaryData.study)];

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

  const datatypeColorMap = uniqueDatatypes.reduce((acc, datatype, index) => {
    acc[datatype] = modernColors[index % modernColors.length];
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
      data: uniqueDatatypes,
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
      data: uniqueStudies,
      name: 'Study',
      axisLabel: {
        rotate: 30,
        interval: 0,
        fontSize: 12,
        color: '#666',
      },
    },
    yAxis: {
      type: 'value',
      name: 'Duration (mins)',
      axisLabel: {
        fontSize: 12,
        color: '#666',
      },
    },
    series: uniqueDatatypes.map((datatype) => ({
      name: datatype,
      type: 'bar',
      barGap: 0,
      emphasis: {
        focus: 'series',
      },
      data: uniqueStudies.map((study, index) =>
        summaryData.datatype[index] === datatype
          ? parseFloat(summaryDataValues[index])
          : 0
      ),
      itemStyle: {
        color: datatypeColorMap[datatype],
      },
    })),
  };

  return <ReactECharts option={option} style={{ height: '400px', marginTop: '16px' }} />;
};
