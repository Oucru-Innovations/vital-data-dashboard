import Plot from 'react-plotly.js';
import ReactECharts from 'echarts-for-react';
import React from 'react';

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

const getSunburstData = (mockData) => {
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


export const SunburstChartPlotly = ({ data }) => {
  // Create sunburst data from mock data (summary or detail)
  const getSunburstData = (mockData) => {
    const labels = ['All Studies'];  // Root label
    const parents = [''];  // Root has no parent
    const values = [0];  // Root has no value yet

    const studyMap = {};
    const fileTypes = ['PPG', 'ECG', 'Accelerometry', 'Ultrasound'];  // All file types

    // Process summary data to aggregate file count or file size
    mockData.study.forEach((study, index) => {
      const fileType = mockData.fileType[index];
      const fileCount = mockData.fileCount ? mockData.fileCount[index] : mockData.fileSize[index];

      // Initialize study entry if not already created
      if (!studyMap[study]) {
        studyMap[study] = {
          files: {},
          totalCount: 0,
        };

        // Initialize file types with zero values for each study
        fileTypes.forEach((ft) => {
          studyMap[study].files[ft] = 0; // Default value 0
        });
      }

      // Update file type count for the current study
      studyMap[study].files[fileType] += fileCount;
      studyMap[study].totalCount += fileCount;  // Aggregate total count for the study
    });

    // Now, build the hierarchical structure for the sunburst chart
    Object.keys(studyMap).forEach((study) => {
      // Add the study label and its parent (All Studies)
      labels.push(study);
      parents.push('All Studies');
      values.push(studyMap[study].totalCount);  // Use total count or size for the study

      // Add file types as children of the current study
      fileTypes.forEach((fileType) => {
        labels.push(fileType);
        parents.push(study);
        values.push(studyMap[study].files[fileType]);  // File count or size for each file type
      });
    });

    return { labels, parents, values };
  };

  // Get sunburst data from the mock data
  const sunburstData = getSunburstData(data);

  return (
    <Plot
      data={[
        {
          type: 'sunburst',
          labels: sunburstData.labels,
          parents: sunburstData.parents,
          values: sunburstData.values,
          hoverinfo: 'label+value+percent entry',
          // branchvalues: 'total', // This will make sure the values are properly calculated for each branch
        },
      ]}
      layout={{
        margin: { t: 0, l: 0, r: 0, b: 0 },
        height: 400,
        width: '100%',
        sunburstcolorway: ['#636EFA', '#EF553B', '#00CC96', '#AB63A1'], // Color scheme for the branches
        showlegend: false, // Hide legend if not needed
        maxdepth: 3, // Display all sub-levels
        extendsunburstcolorway: true,
      }}
    />
  );
};

export const SunburstChart = ({ data }) => {
  const sunburstData = getSunburstData(data);

  const options = {
    title: {
      text: 'Data Collection Overview',
      left: 'center',
      textStyle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const { name, value } = params.data || {};
        // Special case for the root node ("All Studies")
        if (name === 'All Studies') {
          const totalValue = params.data.children?.reduce((sum, child) => sum + (child.value || 0), 0) || 0;
          return `<b>${name}</b>: ${totalValue} files in total`;
        }
        // Default behavior for studies and file types
        return `<b>${name}</b>: ${value || 0} files`;
      },
      backgroundColor: '#fff',
      borderColor: '#ccc',
      borderWidth: 1,
      textStyle: {
        color: '#333',
      },
    },
    series: {
      type: 'sunburst',
      data: [sunburstData],
      radius: ['10%', '90%'],
      // sort: undefined,
      emphasis: {
        focus: 'ancestor'
      },
      levels: [
        {},
        {
          r0: '10%',
          r: '25%',
          itemStyle: {
            borderWidth: 2
          },
          label: {
            rotate: 'tangential'
          }
        },
        {
          r0: '25%',
          r: '50%',
          label: {
            align: 'right'
          }
        },
        {
          r0: '50%',
          r: '90%',
          label: {
            // position: 'outside',
            padding: 3,
            silent: false
          },
          itemStyle: {
            borderWidth: 3
          }
        }
      ]
    }
  };

  return <ReactECharts option={options} style={{ height: '450px', width: '100%' }} />;
};
