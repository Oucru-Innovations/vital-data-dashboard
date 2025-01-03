import React from 'react';
import ReactECharts from 'echarts-for-react';

export const GradientStackedAreaChart = ({ data }) => {
  // Prepare unique file types and dates
  const uniqueFileTypes = Array.from(new Set(data.fileType));
  const uniqueDates = Array.from(new Set(data.date)).sort();

  // Transform data into a stacked area series format
  const series = uniqueFileTypes.map((fileType, index) => {
    const fileSizesByDate = uniqueDates.map((date) =>
      data.fileSize
        .filter((_, i) => data.date[i] === date && data.fileType[i] === fileType)
        .reduce((a, b) => a + b, 0) // Sum file sizes for this fileType on this date
    );
    return {
      name: fileType,
      type: 'line',
      stack: 'Total',
      smooth: true,
      lineStyle: {
        width: 0,
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: `rgba(${index * 50 + 100}, 100, 255, 1)` }, // Strong bold top color
            { offset: 1, color: `rgba(${index * 50 + 100}, 50, 200, 0.6)` }, // Slightly faded bottom color
          ],
        },
      },
      emphasis: {
        focus: 'series',
      },
      data: fileSizesByDate,
    };
  });

  // Chart configuration
  const option = {
    title: {
      text: 'Gradient Stacked Area Chart: File Size Over Time',
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985',
        },
      },
      formatter: (params) =>
        params
          .map(
            (p) =>
              `${p.marker} ${p.seriesName}: ${p.value} MB`
          )
          .join('<br/>'),
    },
    legend: {
      top: '10%',
      left: 'center',
      textStyle: {
        color: '#666',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: uniqueDates,
      name: 'Date',
      nameLocation: 'middle',
      nameGap: 25,
      axisLine: {
        lineStyle: {
          color: '#aaa',
        },
      },
      axisLabel: {
        color: '#555',
      },
    },
    yAxis: {
      type: 'value',
      name: 'File Size (MB)',
      nameLocation: 'middle',
      nameGap: 35,
      axisLine: {
        lineStyle: {
          color: '#aaa',
        },
      },
      axisLabel: {
        color: '#555',
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#ddd',
        },
      },
    },
    series: series,
  };

  return <ReactECharts option={option} style={{ height: 400 }} />;
};
