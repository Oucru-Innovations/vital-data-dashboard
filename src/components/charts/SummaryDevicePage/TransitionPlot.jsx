import React, { useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';

const TransitionPlot = ({ summaryData, summaryDataValues, titleText }) => {
  const chartRef = useRef(null); // Reference to the ECharts instance

  const uniqueDevices = Array.from(new Set(summaryData?.device || [])).filter(Boolean);

  const modernColors = [
    '#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9', '#92A8D1',
    '#955251', '#B565A7', '#009B77', '#DD4124', '#D65076',
  ];

  const deviceColorMap = uniqueDevices.reduce((acc, device, index) => {
    acc[device] = modernColors[index % modernColors.length];
    return acc;
  }, {});

  const data = uniqueDevices.map((device) => ({
    name: device,
    value: summaryData.device.reduce(
      (sum, cond, idx) => (cond === device ? sum + parseInt(summaryDataValues[idx], 10) : sum),
      0
    ),
    itemStyle: { color: deviceColorMap[device] },
  }));

  const treemapOption = {
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
        type: 'treemap',
        animationDurationUpdate: 1000,
        data: data,
        universalTransition: true,
        label: {
          show: true,
          fontSize: 12,
          formatter: '{b}',
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
        },
        emphasis: {
          focus: 'descendant',
          itemStyle: {
            borderWidth: 3,
            borderColor: '#ff5722',
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
      },
    ],
  };

  const sunburstOption = {
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
        type: 'sunburst',
        radius: ['20%', '90%'],
        animationDurationUpdate: 1000,
        data: data,
        universalTransition: true,
        label: {
          show: true,
          fontSize: 10,
          rotate: 'radial',
          formatter: '{b}',
        },
        itemStyle: {
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.5)',
        },
        emphasis: {
          focus: 'ancestor',
          itemStyle: {
            borderWidth: 3,
            borderColor: '#388e3c',
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
      },
    ],
  };

  useEffect(() => {
    let currentOption = treemapOption;
    const intervalId = setInterval(() => {
      if (chartRef.current && chartRef.current.getEchartsInstance) {
        const chartInstance = chartRef.current.getEchartsInstance();
        currentOption = currentOption === treemapOption ? sunburstOption : treemapOption;
        chartInstance.setOption(currentOption);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [data]);

  return <ReactECharts ref={chartRef} option={treemapOption} style={{ height: '450px', marginTop: '16px' }} />;
};

export default TransitionPlot;
