import Plot from 'react-plotly.js';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import ReactECharts from 'echarts-for-react';
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';


export const ViolinChartPlotly = ({ data }) => {
  // Check if data is available
  if (!data || !data.study || !data.fileType || !data.duration) {
    return <div>No data available</div>; // Display fallback if no data is passed
  }

  // Preprocess data to group by study and fileType
  const studyFileTypes = [...new Set(data.study)];
  const fileTypes = [...new Set(data.fileType)];

  // Grouping durations by study and file type
  const durations = studyFileTypes.map((study) => {
    return fileTypes.map((type) => {
      const values = data.duration.filter((_, index) => 
        data.study[index] === study && data.fileType[index] === type
      );
      return { study, type, values }; // Return the grouped data
    });
  }).flat(); // Flatten to get all groups in a single array

  // Prepare traces for the plot
  const traces = durations.map((entry) => ({
    x: Array(entry.values.length).fill(entry.study), // Study
    y: entry.values, // Durations
    name: `${entry.study} (${entry.type})`,
    type: 'violin',
    box: { visible: true },
    meanline: { visible: true },
    marker: { color: entry.type === 'PPG' ? 'blue' : entry.type === 'ECG' ? 'green' : entry.type === 'Accelerometry' ? 'orange' : 'purple' },
  }));

  return (
    <Plot
      data={traces}
      layout={{
        title: 'Duration Distribution by Study and File Type',
        xaxis: { title: 'Study' },
        yaxis: { title: 'Duration (Minutes)' },
        height: 400,
      }}
    />
  );
};

export const ViolinChart = ({ data }) => {
  if (!data || !data.study || !data.fileType || !data.duration) {
    return <div>No data available</div>; // Fallback for missing data
  }

  // Preprocess data to group durations by study and file type
  const studies = [...new Set(data.study)];
  const fileTypes = [...new Set(data.fileType)];
  const seriesData = fileTypes.map((fileType, fileTypeIndex) => {
    const dataForType = studies.map((study) => {
      const durations = data.duration.filter(
        (_, index) => data.study[index] === study && data.fileType[index] === fileType
      );
      return durations; // Group durations for each study and file type
    });

    return {
      name: fileType,
      type: 'boxplot',
      data: dataForType.filter((d) => d.length > 0), // Only include non-empty data
      itemStyle: {
        color: `hsl(${fileTypeIndex * 360 / fileTypes.length}, 70%, 50%)`, // Dynamic colors
      },
    };
  });

  // ECharts configuration
  const option = {
    title: {
      text: 'Duration Distribution by Study and File Type',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        if (params.componentType === 'series') {
          const { seriesName, value } = params;
          const [min, Q1, median, Q3, max] = value;
          return `
            <b>${seriesName}</b><br/>
            Min: ${min}<br/>
            Q1: ${Q1}<br/>
            Median: ${median}<br/>
            Q3: ${Q3}<br/>
            Max: ${max}
          `;
        }
      },
    },
    legend: {
      top: '5%',
      data: fileTypes,
    },
    grid: {
      left: '10%',
      right: '10%',
      bottom: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      name: 'Study',
      data: studies,
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Duration (Minutes)',
    },
    series: seriesData,
  };

  return <ReactECharts option={option} style={{ height: '400px', width: '100%' }} />;
};


