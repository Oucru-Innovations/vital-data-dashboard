import React from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

const FileTable = ({ data }) => {
  // Define columns for the DataGrid
  const columns = [
    { field: 'study', headerName: 'Study', flex: 1 },
    { field: 'fileType', headerName: 'File Type', flex: 1 },
    { field: 'fileName', headerName: 'File Name', flex: 2 },
    {
      field: 'fileSize',
      headerName: 'File Size (MB)',
      flex: 1,
      type: 'number',
      sortable: true,
    },
    {
      field: 'duration',
      headerName: 'Duration (Minutes)',
      flex: 1,
      type: 'number',
      sortable: true,
    },
  ];

  // Prepare rows based on the data
  const rows = data.study.map((study, index) => ({
    id: index + 1,
    study,
    fileType: data.fileType[index],
    fileName: data.fileName[index],
    fileSize: data.fileSize[index],
    duration: data.duration[index],
  }));

  return (
    <Box sx={{ height: 400, width: '100%' }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#4CAF50' }}>
        File Details
      </Typography>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={10}
        rowsPerPageOptions={[5, 10, 20]}
        disableSelectionOnClick
        sortingOrder={['asc', 'desc']}
        sx={{
          // boxShadow: 3, // Adds a shadow for a more modern appearance
          // '& .MuiDataGrid-root': {
          //   border: 'none',
          // },
          '& .MuiDataGrid-cell': {
            padding: '10px',
            fontSize: '14px',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f1f1f1', // Lighter header color
            fontWeight: 'bold',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#e0f7fa', // Subtle hover effect
          },
          '& .MuiDataGrid-cell:focus': {
            outline: 'none', // Removing outline on focus for cleaner UI
          },
        }}
      />
    </Box>
  );
};

export default FileTable;
