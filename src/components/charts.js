import React from 'react';
import Plot from 'react-plotly.js';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';

export const SunburstChart_old = ({ data }) => {
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

export const SunburstChart = ({ data }) => {
  // Create sunburst data from mock data (summary or detail)
  const getSunburstData = (mockData) => {
    const labels = ['All Studies'];  // Root label
    const parents = [''];  // Root has no parent
    const values = [0];  // Root has no value yet

    const studyMap = {};
    const fileTypes = ['PPG', 'ECG', 'Gyro', 'Ultrasound'];  // All file types

    // Process summary data to aggregate file count or file size
    mockData.study.forEach((study, index) => {
      const fileType = mockData.fileType[index];
      const fileCount = mockData.fileCount ? mockData.fileCount[index] : mockData.fileSize[index];

      // Initialize study entry if not already created
      if (!studyMap[study]) {
        studyMap[study] = {
          files: {},
          totalCount: 0,
        };

        // Initialize file types with zero values for each study
        fileTypes.forEach((ft) => {
          studyMap[study].files[ft] = 0; // Default value 0
        });
      }

      // Update file type count for the current study
      studyMap[study].files[fileType] += fileCount;
      studyMap[study].totalCount += fileCount;  // Aggregate total count for the study
    });

    // Now, build the hierarchical structure for the sunburst chart
    Object.keys(studyMap).forEach((study) => {
      // Add the study label and its parent (All Studies)
      labels.push(study);
      parents.push('All Studies');
      values.push(studyMap[study].totalCount);  // Use total count or size for the study

      // Add file types as children of the current study
      fileTypes.forEach((fileType) => {
        labels.push(fileType);
        parents.push(study);
        values.push(studyMap[study].files[fileType]);  // File count or size for each file type
      });
    });

    return { labels, parents, values };
  };

  // Get sunburst data from the mock data
  const sunburstData = getSunburstData(data);

  return (
    <Plot
      data={[
        {
          type: 'sunburst',
          labels: sunburstData.labels,
          parents: sunburstData.parents,
          values: sunburstData.values,
          hoverinfo: 'label+value+percent entry',
          // branchvalues: 'total', // This will make sure the values are properly calculated for each branch
        },
      ]}
      layout={{
        margin: { t: 0, l: 0, r: 0, b: 0 },
        height: 400,
        width: '100%',
        sunburstcolorway: ['#636EFA', '#EF553B', '#00CC96', '#AB63A1'], // Color scheme for the branches
        showlegend: false, // Hide legend if not needed
        maxdepth: 3, // Display all sub-levels
        extendsunburstcolorway: true,
      }}
    />
  );
};


export const HeatmapChart_old = ({ data }) => {
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

export const HeatmapChart = ({ data }) => {
  // Process the summary data to get x, y, z
  const getHeatmapData = (summaryData) => {
    // Extract unique file types and studies
    const fileTypesSet = new Set(summaryData.fileType);
    const studiesSet = new Set(summaryData.study);

    const x = Array.from(fileTypesSet);
    const y = Array.from(studiesSet);

    // Initialize z matrix with zeros
    const z = y.map(() => x.map(() => 0));

    // Create a mapping for quick lookup
    const fileTypeIndexMap = {};
    x.forEach((fileType, index) => {
      fileTypeIndexMap[fileType] = index;
    });

    const studyIndexMap = {};
    y.forEach((study, index) => {
      studyIndexMap[study] = index;
    });

    // Populate the z matrix with file counts
    for (let i = 0; i < summaryData.study.length; i++) {
      const study = summaryData.study[i];
      const fileType = summaryData.fileType[i];
      const fileCount = summaryData.fileCount[i];

      const rowIndex = studyIndexMap[study];
      const colIndex = fileTypeIndexMap[fileType];

      z[rowIndex][colIndex] = fileCount;
    }

    return { x, y, z };
  };

  // Get the heatmap data from the summary data
  const heatmapData = getHeatmapData(data);

  return (
    <Plot
      data={[
        {
          z: heatmapData.z,
          x: heatmapData.x,
          y: heatmapData.y,
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


export const BubbleChart_old = ({ data }) => (
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

export const BubbleChart = ({ data }) => {
  // Process the summary data to get bubble chart parameters
  const getBubbleChartData = (summaryData) => {
    const studies = summaryData.study;
    const fileTypes = summaryData.fileType;
    const fileSizes = summaryData.totalSize;
    const fileCounts = summaryData.fileCount;

    return { studies, fileTypes, fileSizes, fileCounts };
  };

  // Get the processed bubble chart data
  const bubbleChartData = getBubbleChartData(data);

  return (
    <Plot
      data={[
        {
          x: bubbleChartData.studies,
          y: bubbleChartData.fileSizes,
          text: bubbleChartData.fileTypes,
          mode: 'markers',
          marker: {
            size: bubbleChartData.fileCounts,
            color: bubbleChartData.fileTypes.map((type) =>
              type === 'PPG' ? 'blue' : type === 'ECG' ? 'green' : type === 'Gyro' ? 'orange' : 'red'
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
};

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

export const ViolinPlot_old = ({ data }) => {
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

export const ViolinPlot = ({ data }) => {
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
    marker: { color: entry.type === 'PPG' ? 'blue' : entry.type === 'ECG' ? 'green' : entry.type === 'Gyro' ? 'orange' : 'purple' },
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




export const GroupedBarChart_old = ({ data }) => {
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

export const GroupedBarChart = ({ data }) => {
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

export const HistogramChart_old = ({ data }) => {
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

export const HistogramChart = ({ data }) => {
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


export const ScatterPlotChart_old = ({ data }) => {
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

export const ScatterPlotChart = ({ data }) => {
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