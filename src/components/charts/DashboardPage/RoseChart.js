import React from 'react';
import ReactECharts from 'echarts-for-react';

export const RoseChart = ({ data }) => {
  const uniqueFileTypes = Array.from(new Set(data.fileType));

  const roseData = uniqueFileTypes.map((fileType) => ({
    value: data.duration
      .filter((_, i) => data.fileType[i] === fileType)
      .reduce((a, b) => a + b, 0), // Sum durations
    name: fileType,
  }));

  const option = {
    title: {
      text: 'Nightingale Chart: Duration by File Type',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
    },
    series: [
      {
        type: 'pie',
        radius: ['30%', '70%'],
        roseType: 'area',
        data: roseData,
        label: {
          show: true,
          formatter: '{b}: {c} hours',
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 400 }} />;
};
