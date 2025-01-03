import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderRadarChart = (summaryData) => {
  const uniqueStudies = Array.from(new Set(summaryData.study));
  const uniqueDatatypes = Array.from(new Set(summaryData.datatype));

  const indicator = uniqueStudies.map((study) => ({
    name: study,
    max: Math.max(...summaryData.session.map((s) => parseInt(s, 10))) + 10, // Adjust max for better scaling
  }));

  const seriesData = uniqueDatatypes.map((datatype) => ({
    name: datatype,
    value: uniqueStudies.map((study) => {
      let total = 0;
      summaryData.study.forEach((s, index) => {
        if (s === study && summaryData.datatype[index] === datatype) {
          total += parseInt(summaryData.session[index], 10);
        }
      });
      return total;
    }),
  }));

  const option = {
    title: {
      text: 'Session Distribution (Radar)',
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {},
    legend: {
      bottom: 0,
      data: uniqueDatatypes,
    },
    radar: {
      indicator: indicator,
      shape: 'circle',
    },
    series: [
      {
        type: 'radar',
        data: seriesData,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '400px', marginTop: '16px' }} />;
};
