import React from 'react';
import ReactECharts from 'echarts-for-react';
import { format, parse } from 'date-fns';

import { Box } from '@mui/material';

const COLORS = ['#4caf50', '#2196f3', '#9c27b0', '#ff9800', '#f44336'];
export const renderRecruitmentChart = (stages) => {
  const today = new Date(); // This will be our “today” line.
  const chartData = stages
  .filter(study => study.date < today.toISOString() )
  .map(study => ({
    ...study,
    target: study.target || 10 // Set default target or get from API
  }));
  const option = {
    title: {
      text: 'Monthly Recruitment Progress',
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['Monthly Target', 'Monthly Recruitment', 'Cumulative Recruitment'],
      top: 30
    },
    xAxis: {
      type: 'category',
      data: chartData.map(d => d.date),
      axisLabel: {
        rotate: 45,
        formatter: (value) => value.substring(0, 7) // Format to YYYY-MM
      }
    },
    yAxis: [
      {
        type: 'value',
        name: 'Monthly Count',
        position: 'left',
        nameGap: 35,
        splitLine: { show: false },
        axisLabel: {
          padding: [0, 15, 0, 0]  // Add padding to labels
        }
      },
      {
        type: 'value',
        name: 'Cumulative Count',
        position: 'right',
        nameGap: 35,
        splitLine: { show: false },
        axisLabel: {
          padding: [0, 0, 0, 15]  // Add padding to labels
        }
      }
    ],
    series: [
      {
        name: 'Monthly Target',
        type: 'bar',
        data: chartData.map(d => ({
          value: d.target,
          label: {
            // show: true,
            position: 'top'
          }
        })),
        barWidth: '40%',
        itemStyle: {
          color: '#e0e0e0'
        }
      },
      {
        name: 'Monthly Recruitment',
        type: 'line',
        data: chartData.map(d => ({
          value: d.recruitednumber,
          label: {
            show: true,
            position: 'top'
          }
        })),
        lineStyle: {
          width: 3,
          color: '#1976d2'
        }
      },
      {
        name: 'Cumulative Recruitment',
        type: 'line',
        yAxisIndex: 1,
        symbol: 'circle',
        symbolSize: 8,
        data: chartData.map(d => ({
          value: d.cumulativerecruited,
          label: {
            show: true,
            position: 'top'
          }
        })),
        lineStyle: {
          width: 3,
          color: '#4caf50'
        },
        itemStyle: {
          color: '#4caf50'
        }
      },
      // {
      //   // empty line series for the “today” markLine
      //   type: 'line',
      //   data: [],
      //   markLine: {
      //     symbol: 'none',
      //     data: [
      //       {
      //         xAxis: today.getTime(),
      //         label: {
      //           show:true,
      //           formatter: format(today, 'dd/MM/yyyy'),
      //           position: 'end',
      //           color: 'red',
      //           rotate: 360,
      //           // distance: -10,
      //   // align: 'center',
      //           // align: 'left',
      //           // verticalAlign: 'middle',
      //           fontSize: 12,
      //           // padding: [0, 0, 0, 30], // Adds some padding to prevent overlap
      //         }
      //       },
      //     ],
      //     lineStyle: {
      //       color: 'red',
      //       width: 2,
      //       type: 'solid'
      //     },
      //   },
      // },
    ]
  };

  return (
    <Box sx={{ width: '100%', height: 400 }}>
      <ReactECharts option={option} />
    </Box>
  );
};


export const renderStatusChart = (recruitmentData) => {
  const data = [
    { name: 'Active', value: recruitmentData.activePatients },
    { name: 'Completed', value: recruitmentData.completedPatients },
    { name: 'Dropped', value: recruitmentData.droppedPatients },
  ];

  const option = {
    title: {
      text: 'Patient Status Distribution',
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: 'Status',
        type: 'pie',
        radius: '55%',
        center: ['50%', '60%'],
        data: data.map((item, index) => ({
          ...item,
          itemStyle: {
            color: COLORS[index % COLORS.length],
          },
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
    grid: {
      top: 100,    // Increase top margin to accommodate legend
      bottom: 60,  // Add bottom margin for rotated x-axis labels
      left: 80,    // Add left margin for y-axis labels
      right: 80    // Add right margin for second y-axis labels
    },
    legend: {
      data: ['Monthly Target', 'Monthly Recruitment', 'Cumulative Recruitment'],
      top: 50,     // Move legend down from title
      itemGap: 20  // Add space between legend items
    },
    title: {
      top: 20      // Add space above title
    },
  };

  return (
    <Box sx={{ width: '100%', height: 400 }}>
      <ReactECharts option={option} />
    </Box>
  );
};

export const renderTimelineChart = (studies) => {
  const now = new Date().getTime();
  
  const timelineData = studies.map(study => {
    const startDate = new Date(study.startDate).getTime();
    const endDate = new Date(study.endDate).getTime();
    const elapsed = ((now - startDate) / (endDate - startDate)) * 100;
    const remaining = 100 - elapsed;
    return {
      name: study.name,
      elapsed: elapsed,
      remaining: remaining
    };
  });

  const option = {
    title: {
      text: 'Study Timeline Progress',
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params) => {
        const study = timelineData.find(d => d.name === params[0].name);
        return `
          <div>
            <p>${study.name}</p>
            <p>Progress: ${study.elapsed.toFixed(1)}%</p>
          </div>
        `;
      },
    },
    legend: {
      data: ['Progress', 'Remaining'],
      right: '10%',
    },
    xAxis: {
      type: 'category',
      data: timelineData.map(d => d.name),
      axisLabel: {
        rotate: 45,
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Progress (%)',
      min: 0,
      max: 100,
      interval: 20,
    },
    series: [
      {
        name: 'Progress',
        type: 'bar',
        stack: 'total',
        data: timelineData.map(d => d.elapsed),
        itemStyle: {
          color: COLORS[0],
        },
      },
      {
        name: 'Remaining',
        type: 'bar',
        stack: 'total',
        data: timelineData.map(d => d.remaining),
        itemStyle: {
          color: COLORS[1],
        },
      },
    ],
  };

  return (
    <Box sx={{ width: '100%', height: 400 }}>
      <ReactECharts option={option} />
    </Box>
  );
};
