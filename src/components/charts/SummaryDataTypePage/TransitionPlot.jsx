import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';

export const TransitionPlot = ({ summaryData }) => {
  const [chartType, setChartType] = useState('treemap'); // Initial chart type

  // Prepare data for treemap and sunburst
  const data = summaryData.datatype.map((datatype, index) => ({
    name: datatype,
    value: parseInt(summaryData.session[index], 10),
    children: [
      {
        name: summaryData.study[index],
        value: parseInt(summaryData.session[index], 10),
      },
    ],
  }));

  // Base option
  const option = {
    title: {
      text: chartType === 'treemap' ? 'Treemap View' : 'Sunburst View',
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}',
    },
    series: [
      {
        type: chartType,
        data: data,
        radius: chartType === 'sunburst' ? [0, '90%'] : undefined, // Sunburst-specific option
        leafDepth: chartType === 'treemap' ? 1 : undefined, // Treemap-specific option
        label: {
          rotate: chartType === 'sunburst' ? 'radial' : undefined,
          formatter: '{b}',
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
        },
        emphasis: {
          focus: 'ancestor',
        },
      },
    ],
  };

  return (
    <div>
      <button
        onClick={() => setChartType((prev) => (prev === 'treemap' ? 'sunburst' : 'treemap'))}
        style={{
          marginBottom: '16px',
          padding: '8px 16px',
          fontSize: '14px',
          borderRadius: '4px',
          border: 'none',
          cursor: 'pointer',
          backgroundColor: '#1976d2',
          color: '#fff',
        }}
      >
        Toggle to {chartType === 'treemap' ? 'Sunburst' : 'Treemap'}
      </button>
      <ReactECharts option={option} style={{ height: '400px' }} />
    </div>
  );
};

export default TransitionPlot;
