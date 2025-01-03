import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';

export const renderSunburstChart = (summaryData, summaryDataValues) => {
    const uniqueDatatypes = Array.from(new Set(summaryData.datatype));
    const uniqueStudies = Array.from(new Set(summaryData.study));

    const datatypeColors = ['#e8f5e9', '#e3f2fd', '#ede7f6', '#fff3e0', '#f3e5f5'];
    const studyColors = ['#c8e6c9', '#bbdefb', '#d1c4e9', '#ffe0b2', '#f8bbd0'];

    const datatypeColorMap = uniqueDatatypes.reduce((acc, datatype, index) => {
      acc[datatype] = datatypeColors[index % datatypeColors.length];
      return acc;
    }, {});

    const studyColorMap = uniqueStudies.reduce((acc, study, index) => {
      acc[study] = studyColors[index % studyColors.length];
      return acc;
    }, {});

    const option = {
      title: {
        text: 'Patient Data Distribution',
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
          type: 'sunburst',
          data: summaryData.datatype.map((datatype, index) => ({
            name: datatype,
            value: parseInt(summaryDataValues[index]),
            itemStyle: {
              color: datatypeColorMap[datatype],
            },
            children: [
              {
                name: summaryData.study[index],
                value: parseInt(summaryDataValues[index]),
                itemStyle: {
                  color: studyColorMap[summaryData.study[index]],
                },
              },
            ],
          })),
          radius: [0, '90%'],
          label: {
            rotate: 'radial',
            color: '#000',
            fontSize: 12,
            formatter: '{b}',
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 2,
          },
          emphasis: {
            focus: 'ancestor',
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
              borderColor: '#388e3c',
              borderWidth: 3,
            },
            label: {
              fontSize: 14,
              fontWeight: 'bold',
              color: '#1b5e20',
            },
          },
          levels: [
            {
              itemStyle: {
                color: '#e8f5e9',
              },
              label: {
                fontSize: 14,
                color: '#388e3c',
              },
            },
            {
              itemStyle: {
                color: '#e3f2fd',
              },
              label: {
                fontSize: 12,
                color: '#1976d2',
              },
            },
            {
              itemStyle: {
                color: '#ede7f6',
              },
              label: {
                fontSize: 10,
                color: '#673ab7',
              },
            },
          ],
        },
      ],
    };

    return (
      <ReactECharts option={option} style={{ height: '400px', marginTop: '16px' }} />
    );
  };
