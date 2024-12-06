import Plot from 'react-plotly.js';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import ReactECharts from 'echarts-for-react';
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';


export const TreemapChart = ({ data }) => {
  const getTreemapData = (summaryData) => {
    const studyMap = {};

    // Group data by study and file types
    summaryData.study.forEach((study, index) => {
      const fileType = summaryData.fileType[index];
      const fileCount = summaryData.fileCount[index];

      if (!studyMap[study]) {
        studyMap[study] = { name: study, children: [] };
      }

      // Add file type as a child node
      studyMap[study].children.push({
        name: fileType,
        value: fileCount,
      });
    });

    // Add a total node for "All Studies"
    return [
      {
        name: 'All Studies',
        children: Object.values(studyMap),
      },
    ];
  };

  const treemapData = getTreemapData(data);

  const colorPalette = [
    '#636EFA', // Blue
    '#EF553B', // Red
    '#00CC96', // Green
    '#AB63A1', // Purple
    '#FFA15A', // Orange
    '#19D3F3', // Cyan
    '#FF6692', // Pink
    '#B6E880', // Lime
    '#FF97FF', // Magenta
    '#FECB52', // Yellow
  ];

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const { name, value } = params.data;
        return `<b>${name}</b>: ${value} files`;
      },
    },
    series: [
      {
        type: 'treemap',
        data: treemapData,
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
              borderWidth: 3,
              gapWidth: 5,
            },
            upperLabel: {
              show: true,
              height: 20,
              color: '#fff',
              backgroundColor: '#1976d2',
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
          {
            itemStyle: {
              borderColor: '#ccc',
              borderWidth: 2,
              gapWidth: 1,
            },
          },
        ],
        color: colorPalette,
      },
    ],
    legend: {
      orient: 'vertical',
      left: 'right',
      top: 'center',
      data: [...new Set(data.study)],
      formatter: (name) => `<span style="background-color:${colorPalette[data.study.indexOf(name)]};width:10px;height:10px;display:inline-block;margin-right:4px;"></span>${name}`,
    },
  };

  return <ReactECharts option={option} style={{ height: '400px', width: '100%' }} />;
};
