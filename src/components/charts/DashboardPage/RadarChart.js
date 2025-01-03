import React from 'react';
import ReactECharts from 'echarts-for-react';

export const RadarChart = ({ data }) => {
  const uniqueFileTypes = Array.from(new Set(data.fileType));

  const radarData = [
    {
      name: 'File Size',
      value: uniqueFileTypes.map((fileType) =>
        data.fileSize
          .filter((_, i) => data.fileType[i] === fileType)
          .reduce((a, b) => a + b, 0)
      ),
    },
    {
      name: 'Duration',
      value: uniqueFileTypes.map((fileType) =>
        data.duration
          .filter((_, i) => data.fileType[i] === fileType)
          .reduce((a, b) => a + b, 0)
      ),
    },
  ];

  const option = {
    title: {
      text: 'Radar Chart: Metrics by File Type',
      left: 'center',
    },
    tooltip: {},
    radar: {
      indicator: uniqueFileTypes.map((fileType) => ({ name: fileType, max: 100 })), // Set max dynamically as needed
    },
    series: [
      {
        type: 'radar',
        data: radarData.map((metric) => ({
          value: metric.value,
          name: metric.name,
        })),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 400 }} />;
};
