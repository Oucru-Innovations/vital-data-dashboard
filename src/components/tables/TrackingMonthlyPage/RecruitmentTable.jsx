import React from 'react';
import { DataGrid, useGridApiRef } from '@mui/x-data-grid';
import { Box, Typography, Paper } from '@mui/material';

const RecruitmentTable = ({ data, endDate }) => {
  const apiRef = useGridApiRef();
  // const currentMonth = new Date().toLocaleString('default', { month: 'long' });

  const columns = [
    {
      field: 'study',
      headerName: 'Study',
      width: 150,
    },
    {
      field: 'date',
      headerName: 'Month',
      width: 120,
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
    // {
    //   field: 'percentage',
    //   headerName: 'Percentage',
    //   width: 120,
    //   type: 'number',
    //   valueGetter: (value) => {
    //     return `${value}%`;
    //   }
    // },
    // {
    //   field: 'remaining_days',
    //   headerName: 'Months Left',
    //   width: 150,
    //   type: 'number',
    //   valueGetter: (value) => {
    //     return value//30
    //   }
    // },
  ];

  const rows = data.map((row, index) => ({
    id: index,
    ...row,
    percentage: row.target ? (row.cumulativerecruited / row.target).toPrecision(2) * 100 : 0,
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
        Recruitment Details ({endDate.toLocaleString('default', { month: 'long' })})
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