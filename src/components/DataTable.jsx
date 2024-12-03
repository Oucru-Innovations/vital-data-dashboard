import React from 'react';
import { Box, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

const FileTable = ({ data }) => {
  // Define columns for the DataGrid
  const columns = [
    { field: 'Study', headerName: 'Study', flex: 1 },
    { field: 'FileType', headerName: 'File Type', flex: 1 },
    { field: 'FileName', headerName: 'File Name', flex: 2 },
    {
      field: 'FileSize',
      headerName: 'File Size (MB)',
      flex: 1,
      type: 'number',
      sortable: true,
    },
    {
      field: 'Duration',
      headerName: 'Duration (Minutes)',
      flex: 1,
      type: 'number',
      sortable: true,
    },
  ];

  return (
    <Box sx={{ height: 400, width: '100%' }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        File Details
      </Typography>
      <DataGrid
        rows={data} // Pass the data as rows
        columns={columns}
        pageSize={10}
        rowsPerPageOptions={[5, 10, 20]}
        disableSelectionOnClick
        sortingOrder={['asc', 'desc']}
      />
    </Box>
  );
};

export default FileTable;
