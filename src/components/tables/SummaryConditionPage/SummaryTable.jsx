import React, { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress, CardContent } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

export const renderSummaryTable = (summaryData) => {
    const columns = [
      // { field: 'datatype', headerName: 'Datatype', flex: 1 },
      { field: 'condition', headerName: 'Condition', flex: 1 },
      { field: 'patient', headerName: 'Patient', flex: 1 },
      { field: 'duration', headerName: 'Duration', flex: 1 },
      { field: 'session', headerName: 'Session', flex: 1 },
    ];

    const rows = summaryData.condition.map((condition, index) => ({
      id: index,
      condition,
      patient: summaryData.patient[index],
      duration: summaryData.duration[index],
      session: summaryData.session[index],
    }));

    return (
      <Paper elevation={3}>
        <Typography variant="h5" gutterBottom style={{ padding: '8px',
            borderRadius: '4px 4px 0 0',
         }}>
          Summary Table
        </Typography>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={5}
          rowsPerPageOptions={[5, 10, 20]}
          disableSelectionOnClick
          sx={{
            '& .MuiDataGrid-root': {
              border: 'none',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solidrgba(201, 205, 216, 0.9)',
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
      </Paper>
    );
  };
