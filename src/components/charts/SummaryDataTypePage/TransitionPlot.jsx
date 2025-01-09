import React, { useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Button, Box } from '@mui/material';

const hexToHSL = (hex) => {
  // Convert HEX to RGB
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);
  let h, s, l;

  l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // Achromatic
  } else {
    let delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case r:
        h = (g - b) / delta + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      case b:
        h = (r - g) / delta + 4;
        break;
      default:
        break;
    }
    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return { h, s, l };
};

const generateSunBurstColor = (baseColor, level, step = 0) => {
  const { h, s, l } = hexToHSL(baseColor);

  // Adjust lightness for different levels and steps
  const newLightness = level === 0
    ? l // Bold color for parent
    : Math.min(l + 30 + step * 5, 90); // Gradually lighter for child nodes

  return `hsl(${h}, ${s}%, ${newLightness}%)`;
};

const TransitionPlot = ({ summaryData, summaryDataValues, titleText }) => {
  const chartRef = useRef(null); // Reference to the ECharts instance
  const [isTransitioning, setIsTransitioning] = useState(true); // State to control transition

  const uniqueDatatypes = Array.from(new Set(summaryData?.datatype || []));
  const uniqueStudies = Array.from(new Set(summaryData?.study || []));

  const datatypeColors = ['#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#f44336',
    '#009688', '#795548', '#e91e63', '#607d8b', '#ffc107'];
  const datatypeColorMap = uniqueDatatypes.reduce((acc, datatype, index) => {
    acc[datatype] = datatypeColors[index % datatypeColors.length];
    return acc;
  }, {});

  const dataSunBurst = uniqueDatatypes.map((datatype) => ({
    name: datatype,
    value: summaryDataValues
      ?.map((_, index) => (summaryData?.datatype[index] === datatype ? parseInt(summaryDataValues[index], 10) : 0))
      .reduce((a, b) => a + b, 0) || 0,
    children: summaryData.study
      .map((study, index) => ({
        name: study,
        value: summaryData?.datatype[index] === datatype ? parseInt(summaryDataValues[index], 10) : 0,
        // itemStyle: { color: datatypeColorMap[datatype] },
        itemStyle:{
          color: generateSunBurstColor(datatypeColorMap[datatype], 1, index), // Progressive lighter colors
        },
      }))
      .filter((child) => child.value > 0), // Remove entries with value 0
    itemStyle: { color: datatypeColorMap[datatype] },
  }));

  const safeDataSunBurst = dataSunBurst.length > 0 ? dataSunBurst : [{ name: 'No Data', value: 0 }];

  const dataTreeMap = uniqueDatatypes.map((datatype) => ({
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

  const safeDataTreeMap = dataTreeMap.length > 0 ? dataTreeMap : [{ name: 'No Data', value: 0 }];

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
        data: safeDataTreeMap,
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
        data: safeDataSunBurst,
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
  }, [safeDataTreeMap, isTransitioning]);

  // Render fallback message if data is invalid
  if (!summaryData || !summaryDataValues || safeDataTreeMap.length === 1) {
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
