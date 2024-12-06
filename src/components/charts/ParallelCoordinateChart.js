import React from 'react';
import ReactECharts from 'echarts-for-react';

export const ParallelCoordinatesChart = ({ data }) => {
  // Transform data for Parallel Coordinates
  const uniqueFileTypes = Array.from(new Set(data.fileType));
  const parallelData = data.study.map((_, i) => [
    data.study[i],
    uniqueFileTypes.indexOf(data.fileType[i]),
    data.fileSize[i],
    data.duration[i],
  ]);

  // Chart options
  const option = {
    title: {
      text: 'Parallel Coordinates: Study Data',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    parallelAxis: [
      { dim: 0, name: 'Study', type: 'category', data: Array.from(new Set(data.study)) },
      { dim: 1, name: 'File Type', type: 'category', data: uniqueFileTypes },
      { dim: 2, name: 'File Size (MB)', type: 'value' },
      { dim: 3, name: 'Duration (min)', type: 'value' },
    ],
    series: [
      {
        type: 'parallel',
        lineStyle: {
          width: 2,
        },
        data: parallelData,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 400 }} />;
};
