import React from 'react';
import { Box, Paper, Typography, Chip, CircularProgress } from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';

const MonthlyRecruitmentCard = ({ month, totalRecruited, change, loading }) => {
  const calculateChange = (current, previous) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 2,
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'scale(1.02)',
        },
      }}
    >
      <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
        {month || 'Loading...'}
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress size={24} sx={{ mb: 1 }} />
          <Typography variant="h4" sx={{ opacity: 0.5 }}>
            --
          </Typography>
          <Chip
            label="--%"
            color="default"
            sx={{
              bgcolor: 'grey.100',
              color: 'grey.700',
            }}
          />
        </Box>
      ) : (
        <>
          <Typography variant="h4" sx={{ mb: 1 }}>
            {totalRecruited}
          </Typography>
          <Chip
            label={`${change}%`}
            color={change >= 0 ? 'success' : 'error'}
            icon={change >= 0 ? <ArrowUpward /> : <ArrowDownward />}
            sx={{
              bgcolor: change >= 0 ? 'success.light' : 'error.light',
              color: change >= 0 ? 'success.main' : 'error.main',
            }}
          />
        </>
      )}
    </Paper>
  );
};

export default MonthlyRecruitmentCard;
