import React, { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress, CardContent } from '@mui/material';


export const renderSummaryCards = (summaryData) => {
    const totalPatients = summaryData.patient.reduce((sum, p) => sum + parseInt(p, 10), 0);
    const totalDuration = summaryData.duration.reduce((sum, d) => sum + parseFloat(d), 0);
    const totalSessions = summaryData.session.reduce((sum, s) => sum + parseInt(s, 10), 0);
    const ppgDurations = summaryData.datatype
      .map((type, index) => (type === 'PPG' ? parseFloat(summaryData.duration[index]) : 0))
      .filter((d) => d > 0);
    const ecgDurations = summaryData.datatype
      .map((type, index) => (type === 'ECG' ? parseFloat(summaryData.duration[index]) : 0))
      .filter((d) => d > 0);
    const gyroDurations = summaryData.datatype
      .map((type, index) => (type === 'Gyro' ? parseFloat(summaryData.duration[index]) : 0))
      .filter((d) => d > 0);
    const avgPPGDuration = ppgDurations.length > 0 ? (ppgDurations.reduce((a, b) => a + b, 0) / ppgDurations.length).toFixed(2) : 0;
    const avgECGDuration = ecgDurations.length > 0 ? (ecgDurations.reduce((a, b) => a + b, 0) / ecgDurations.length).toFixed(2) : 0;
    const avgGyroDuration = gyroDurations.length > 0 ? (gyroDurations.reduce((a, b) => a + b, 0) / gyroDurations.length).toFixed(2) : 0;

    const cards = [
      { title: 'Total Patients', value: totalPatients, color: { 50: '#e8f5e9', 700: '#388e3c', 800: '#1b5e20' } },
      { title: 'Total Duration', value: `${totalDuration.toFixed(2)} mins`, color: { 50: '#e3f2fd', 700: '#1976d2', 800: '#0d47a1' } },
      { title: 'Total Sessions', value: totalSessions, color: { 50: '#ffebee', 700: '#d32f2f', 800: '#b71c1c' } },
      { title: 'Average PPG Duration', value: `${avgPPGDuration} mins`, color: { 50: '#ede7f6', 700: '#673ab7', 800: '#311b92' } },
      { title: 'Average ECG Duration', value: `${avgECGDuration} mins`, color: { 50: '#fff8e1', 700: '#f57c00', 800: '#e65100' } },
      { title: 'Average Gyro Duration', value: `${avgGyroDuration} mins`, color: { 50: '#e1f5fe', 700: '#0288d1', 800: '#01579b' } },
    ];

    return (
      <Grid container spacing={2}>
        {cards.map((card, idx) => (
          <Grid item xs={12} md={6} key={idx}>
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