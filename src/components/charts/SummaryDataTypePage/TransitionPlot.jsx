import React, { useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Button, Box } from '@mui/material';

const TransitionPlot = ({ summaryData, summaryDataValues, titleText }) => {
  const chartRef = useRef(null); // Reference to the ECharts instance
  const [isTransitioning, setIsTransitioning] = useState(true); // State to control transition

  const uniqueDatatypes = Array.from(new Set(summaryData?.datatype || []));
  const uniqueStudies = Array.from(new Set(summaryData?.study || []));

  const datatypeColors = ['#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#f44336'];
  const datatypeColorMap = uniqueDatatypes.reduce((acc, datatype, index) => {
    acc[datatype] = datatypeColors[index % datatypeColors.length];
    return acc;
  }, {});

  const data = uniqueDatatypes.map((datatype) => ({
    name: datatype,
    value: summaryDataValues
      ?.map((_, index) => (summaryData?.datatype[index] === datatype ? parseInt(summaryDataValues[index], 10) : 0))
      .reduce((a, b) => a + b, 0) || 0,
    children: summaryData.study
      .map((study, index) => ({
        name: study,
        value: summaryData?.datatype[index] === datatype ? parseInt(summaryDataValues[index], 10) : 0,
        itemStyle: { color: datatypeColorMap[datatype] },
      }))
      .filter((child) => child.value > 0), // Remove entries with value 0
    itemStyle: { color: datatypeColorMap[datatype] },
  }));

  const safeData = data.length > 0 ? data : [{ name: 'No Data', value: 0 }];

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
        id: 'transition-plot',
        animationDurationUpdate: 1000,
        roam: true,
        nodeClick: undefined,
        data: safeData,
        universalTransition: true,
        label: {
          show: true,
          fontSize: 12,
          formatter: '{b}',
        },
        breadcrumb: {
          show: true,
          itemStyle: {
            color: '#f5f5f5',
          },
          textStyle: {
            color: '#333',
          },
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
          gapWidth: 1,
        },
        emphasis: {
          focus: 'descendant',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            borderWidth: 3,
            borderColor: '#ff5722',
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
        id: 'transition-plot',
        radius: ['15%', '85%'],
        animationDurationUpdate: 1000,
        nodeClick: undefined,
        data: safeData,
        universalTransition: true,
        itemStyle: {
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.5)',
        },
        label: {
          show: true,
          rotate: 'radial',
          fontSize: 10,
          formatter: '{b}',
        },
        emphasis: {
          focus: 'ancestor',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            borderWidth: 3,
            borderColor: '#388e3c',
          },
        },
      },
    ],
  };

  useEffect(() => {
    let currentOption = treemapOption;
    let intervalId;

    if (isTransitioning) {
      intervalId = setInterval(() => {
        if (chartRef.current && chartRef.current.getEchartsInstance) {
          const chartInstance = chartRef.current.getEchartsInstance();
          currentOption = currentOption === treemapOption ? sunburstOption : treemapOption;
          chartInstance.setOption(currentOption);
        }
      }, 5000);
    }

    return () => clearInterval(intervalId);
  }, [safeData, isTransitioning]);

  // Render fallback message if data is invalid
  if (!summaryData || !summaryDataValues || safeData.length === 1) {
    return <div>No data available for the transition plot.</div>;
  }

  return (
    <Box>
      <Button
        variant="contained"
        color={isTransitioning ? 'error' : 'primary'}
        onClick={() => setIsTransitioning(!isTransitioning)}
        sx={{ marginBottom: '16px' }}
      >
        {isTransitioning ? 'Stop Transition' : 'Start Transition'}
      </Button>
      <ReactECharts
        ref={chartRef}
        style={{ height: '450px', marginTop: '16px' }}
        option={treemapOption} // Set initial option
      />
    </Box>
  );
};

export default TransitionPlot;
