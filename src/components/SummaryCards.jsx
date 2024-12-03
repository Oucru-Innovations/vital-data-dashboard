import React from 'react';
import { Box, Typography } from '@mui/material';

const SummaryCard = ({ title, value, color }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2,
      borderRadius: 2,
      backgroundColor: color[50],
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
      height: 120,
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'scale(1.05)',
        boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.2)',
      },
    }}
  >
    <Typography
      variant="h4"
      sx={{ color: color[700], fontWeight: 'bold', mb: 1 }}
    >
      {value}
    </Typography>
    <Typography
      variant="subtitle1"
      sx={{ color: color[800], textAlign: 'center' }}
    >
      {title}
    </Typography>
  </Box>
);

export default SummaryCard;
