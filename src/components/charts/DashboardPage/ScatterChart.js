import Plot from 'react-plotly.js';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import ReactECharts from 'echarts-for-react';
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';


export const ScatterPlotChartPlotly = ({ data }) => {
  // Generate unique studies from the data
  const uniqueStudies = [...new Set(data.study)];

  // Create a color scale based on the number of unique studies
  const colorScale = scaleOrdinal(schemeCategory10).domain(uniqueStudies);

  // Create traces for each study
  const traces = uniqueStudies.map((study) => ({
    x: data.date.filter((_, index) => data.study[index] === study),
    y: data.fileSize.filter((_, index) => data.study[index] === study),
    mode: 'markers',
    name: study,
    marker: {
      size: 10,
      opacity: 0.8,
      color: colorScale(study), // Dynamically assign color based on study
    },
  }));

  return (
    <Plot
      data={traces}
      layout={{
        title: 'File Sizes Over Time by Study',
        xaxis: { title: 'Collection Date' },
        yaxis: { title: 'File Size (MB)' },
        height: 400,
        showlegend: true, // Enable legend for better identification
        margin: { t: 40, l: 50, r: 20, b: 50 },
      }}
    />
  );
};

export const ScatterPlotChart = ({ data }) => {
  // Generate unique studies from the data
  const uniqueStudies = [...new Set(data.study)];

  // Create a color palette
  const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];

  // Group the data by study and create scatter series
  const series = uniqueStudies.map((study, index) => {
    const filteredX = data.date.filter((_, i) => data.study[i] === study);
    const filteredY = data.fileSize.filter((_, i) => data.study[i] === study);
    const dataPoints = filteredX.map((x, i) => [x, filteredY[i]]); // Pair x and y values

    return {
      name: study,
      type: 'scatter',
      data: dataPoints,
      symbolSize: 10,
      itemStyle: {
        color: colors[index % colors.length], // Cycle through colors
      },
    };
  });

  // Define ECharts option configuration
  const option = {
    title: {
      text: 'File Sizes Over Time by Study',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: (params) => `${params.seriesName}<br/>Date: ${params.data[0]}<br/>File Size: ${params.data[1]} MB`,
    },
    legend: {
      top: '10%',
      left: 'center',
    },
    xAxis: {
      type: 'category',
      name: 'Collection Date',
      nameLocation: 'middle',
      nameGap: 30,
      boundaryGap: true,
      axisLabel: {
        rotate: 30, // Rotate labels for better readability
      },
    },
    yAxis: {
      type: 'value',
      name: 'File Size (MB)',
      nameLocation: 'middle',
      nameGap: 50,
    },
    series: series,
    grid: {
      containLabel: true,
      bottom: '20%',
    },
  };

  return <ReactECharts option={option} style={{ height: 400 }} />;
};