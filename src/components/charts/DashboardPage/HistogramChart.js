import Plot from 'react-plotly.js';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import ReactECharts from 'echarts-for-react';
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';



export const HistogramChartPlotly = ({ data }) => {
  // Generate unique studies from the data
  const uniqueStudies = [...new Set(data.study)];

  // Create a color scale based on the number of unique studies
  const colorScale = scaleOrdinal(schemeCategory10).domain(uniqueStudies);

  // Create a trace for each study to represent the file size distribution
  const traces = uniqueStudies.map((study) => ({
    x: data.fileSize.filter((_, index) => data.study[index] === study),
    name: study,
    type: 'histogram',
    opacity: 0.7,
    marker: {
      color: colorScale(study), // Use color scale for dynamic coloring
    },
  }));

  return (
    <Plot
      data={traces}
      layout={{
        barmode: 'overlay', // Overlapping histograms
        title: 'File Size Distribution by Study',
        xaxis: { title: 'File Size (MB)' },
        yaxis: { title: 'Count' },
        height: 400,
      }}
    />
  );
};

export const HistogramChart = ({ data }) => {
  // Generate unique studies from the data
  const uniqueStudies = [...new Set(data.study)];

  // Create a color palette for the studies
  const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];

  // Group the data by study and create histogram series
  const series = uniqueStudies.map((study, index) => {
    const filteredData = data.fileSize.filter((_, i) => data.study[i] === study);
    return {
      name: study,
      type: 'bar',
      data: filteredData,
      barWidth: '10%',
      itemStyle: {
        color: colors[index % colors.length], // Cycle through the color palette
      },
    };
  });

  // Define ECharts option configuration
  const option = {
    title: {
      text: 'File Size Distribution by Study',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow', // Shadow to highlight bar distribution
      },
    },
    legend: {
      top: '10%',
      left: 'center',
    },
    xAxis: {
      type: 'category',
      name: 'File Size (MB)',
      nameLocation: 'middle',
      nameGap: 30,
      splitLine: {
        show: false,
      },
      axisLabel: {
        rotate: 30, // Rotate labels for better readability
      },
    },
    yAxis: {
      type: 'value',
      name: 'Count',
      nameLocation: 'middle',
      nameGap: 50,
      splitLine: {
        lineStyle: {
          type: 'dashed', // Dashed grid lines
        },
      },
    },
    series: series,
    grid: {
      containLabel: true,
      bottom: '20%',
    },
  };

  return <ReactECharts option={option} style={{ height: 400 }} />;
};