import React from 'react';
import Plot from 'react-plotly.js';

export const SunburstChart = ({ data }) => {
  return (
    <Plot
      data={[
        {
          type: 'sunburst',
          labels: data.labels,
          parents: data.parents,
          values: data.values,
          hoverinfo: 'label+value+percent entry',
        },
      ]}
      layout={{
        margin: { t: 0, l: 0, r: 0, b: 0 },
        height: 400,
        width: '100%',
      }}
    />
  );
};

export const HeatmapChart = ({ data }) => {
  return (
    <Plot
      data={[
        {
          z: data.z,
          x: data.x,
          y: data.y,
          type: 'heatmap',
          colorscale: 'Viridis',
          hoverongaps: false,
        },
      ]}
      layout={{
        margin: { t: 20, l: 100, r: 20, b: 50 },
        height: 400,
        xaxis: { title: 'File Types' },
        yaxis: { title: 'Studies' },
      }}
    />
  );
};

export const BubbleChart = ({ data }) => (
  <Plot
    data={[
      {
        x: data.studies,
        y: data.fileSizes,
        text: data.fileTypes,
        mode: 'markers',
        marker: {
          size: data.fileCounts,
          color: data.fileTypes.map((type) =>
            type === 'PPG' ? 'blue' : type === 'ECG' ? 'green' : 'orange'
          ),
          opacity: 0.8,
        },
      },
    ]}
    layout={{
      title: 'File Count and Type Analysis',
      xaxis: { title: 'Studies' },
      yaxis: { title: 'File Sizes (MB)' },
      showlegend: false,
      height: 400,
    }}
  />
);

export const StackedBarChart = ({ data }) => {
  const traces = data.values.map((entry) => ({
    x: data.x, // Dates
    y: entry.count, // Counts
    name: `${entry.study} (${entry.type})`, // Legend
    type: 'bar',
    marker: { color: entry.type === 'PPG' ? 'blue' : entry.type === 'ECG' ? 'green' : 'orange' },
  }));

  return (
    <Plot
      data={traces}
      layout={{
        barmode: 'stack',
        title: 'Collected Files by Day',
        xaxis: { title: 'Date' },
        yaxis: { title: 'Number of Files' },
        height: 400,
      }}
    />
  );
};

export const ViolinPlot = ({ data }) => {
  const traces = data.durations.map((entry) => ({
    x: Array(entry.values.length).fill(entry.study), // Study
    y: entry.values, // Durations
    name: `${entry.study} (${entry.type})`,
    type: 'violin',
    box: { visible: true },
    meanline: { visible: true },
    marker: { color: entry.type === 'PPG' ? 'blue' : entry.type === 'ECG' ? 'green' : 'orange' },
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

export const GroupedBarChart = ({ data }) => {
  const traces = data.fileTypes.map((type) => ({
    x: data.dates, // Dates
    y: data.fileCounts[type], // File counts for this type
    name: type,
    type: 'bar',
  }));

  return (
    <Plot
      data={traces}
      layout={{
        barmode: 'group',
        title: 'Daily File Counts by File Type',
        xaxis: { title: 'Date' },
        yaxis: { title: 'Number of Files' },
        height: 400,
      }}
    />
  );
};

export const LineChartWithMarkers = ({ data }) => {
  const traces = data.studies.map((study) => ({
    x: data.dates, // Dates
    y: data.cumulativeCounts[study], // Cumulative counts for this study
    mode: 'lines+markers',
    name: study,
  }));

  return (
    <Plot
      data={traces}
      layout={{
        title: 'Cumulative File Counts Over Time',
        xaxis: { title: 'Date' },
        yaxis: { title: 'Cumulative File Count' },
        height: 400,
      }}
    />
  );
};

export const TreemapChart = ({ data }) => {
  return (
    <Plot
      data={[
        {
          type: 'treemap',
          labels: data.labels, // Combined labels for studies and file types
          parents: data.parents, // Parent-child relationship for hierarchy
          values: data.values, // File counts
          textinfo: 'label+value+percent entry', // Display label, count, and percentage
          hoverinfo: 'label+value+percent entry', // Hover info
          marker: { colors: data.colors }, // Colors for each segment
        },
      ]}
      layout={{
        title: 'File Distribution by Study and File Type',
        height: 400,
      }}
    />
  );
};

export const HistogramChart = ({ data }) => {
  // Generate unique studies and corresponding data
  const uniqueStudies = [...new Set(data.studies)];
  const traces = uniqueStudies.map((study) => ({
    x: data.fileSizes.filter((_, index) => data.studies[index] === study),
    name: study,
    type: 'histogram',
    opacity: 0.7,
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

export const ScatterPlotChart = ({ data }) => {
  const uniqueStudies = [...new Set(data.studies)];
  const traces = uniqueStudies.map((study) => ({
    x: data.dates.filter((_, index) => data.studies[index] === study),
    y: data.fileSizes.filter((_, index) => data.studies[index] === study),
    mode: 'markers',
    name: study,
    marker: {
      size: 10,
      opacity: 0.8,
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
      }}
    />
  );
};