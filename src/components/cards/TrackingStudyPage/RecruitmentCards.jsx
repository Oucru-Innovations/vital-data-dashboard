import React from 'react';
import { Box, Grid, Paper, Typography, CircularProgress, CardContent } from '@mui/material';

export const renderRecruitmentCards = (recruitmentData) => {
  const cards = [
    {
      title: 'Total Recruited',
      value: recruitmentData.totalRecruited,
      color: { 50: '#e8f5e9', 700: '#388e3c', 800: '#1b5e20' }
    },
    {
      title: 'Active Patients',
      value: recruitmentData.activePatients,
      color: { 50: '#e3f2fd', 700: '#1976d2', 800: '#0d47a1' }
    },
    {
      title: 'Completed Patients',
      value: recruitmentData.completedPatients,
      color: { 50: '#ffebee', 700: '#d32f2f', 800: '#b71c1c' }
    },
    {
      title: 'Dropped Patients',
      value: recruitmentData.droppedPatients,
      color: { 50: '#e1f5fe', 700: '#0288d1', 800: '#01579b' }
    }
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((card, idx) => (
        <Grid item xs={4} md={3} key={idx}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: card.color[50],
              border: `2px solid ${card.color[700]}`,
              borderRadius: 2,
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
          >
            <Box sx={{ mb: 2, color: card.color[800] }}>
              {/* Icons can be added here */}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: card.color[800] }}>
              {card.title}
            </Typography>
            <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold', color: card.color[700] }}>
              {card.value}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};
