import React from 'react';
import Plot from 'react-plotly.js';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import ReactECharts from 'echarts-for-react';

const generateSunBurstColor = (baseColor, level, step = 0) => {
    // Parse the base HSL color and adjust lightness
    const hslMatch = baseColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!hslMatch) return baseColor; // Fallback to base color if parsing fails
    const [hue, saturation, lightness] = hslMatch.slice(1).map(Number);

    // Adjust lightness for different levels and steps
    const newLightness = level === 0
      ? lightness // Bold color for parent
      : Math.min(lightness + 30 + step * 5, 90); // Gradually lighter for child nodes

    return `hsl(${hue}, ${saturation}%, ${newLightness}%)`;
};

export const getSunburstData = (mockData) => {
    const root = {
      name: 'All Studies',
      itemStyle: {
        color: generateSunBurstColor('hsl(0, 0%, 50%)', 0), // Central node color (neutral gray)
      },
      children: [],
    };
  
    const studyMap = {};
    const studies = [...new Set(mockData.study)]; // Unique studies
    const fileTypes = [...new Set(mockData.fileType)]; // Unique file types
  
    // Generate base colors for studies
    const studyColors = studies.map((_, studyIndex) => {
      const hue = (studyIndex / studies.length) * 360; // Evenly distribute hues
      return `hsl(${hue}, 70%, 40%)`; // Bold color for studies
    });
  
    // Build hierarchy
    mockData.study.forEach((study, index) => {
      const fileType = mockData.fileType[index];
      const fileCount = mockData.fileCount[index] || 0;
  
      if (!studyMap[study]) {
        const studyIndex = studies.indexOf(study);
        const baseColor = studyColors[studyIndex];
        studyMap[study] = {
          name: study,
          children: fileTypes.map((ft, ftIndex) => ({
            name: ft,
            value: 0,
            itemStyle: {
              color: generateSunBurstColor(baseColor, 1, ftIndex), // Progressive lighter colors
            },
          })),
          itemStyle: {
            color: baseColor, // Bold color for studies
          },
        };
        root.children.push(studyMap[study]);
      }
  
      // Update the file type value for the study
      const fileTypeNode = studyMap[study].children.find((child) => child.name === fileType);
      if (fileTypeNode) {
        fileTypeNode.value += fileCount;
      }
    });
  
    return root;
};
  