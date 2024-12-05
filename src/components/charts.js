import Plot from 'react-plotly.js';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import ReactECharts from 'echarts-for-react';
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { getSunburstData } from './chartUtils';

export const SunburstChartPlotly = ({ data }) => {
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

export const SunburstChart = ({ data }) => {
  const sunburstData = getSunburstData(data);

  const options = {
    title: {
      text: 'Data Collection Overview',
      left: 'center',
      textStyle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const { name, value } = params.data || {};
        // Special case for the root node ("All Studies")
        if (name === 'All Studies') {
          const totalValue = params.data.children?.reduce((sum, child) => sum + (child.value || 0), 0) || 0;
          return `<b>${name}</b>: ${totalValue} files in total`;
        }
        // Default behavior for studies and file types
        return `<b>${name}</b>: ${value || 0} files`;
      },
      backgroundColor: '#fff',
      borderColor: '#ccc',
      borderWidth: 1,
      textStyle: {
        color: '#333',
      },
    },
    series: {
      type: 'sunburst',
      data: [sunburstData],
      radius: ['10%', '90%'],
      // sort: undefined,
      emphasis: {
        focus: 'ancestor'
      },
      levels: [
        {},
        {
          r0: '10%',
          r: '25%',
          itemStyle: {
            borderWidth: 2
          },
          label: {
            rotate: 'tangential'
          }
        },
        {
          r0: '25%',
          r: '50%',
          label: {
            align: 'right'
          }
        },
        {
          r0: '50%',
          r: '90%',
          label: {
            // position: 'outside',
            padding: 3,
            silent: false
          },
          itemStyle: {
            borderWidth: 3
          }
        }
      ]
    }
  };

  return <ReactECharts option={options} style={{ height: '450px', width: '100%' }} />;
};

export const HeatmapChartPlotly = ({ data }) => {
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

export const HeatmapChart = ({ data }) => {
  const chartRef = useRef(null);

  const getHeatmapData = (summaryData) => {
    const fileTypesSet = new Set(summaryData.fileType);
    const studiesSet = new Set(summaryData.study);

    const x = Array.from(fileTypesSet); // File types as x-axis
    const y = Array.from(studiesSet); // Studies as y-axis

    const z = y.map(() => x.map(() => 0));

    const fileTypeIndexMap = {};
    x.forEach((fileType, index) => {
      fileTypeIndexMap[fileType] = index;
    });

    const studyIndexMap = {};
    y.forEach((study, index) => {
      studyIndexMap[study] = index;
    });

    for (let i = 0; i < summaryData.study.length; i++) {
      const study = summaryData.study[i];
      const fileType = summaryData.fileType[i];
      const fileCount = summaryData.totalSize[i];

      const rowIndex = studyIndexMap[study];
      const colIndex = fileTypeIndexMap[fileType];

      z[rowIndex][colIndex] = fileCount;
    }

    return { x, y, z };
  };

  useEffect(() => {
    const heatmapData = getHeatmapData(data);

    // Calculate dynamic range for visualMap
    const flatValues = heatmapData.z.flat();
    const minValue = Math.min(...flatValues);
    const maxValue = Math.max(...flatValues);
    const adjustedMin = Math.max(0, minValue - minValue * 0.2); // 10% below min
    const adjustedMax = maxValue + maxValue * 0.2; // 10% above max

    const chartInstance = echarts.init(chartRef.current);

    chartInstance.setOption({
      tooltip: {
        position: 'top',
        formatter: (params) => {
          const { data, name, seriesName } = params;
          return `<b>Study:</b> ${name}<br/><b>File Type:</b> ${seriesName}<br/><b>Total Minutes:</b> ${data[2]}`;
        },
      },
      xAxis: {
        type: 'category',
        data: heatmapData.x,
        name: 'File Types',
        nameLocation: 'center',
        nameTextStyle: { fontWeight: 'bold' },
        nameGap: 25,
        axisLabel: { rotate: 45 },
      },
      yAxis: {
        type: 'category',
        data: heatmapData.y,
        name: 'Studies',
        nameLocation: 'center',
        nameTextStyle: { fontWeight: 'bold' },
        nameGap: 40,
      },
      visualMap: {
        min: adjustedMin,
        max: adjustedMax,
        calculable: true,
        orient: 'vertical',
        left: 'right',
        top: 'center',
        inRange: {
          color: [
            '#0d47a1', // Deep Blue (low values)
            '#1976d2', // Vibrant Blue
            '#42a5f5', // Sky Blue
            '#81d4fa', // Light Aqua
            '#c3fdff', // Soft Cyan (middle)
            '#fff176', // Bright Yellow
            '#ffb74d', // Vibrant Orange
            '#e53935', // Bold Red
            '#b71c1c', // Dark Red (high values)
          ],
        },       
      },
      series: [
        {
          type: 'heatmap',
          data: heatmapData.z.flatMap((row, i) =>
            row.map((value, j) => [j, i, value])
          ),
          name: 'File Type',
          label: {
            show: true,
            formatter: ({ value }) => (value[2] ? value[2] : ''),
            color: '#333', // Neutral text color
          },
        },
      ],
    });

    return () => chartInstance.dispose();
  }, [data]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
};

export const BubbleChartPlotly = ({ data }) => {
  // Process the summary data to get bubble chart parameters

  const bubbleChartData = data;

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

export const BubbleChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    const bubbleChartData = {
      x: data.studies, // X-axis values (studies)
      y: data.fileSizes, // Y-axis values (file sizes)
      sizes: data.fileCounts, // Bubble sizes (file counts)
      types: data.fileTypes, // Categories (file types)
    };

    // Generate dynamic colors for file types
    const typeColors = {
      PPG: '#3b82f6', // Blue
      ECG: '#10b981', // Green
      Gyro: '#f97316', // Orange
      Ultrasound: '#ef4444', // Red
    };

    const chartInstance = echarts.init(chartRef.current);

    chartInstance.setOption({
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const { name, value } = params;
          return `
            <b>Study:</b> ${name}<br/>
            <b>File Size:</b> ${value[1]} MB<br/>
            <b>File Count:</b> ${value[2]}<br/>
            <b>File Type:</b> ${value[3]}
          `;
        },
      },
      xAxis: {
        type: 'category',
        name: 'Studies',
        data: bubbleChartData.x,
        nameLocation: 'center',
        nameTextStyle: {
          fontWeight: 'bold',
        },
        nameGap: 30,
      },
      yAxis: {
        type: 'value',
        name: 'File Sizes (MB)',
        nameLocation: 'center',
        nameTextStyle: {
          fontWeight: 'bold',
        },
        nameGap: 50,
      },
      series: [
        {
          name: 'File Analysis',
          type: 'scatter',
          symbolSize: (data) => Math.sqrt(data[2]) * 10, // Bubble size scaling
          data: bubbleChartData.x.map((study, index) => [
            study,
            bubbleChartData.y[index], // File size
            bubbleChartData.sizes[index], // File count
            bubbleChartData.types[index], // File type
          ]),
          itemStyle: {
            color: (params) => {
              const type = params.value[3];
              return typeColors[type] || '#999'; // Default to gray for unknown types
            },
            opacity: 0.8,
          },
        },
      ],
    });

    return () => chartInstance.dispose();
  }, [data]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
};


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

export const ViolinPlotPlotly = ({ data }) => {
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

export const ViolinPlot = ({ data }) => {
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