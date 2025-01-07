import React, { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress, CardContent } from '@mui/material';


export const renderSummaryCards = (summaryData) => {
    const formatDuration = (minutes) => {
      if (minutes >= (1440 * 10)) { // Greater than or equal to 10 days (1440 * 10)
        return `${(minutes / 1440).toFixed(2)} days`;
      } else if (minutes >= 180) { // Greater than or equal to 3 hours (60 * 3)
        return `${(minutes / 60).toFixed(2)} hours`;
      } else {
        return `${minutes.toFixed(2)} mins`;
      }
      // if (minutes >= 180) { // Greater than or equal to 3 hours (60 * 3)
      //   return `${(minutes / 60).toFixed(2)} hours`;
      // } else {
      //   return `${minutes.toFixed(2)} mins`;
      // }
    };
    
    // const totalPatients = summaryData.patient.reduce((sum, p) => sum + parseInt(p, 10), 0);
    // const totalDuration = summaryData.duration.reduce((sum, d) => sum + parseFloat(d), 0);
    // const totalSessions = summaryData.session.reduce((sum, s) => sum + parseInt(s, 10), 0);
    
    // const ppgDurations = summaryData.datatype
    //   .map((type, index) => (type === 'PPG' ? parseFloat(summaryData.duration[index]) : 0))
    //   .filter((d) => d > 0);
    
    // const ecgDurations = summaryData.datatype
    //   .map((type, index) => (type === 'ECG' ? parseFloat(summaryData.duration[index]) : 0))
    //   .filter((d) => d > 0);
    
    // const gyroDurations = summaryData.datatype
    //   .map((type, index) => (type === 'Gyro' ? parseFloat(summaryData.duration[index]) : 0))
    //   .filter((d) => d > 0);
    
    // const avgPPGDuration = ppgDurations.length > 0
    //   ? formatDuration(ppgDurations.reduce((a, b) => a + b, 0) / ppgDurations.length)
    //   : '0 mins';
    
    // const avgECGDuration = ecgDurations.length > 0
    //   ? formatDuration(ecgDurations.reduce((a, b) => a + b, 0) / ecgDurations.length)
    //   : '0 mins';
    
    // const avgGyroDuration = gyroDurations.length > 0
    //   ? formatDuration(gyroDurations.reduce((a, b) => a + b, 0) / gyroDurations.length)
    //   : '0 mins';
    
    // const cards = [
    //   // TODO: SUM each datatype (ecg, ppg, gyro)
    //   // { title: 'Total Patients', value: totalPatients, color: { 50: '#e8f5e9', 700: '#388e3c', 800: '#1b5e20' } },
    //   // { title: 'Total Duration', value: formatDuration(totalDuration), color: { 50: '#e3f2fd', 700: '#1976d2', 800: '#0d47a1' } }, // TODO: Each DataType
    //   // { title: 'Total Sessions', value: totalSessions, color: { 50: '#ffebee', 700: '#d32f2f', 800: '#b71c1c' } },
    //   { title: 'Average PPG Duration', value: avgPPGDuration, color: { 50: '#ede7f6', 700: '#673ab7', 800: '#311b92' } },
    //   { title: 'Average ECG Duration', value: avgECGDuration, color: { 50: '#fff8e1', 700: '#f57c00', 800: '#e65100' } },
    //   { title: 'Average Gyro Duration', value: avgGyroDuration, color: { 50: '#e1f5fe', 700: '#0288d1', 800: '#01579b' } },
    // ];
    // Calculating total duration for each datatype
  const totalPPGDuration = summaryData.datatype
  .map((type, index) => (type === 'PPG' ? parseFloat(summaryData.duration[index]) : 0))
  .reduce((a, b) => a + b, 0);

  const totalECGDuration = summaryData.datatype
    .map((type, index) => (type === 'ECG' ? parseFloat(summaryData.duration[index]) : 0))
    .reduce((a, b) => a + b, 0);

  const totalGyroDuration = summaryData.datatype
    .map((type, index) => (type === 'Gyro' ? parseFloat(summaryData.duration[index]) : 0))
    .reduce((a, b) => a + b, 0);

  // Calculating average durations
  const avgPPGDuration = totalPPGDuration > 0
    ? formatDuration(totalPPGDuration / summaryData.datatype.filter((type) => type === 'PPG').length)
    : '0 mins';

  const avgECGDuration = totalECGDuration > 0
    ? formatDuration(totalECGDuration / summaryData.datatype.filter((type) => type === 'ECG').length)
    : '0 mins';

  const avgGyroDuration = totalGyroDuration > 0
    ? formatDuration(totalGyroDuration / summaryData.datatype.filter((type) => type === 'Gyro').length)
    : '0 mins';

  // Creating card data
  const cards = [
    { title: 'PPG Duration', value: formatDuration(totalPPGDuration), color: { 50: '#c8e6c9', 700: '#388e3c', 800: '#1b5e20' } },
    { title: 'ECG Duration', value: formatDuration(totalECGDuration), color: { 50: '#bbdefb', 700: '#1976d2', 800: '#0d47a1' } },
    { title: 'Gyro Duration', value: formatDuration(totalGyroDuration), color: { 50: '#f8bbd0', 700: '#d81b60', 800: '#880e4f' } },
    { title: 'Average PPG', value: avgPPGDuration, color: { 50: '#ede7f6', 700: '#673ab7', 800: '#311b92' } },
    { title: 'Average ECG', value: avgECGDuration, color: { 50: '#fff8e1', 700: '#f57c00', 800: '#e65100' } },
    { title: 'Average Gyro', value: avgGyroDuration, color: { 50: '#e1f5fe', 700: '#0288d1', 800: '#01579b' } },
  ];
  

    return (
      <Grid container spacing={2}>
        {cards.map((card, idx) => (
          <Grid item xs={6} md={2} key={idx}>
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
              <Typography variant="h6" sx={{ mt: 1, fontWeight: 'bold', color: card.color[700] }}>
                {card.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  };