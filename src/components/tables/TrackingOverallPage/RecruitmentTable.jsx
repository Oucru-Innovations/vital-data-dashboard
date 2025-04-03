import React from 'react';
import { DataGrid, useGridApiRef } from '@mui/x-data-grid';
import { Box, Typography, Paper } from '@mui/material';

const RecruitmentTable = ({ data }) => {
  const apiRef = useGridApiRef();
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const columns = [
    {
      field: 'study',
      headerName: 'Study',
      width: 150,
    },
    {
      field: 'month',
      headerName: 'Month',
      width: 120,
    },
    {
      field: 'recruitednumber',
      headerName: 'Recruited',
      width: 120,
      type: 'number',
    },
    {
      field: 'cumulativerecruited',
      headerName: 'Total Recruited',
      width: 150,
      type: 'number',
    },
    {
      field: 'percentage',
      headerName: 'Percentage',
      width: 120,
      valueGetter: (params) => { return '0%';
        // const total = parseInt(params.row.cumulative_recruited);
        // const current = parseInt(params.row.recruited_number);
        // return total > 0 ? ((current / total) * 100).toFixed(1) + '%' : '0%';
      }
    },
    {
      field: 'monthremain',
      headerName: 'Months Left',
      width: 150,
      type: 'number',
    },
  ];

  const rows = data.map((row, index) => ({
    id: index,
    ...row,
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
        Recruitment Details ({currentMonth})
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
            '& .MuiDataGrid-virtualScroller': {
              backgroundColor: '#f9f9f9',
            },
            '& .MuiDataGrid-row': {
              cursor: 'default',
            },
          }}
        />
      </Box>
    </Paper>
  );
};

export default RecruitmentTable;
