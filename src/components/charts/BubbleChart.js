import Plot from 'react-plotly.js';
import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';


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

