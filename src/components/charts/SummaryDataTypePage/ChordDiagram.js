import React from 'react';
import ReactECharts from 'echarts-for-react';

export const renderChordDiagram = (summaryData, summaryDataValues, titleText) => {
  const uniqueStudies = Array.from(new Set(summaryData.study));
  const uniqueDatatypes = Array.from(new Set(summaryData.datatype));

  // Generate matrix data for relationships
  const matrix = uniqueStudies.map((study) =>
    uniqueDatatypes.map((datatype) => {
      let total = 0;
      summaryData.study.forEach((s, index) => {
        if (s === study && summaryData.datatype[index] === datatype) {
          total += parseInt(summaryDataValues[index], 10);
        }
      });
      return total;
    })
  );

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
      trigger: 'item',
      formatter: '{b}: {c}',
    },
    series: [
      {
        type: 'chord',
        data: [
          ...uniqueStudies.map((study) => ({ name: study })),
          ...uniqueDatatypes.map((datatype) => ({ name: datatype })),
        ],
        matrix: matrix,
        ribbonType: true,
        itemStyle: {
          borderWidth: 1,
          borderColor: '#aaa',
        },
        lineStyle: {
          width: 1,
          opacity: 0.8,
        },
        label: {
          show: true,
          fontSize: 12,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '400px', marginTop: '16px' }} />;
};
