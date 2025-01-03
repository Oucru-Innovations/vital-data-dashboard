import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderStackedAreaChart = (summaryData,summaryDataValues,titleText) => {
  const uniqueDatatypes = Array.from(new Set(summaryData.condition));

  const series = uniqueDatatypes.map((datatype) => ({
    name: datatype,
    type: 'line',
    stack: 'total',
    areaStyle: {},
    emphasis: {
      focus: 'series',
    },
    data: summaryData.study.map((study, index) =>
      summaryData.condition[index] === datatype
        ? parseInt(summaryDataValues[index], 10)
        : 0
    ),
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
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    legend: {
      bottom: 0,
      data: uniqueDatatypes,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: summaryData.study,
      name: 'Study',
    },
    yAxis: {
      type: 'value',
      name: 'Sessions',
    },
    series: series,
  };

  return <ReactECharts option={option} style={{ height: '400px', marginTop: '16px' }} />;
};
