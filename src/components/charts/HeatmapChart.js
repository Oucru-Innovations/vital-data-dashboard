
import Plot from 'react-plotly.js';
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';


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
  