import React from 'react';
import { DataGrid, useGridApiRef } from '@mui/x-data-grid';
import { Box, Typography, Paper } from '@mui/material';

const SummaryTable = ({ summaryData }) => {
  const apiRef = useGridApiRef();

  const columns = [
    { field: 'datatype', headerName: 'Datatype', flex: 1 },
    { field: 'study', headerName: 'Study', flex: 1 },
    { field: 'patient', headerName: 'Patient', flex: 1, type: 'number' },
    { field: 'duration', headerName: 'Duration', flex: 1 },
    { field: 'session', headerName: 'Session', flex: 1, type: 'number' },
    { field: 'averageDuration', headerName: 'Average Duration', flex: 1, type: 'number'},
  ];

  const rows = summaryData.datatype.map((datatype, index) => ({
    id: index,
    datatype,
    study: summaryData.study[index],
    patient: summaryData.patient[index],
    duration: summaryData.duration[index],
    session: summaryData.session[index],
    averageDuration: summaryData.averageDuration[index],
  }));

  return (
    <Paper elevation={3}>
      <Typography
        variant="h5"
        gutterBottom
        style={{
          padding: '8px',
          borderRadius: '4px 4px 0 0',
        }}
      >
        Summary Table
      </Typography>
      <Box style={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          apiRef={apiRef}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 5 },
            },
          }}
          pageSizeOptions={[5, 10, 25, { value: -1, label: 'All' }]}
          disableSelectionOnClick
          sx={{
            '& .MuiDataGrid-root': {
              border: 'none',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid rgba(201, 205, 216, 0.9)',
              backgroundColor: '#f9f9f9',
              '&:hover': {
                backgroundColor: '#e3f2fd',
              },
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#e1f5fe',
              borderBottom: '2px solid #0288d1',
              fontWeight: 'bold',
              fontSize: '16px',
            },
            '& .MuiDataGrid-footerContainer': {
              backgroundColor: '#e1f5fe',
              borderTop: '2px solid #0288d1',
            },
            '& .MuiDataGrid-row:nth-of-type(even)': {
              backgroundColor: '#f5f5f5',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: '#bbdefb',
            },
          }}
        />
      </Box>
    </Paper>
  );
};

export default SummaryTable;
