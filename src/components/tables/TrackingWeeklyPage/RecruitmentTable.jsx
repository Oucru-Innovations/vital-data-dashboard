import React from 'react';
import { DataGrid, useGridApiRef } from '@mui/x-data-grid';
import { Box, Typography, Paper } from '@mui/material';
import { getCurrentWeek } from '../../../pages/Tracking/utils/recruitmentProcessing';

const RecruitmentTable = ({ data, endDate }) => {
  const apiRef = useGridApiRef();
  // const currentWeek = getCurrentWeek();
  console.log('data', data)
  const columns = [
    {
      field: 'study',
      headerName: 'Study',
      width: 150,
    },
    {
      field: 'date',
      headerName: 'Week',
      width: 120,
    },
    {
      field: 'screened_number',
      headerName: 'Screened',
      width: 120,
      type: 'number',
    },
    {
      field: 'cumulative_screened',
      headerName: 'Total Screened',
      width: 150,
      type: 'number',
    },
    {
      field: 'recruited_number',
      headerName: 'Recruited',
      width: 120,
      type: 'number',
    },
    {
      field: 'cumulative_recruited',
      headerName: 'Total Recruited',
      width: 150,
      type: 'number',
    },
    {
      field: 'percentage',
      headerName: 'Percentage',
      width: 120,
      type: 'number',
      valueGetter: (value) => {
        return `${value}%`;
      }
    },
    {
      field: 'remaining_days',
      headerName: 'Weeks Left',
      width: 150,
      type: 'number',
      valueGetter: (value) => {
        return value//7
      }
    },
  ];

  const rows = data.map((row, index) => ({
    id: index,
    ...row,
    percentage: row.target ? (row.cumulativerecruited/row.target).toPrecision(2)*100 : 0,
  }));

  return (
    <Paper elevation={3}>
      <Typography
        variant="h6"
        gutterBottom
        sx={{
          p: 2,
          borderRadius: '4px 4px 0 0',
          bgcolor: 'background.paper',
        }}
      >
        Recruitment Details (date: - {endDate.toLocaleDateString()})
      </Typography>
      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          apiRef={apiRef}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 5 },
            },
            sorting: {
              sortModel: [{ field: 'study', sort: 'asc' }],
            },
          }}
          pageSizeOptions={[5, 10, 25, { value: -1, label: 'All' }]}
          disableSelectionOnClick
          disableColumnFilter
          disableColumnMenu
          disableColumnSelector
          disableDensitySelector
          sx={{
            '& .MuiDataGrid-root': {
              border: 'none',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid rgba(201, 205, 216, 0.9)',
              backgroundColor: '#f9f9f9',
              whiteSpace: 'normal',
            },
            '& .MuiDataGrid-columnHeaders': {
              borderBottom: '1px solid rgba(201, 205, 216, 0.9)',
              backgroundColor: '#f9f9f9',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid rgba(201, 205, 216, 0.9)',
              backgroundColor: '#f9f9f9',
            },
          }}
        />
      </Box>
    </Paper>
  );
};

export default RecruitmentTable; 