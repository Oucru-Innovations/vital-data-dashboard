import React from 'react';
import Plot from 'react-plotly.js';

export const SunburstChart = ({ data }) => {
  return (
    <Plot
      data={[
        {
          type: 'sunburst',
          labels: data.labels,
          parents: data.parents,
          values: data.values,
          hoverinfo: 'label+value+percent entry',
        },
      ]}
      layout={{
        margin: { t: 0, l: 0, r: 0, b: 0 },
        height: 400,
        width: '100%',
      }}
    />
  );
};

export const HeatmapChart = ({ data }) => {
  return (
    <Plot
      data={[
        {
          z: data.z,
          x: data.x,
          y: data.y,
          type: 'heatmap',
          colorscale: 'Viridis',
          hoverongaps: false,
        },
      ]}
      layout={{
        margin: { t: 20, l: 100, r: 20, b: 50 },
        height: 400,
        xaxis: { title: 'File Types' },
        yaxis: { title: 'Studies' },
      }}
    />
  );
};
