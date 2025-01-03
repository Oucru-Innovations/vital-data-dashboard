import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';

export const renderGroupedBarChart = (summaryData) => {
    const option = {
      title: {
        text: 'Duration Comparison by Study and Datatype',
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
        data: [...new Set(summaryData.datatype)],
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: [...new Set(summaryData.study)],
        name: 'Study',
      },
      yAxis: {
        type: 'value',
        name: 'Duration (mins)',
      },
      series: [...new Set(summaryData.datatype)].map((datatype) => ({
        name: datatype,
        type: 'bar',
        barGap: 0,
        emphasis: {
          focus: 'series',
        },
        data: summaryData.study.map((study, index) =>
          summaryData.datatype[index] === datatype
            ? parseFloat(summaryData.duration[index])
            : 0
        ),
        itemStyle: {
          color:
            datatype === 'PPG'
              ? '#43a047' // Dark Green
              : datatype === 'ECG'
              ? '#1e88e5' // Bold Blue
              : '#8e24aa', // Deep Purple
        },
      })),
    };

    return <ReactECharts option={option} style={{ height: '400px', marginTop: '16px' }} />;
  };
