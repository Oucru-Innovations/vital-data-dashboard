import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderGroupedBarChart = (summaryData, summaryDataValues, titleText) => {
  const uniqueDatatypes = Array.from(new Set(summaryData?.datatype || []));
  const uniqueStudies = Array.from(new Set(summaryData?.study || []));

  // const datatypeColors = ['#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#f44336'];
  const datatypeColors = ['#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#f44336',
    '#009688', '#795548', '#e91e63', '#607d8b', '#ffc107'];
  const datatypeColorMap = uniqueDatatypes.reduce((acc, datatype, index) => {
    acc[datatype] = datatypeColors[index % datatypeColors.length];
    return acc;
  }, {});

  // Aggregate data for total duration of each datatype per study
  const aggregatedData = uniqueDatatypes.map((datatype) => {
    return {
      datatype,
      data: uniqueStudies.map((study) => {
        const totalDuration = summaryData.study.reduce((sum, currentStudy, index) => {
          if (currentStudy === study && summaryData.datatype[index] === datatype) {
            return sum + (parseFloat(summaryDataValues[index]) || 0);
          }
          return sum;
        }, 0);
        return totalDuration;
      }),
    };
  }).filter((entry) => 
    entry.data.some((value) => value > 0)
  );

  // Filter out studies with all zero values across datatypes
  const validStudies = uniqueStudies.filter((study, studyIndex) =>
    aggregatedData.some((entry) => entry.data[studyIndex] > 0)
  );
  // Filter data for valid studies only
  const filteredAggregatedData = aggregatedData.map((entry) => ({
    ...entry,
    data: entry.data.filter((_, studyIndex) =>
      validStudies.includes(uniqueStudies[studyIndex])
    ),
  }));

  const series = filteredAggregatedData.map((entry) => ({
    name: entry.datatype,
    type: 'bar',
    barGap: 0,
    emphasis: {
      focus: 'series',
    },
    data: entry.data,
    itemStyle: { color: datatypeColorMap[entry.datatype] },
  }));

  const option = {
    title: {
      text: titleText,
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      bottom: 0,
      data: uniqueDatatypes,
      textStyle: {
        fontSize: 12,
        color: '#666',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: validStudies,
      name: 'Study',
      axisLabel: {
        fontSize: 12,
        color: '#666',
        rotate: 30,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Total Duration',
      axisLabel: {
        fontSize: 12,
        color: '#666',
      },
    },
    series: series,
  };

  return <ReactECharts option={option} style={{ height: '400px', marginTop: '16px' }} />;
};
