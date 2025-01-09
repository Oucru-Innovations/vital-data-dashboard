import React from 'react';
import { DataGrid, useGridApiRef } from '@mui/x-data-grid';
import { Box, Typography, Paper } from '@mui/material';

const SummaryTable = ({ summaryData }) => {
  const apiRef = useGridApiRef();

  const columns = [
    {
      field: 'study',
      headerName: 'Study',
      width: 100,
      // flex: 1,
      headerClassName: 'word-wrap-header',
      cellClassName: 'word-wrap-cell',
    },
    {
      field: 'title',
      headerName: 'Title',
      flex: 1,
      headerClassName: 'word-wrap-header',
      cellClassName: 'word-wrap-cell',
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      headerClassName: 'word-wrap-header',
      cellClassName: 'word-wrap-cell',
    },
    {
      field: 'site',
      headerName: 'Site',
      flex: 1,
      headerClassName: 'word-wrap-header',
      cellClassName: 'word-wrap-cell',
      renderCell: (params) => {
        const value = params.value;
        return value ? value : 'N/A'; // Render the string or 'N/A' if null/undefined
      },
    },
    {
      field: 'patient',
      headerName: 'Patient',
      width: 100,
      type: 'number',
      // flex: 1,
      headerClassName: 'word-wrap-header',
    },
    {
      field: 'session',
      headerName: 'Session',
      width: 100,
      type: 'number',
      // flex: 1,
      headerClassName: 'word-wrap-header',
    },
  ];

  const rows = summaryData.study.map((study, index) => ({
    id: index,
    study,
    patient: summaryData.patient[index],
    session: summaryData.session[index],
    description: summaryData.description[index],
    title: summaryData.title[index],
    site: summaryData.site[index],
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
              whiteSpace: 'normal',
              wordWrap: 'break-word',
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
