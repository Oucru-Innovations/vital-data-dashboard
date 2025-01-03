import React from 'react';
import ReactECharts from 'echarts-for-react';

export const SankeyChart = ({ data }) => {
  // Build nodes and links for Sankey
  const uniqueStudies = Array.from(new Set(data.study));
  const uniqueFileTypes = Array.from(new Set(data.fileType));
  const nodes = [
    ...uniqueStudies.map((study) => ({ name: study })),
    ...uniqueFileTypes.map((fileType) => ({ name: fileType })),
  ];

  const links = data.study.map((study, i) => ({
    source: study,
    target: data.fileType[i],
    value: data.fileSize[i],
  }));

  // Chart options
  const option = {
    title: {
      text: 'Sankey Diagram: File Flow by Study and Type',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (params.data.source) {
          return `Flow: ${params.data.source} → ${params.data.target}<br/>File Size: ${params.data.value} MB`;
        }
        return `${params.name}`;
      },
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        data: nodes,
        links: links,
        emphasis: {
          focus: 'adjacency',
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.5,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 400 }} />;
};
