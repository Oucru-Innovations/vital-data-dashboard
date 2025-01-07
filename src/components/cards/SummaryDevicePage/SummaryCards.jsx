import React from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';

export const renderSummaryCards = (summaryData) => {
  const formatDuration = (minutes) => {
    if (minutes >= 14400) { // Greater than or equal to 1 day
      return `${(minutes / 1440).toFixed(2)} days`;
    } else if (minutes >= 60) { // Greater than or equal to 1 hour
      return `${(minutes / 60).toFixed(2)} hours`;
    } else {
      return `${minutes.toFixed(2)} mins`;
    }
  };

  const totalPatients = summaryData.patient.reduce((sum, p) => sum + parseInt(p, 10), 0);
  const totalDuration = summaryData.duration.reduce((sum, d) => sum + parseFloat(d), 0);
  const totalSessions = summaryData.session.reduce((sum, s) => sum + parseInt(s, 10), 0);

  // Calculating averages
  const avgDurationPerPatient = totalPatients > 0 ? totalDuration / totalPatients : 0;
  const avgSessionPerPatient = totalPatients > 0 ? totalSessions / totalPatients : 0;

  // Creating card data
  const cards = [
    { title: 'Total Duration', value: formatDuration(totalDuration), color: { 50: '#e3f2fd', 700: '#1976d2', 800: '#0d47a1' } },
    { title: 'Total Sessions', value: totalSessions, color: { 50: '#ffebee', 700: '#d32f2f', 800: '#b71c1c' } },
    { title: 'Duration per Patient', value: formatDuration(avgDurationPerPatient), color: { 50: '#ede7f6', 700: '#673ab7', 800: '#311b92' } },
    { title: 'Sessions per Patient', value: avgSessionPerPatient.toFixed(2), color: { 50: '#fff8e1', 700: '#f57c00', 800: '#e65100' } },
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((card, idx) => (
        <Grid item xs={12} md={3} key={idx}>
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
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: card.color[800] }}>
              {card.title}
            </Typography>
            <Typography variant="h5" sx={{ mt: 1, fontWeight: 'bold', color: card.color[700] }}>
              {card.value}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};
