import Plot from 'react-plotly.js';
import ReactECharts from 'echarts-for-react';
import React, { useEffect, useRef } from 'react';


export const LineChartWithMarkersPlotly = ({ data }) => {
  // Helper function to preprocess detail data for the line chart
  const preprocessLineChartData = (detailData) => {
    // Initialize a map to store cumulative counts for each study
    const cumulativeCounts = {};
    const uniqueDates = [...new Set(detailData.date)].sort(); // Unique sorted dates
    const uniqueStudies = [...new Set(detailData.study)]; // Unique studies

    uniqueStudies.forEach((study) => {
      cumulativeCounts[study] = Array(uniqueDates.length).fill(0);
    });

    // Populate cumulative counts
    detailData.date.forEach((date, index) => {
      const study = detailData.study[index];
      const fileCount = 1; // Each file represents one count
      const dateIndex = uniqueDates.indexOf(date);
      cumulativeCounts[study][dateIndex] += fileCount;
    });

    // Compute cumulative sums
    uniqueStudies.forEach((study) => {
      for (let i = 1; i < cumulativeCounts[study].length; i++) {
        cumulativeCounts[study][i] += cumulativeCounts[study][i - 1];
      }
    });

    return { cumulativeCounts, uniqueDates, uniqueStudies };
  };
  // Preprocess data for the line chart
  const { cumulativeCounts, uniqueDates, uniqueStudies } = preprocessLineChartData(data);

  // Prepare traces for the chart
  const traces = uniqueStudies.map((study) => ({
    x: uniqueDates,
    y: cumulativeCounts[study],
    mode: 'lines+markers',
    name: study,
  }));

  return (
    <Plot
      data={traces}
      layout={{
        title: 'Cumulative File Counts Over Time',
        xaxis: { title: 'Date', tickformat: '%Y-%m-%d' },
        yaxis: { title: 'Cumulative File Count' },
        height: 400,
      }}
    />
  );
};

export const LineChartWithMarkers = ({ data }) => {
  // Helper function to preprocess detail data for the line chart
  const preprocessLineChartData = (detailData) => {
    // Initialize a map to store cumulative counts for each study
    const cumulativeCounts = {};
    const uniqueDates = [...new Set(detailData.date)].sort(); // Unique sorted dates
    const uniqueStudies = [...new Set(detailData.study)]; // Unique studies

    uniqueStudies.forEach((study) => {
      cumulativeCounts[study] = Array(uniqueDates.length).fill(0);
    });

    // Populate cumulative counts
    detailData.date.forEach((date, index) => {
      const study = detailData.study[index];
      const fileSize = detailData.fileSize[index]; // Use fileSize for cumulative size
      const dateIndex = uniqueDates.indexOf(date);
      cumulativeCounts[study][dateIndex] += fileSize;
    });

    // Compute cumulative sums
    uniqueStudies.forEach((study) => {
      for (let i = 1; i < cumulativeCounts[study].length; i++) {
        cumulativeCounts[study][i] += cumulativeCounts[study][i - 1];
      }
    });

    return { cumulativeCounts, uniqueDates, uniqueStudies };
  };

  // Preprocess data for the line chart
  const { cumulativeCounts, uniqueDates, uniqueStudies } = preprocessLineChartData(data);

  // Prepare series data for ECharts
  const seriesData = uniqueStudies.map((study) => ({
    name: study,
    type: 'line',
    data: cumulativeCounts[study].map((value, index) => ({
      value: [uniqueDates[index], value],
    })),
    symbol: 'circle',
    symbolSize: 8,
    lineStyle: {
      width: 2,
    },
    emphasis: {
      focus: 'series',
    },
  }));

  // ECharts configuration
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      backgroundColor: '#fff',
      borderColor: '#ccc',
      borderWidth: 1,
      textStyle: {
        color: '#333',
      },
      formatter: (params) => {
        const tooltipData = params.map(
          (p) => `<b>${p.seriesName}</b>: ${p.data[1]} MB on ${p.data[0]}`
        );
        return tooltipData.join('<br>');
      },
    },
    legend: {
      top: '5%',
      data: uniqueStudies,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      name: 'Date',
      data: uniqueDates,
      axisLabel: {
        rotate: 45, // Rotate for better readability
        formatter: (value) => value, // Optional: Format dates if needed
      },
    },
    yAxis: {
      type: 'value',
      name: 'Cumulative File Size (MB)',
      axisLabel: {
        formatter: '{value} MB',
      },
    },
    series: seriesData,
    color: [
      '#636EFA',
      '#EF553B',
      '#00CC96',
      '#AB63A1',
      '#FFA15A',
      '#19D3F3',
      '#FF6692',
      '#B6E880',
      '#FF97FF',
      '#FECB52',
    ], // Color palette
  };

  return <ReactECharts option={option} style={{ height: '400px', width: '100%' }} />;
};
