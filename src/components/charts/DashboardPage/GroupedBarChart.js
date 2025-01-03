import Plot from 'react-plotly.js';
import ReactECharts from 'echarts-for-react';
import React from 'react';

export const GroupedBarChartPlotly = ({ data }) => {
  // Extract unique studies and file types
  const uniqueStudies = [...new Set(data.study)];
  const uniqueFileTypes = [...new Set(data.fileType)];

  // Create a trace for each file type (PPG, ECG, etc.)
  const traces = uniqueFileTypes.map((type) => {
    // Get the count of files per study for the current file type
    const fileCounts = uniqueStudies.map((study) => {
      return data.fileType
        .map((fileType, index) => (fileType === type && data.study[index] === study ? data.fileSize[index] : 0))
        .reduce((acc, curr) => acc + curr, 0);
    });

    return {
      x: uniqueStudies, // X-axis is the studies
      y: fileCounts, // Y-axis is the sum of file sizes for this type and each study
      name: type, // File type name (PPG, ECG, etc.)
      type: 'bar', // Bar chart
    };
  });

  return (
    <Plot
      data={traces}
      layout={{
        barmode: 'group', // Grouped bars
        title: 'Daily File Counts by File Type',
        xaxis: { title: 'Study' },
        yaxis: { title: 'Total File Size (MB)' }, // Changed to file size, adjust accordingly
        height: 400,
      }}
    />
  );
};

export const GroupedBarChart = ({ data }) => {
  // Extract unique studies and file types
  const uniqueStudies = [...new Set(data.study)];
  const uniqueFileTypes = [...new Set(data.fileType)];

  // Prepare series data for each file type
  const seriesData = uniqueFileTypes.map((type) => {
    const fileCounts = uniqueStudies.map((study) => {
      return data.study
        .map((studyName, index) => (studyName === study && data.fileType[index] === type ? 1 : 0))
        .reduce((acc, curr) => acc + curr, 0);
    });

    return {
      name: type,
      type: 'bar',
      data: fileCounts,
      emphasis: {
        focus: 'series',
      },
    };
  });

  // Chart options
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {
      data: uniqueFileTypes,
      top: '5%',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: uniqueStudies,
      name: 'Study',
      axisLabel: {
        rotate: 45, // Rotate labels for better readability if necessary
      },
    },
    yAxis: {
      type: 'value',
      name: 'File Count',
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
    ], // Color palette for file types
  };

  return <ReactECharts option={option} style={{ height: '400px', width: '100%' }} />;
};

