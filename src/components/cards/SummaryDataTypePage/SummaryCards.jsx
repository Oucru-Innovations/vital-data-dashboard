import React, { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress, CardContent } from '@mui/material';


export const renderSummaryCards = (summaryData) => {
    const formatDuration = (hours) => {
      const minutes = hours * 60;
      if (minutes >= (1440 * 10)) { // Greater than or equal to 10 days (1440 * 10)
        return `${(minutes / 1440).toFixed(2)} days`;
      } else if (minutes >= 180) { // Greater than or equal to 3 hours (60 * 3)
        return `${(minutes / 60).toFixed(2)} hours`;
      } else {
        return `${minutes.toFixed(2)} hours`;
      }
      // if (minutes >= 180) { // Greater than or equal to 3 hours (60 * 3)
      //   return `${(minutes / 60).toFixed(2)} hours`;
      // } else {
      //   return `${minutes.toFixed(2)} hours`;
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
    //   : '0 hours';
    
    // const avgECGDuration = ecgDurations.length > 0
    //   ? formatDuration(ecgDurations.reduce((a, b) => a + b, 0) / ecgDurations.length)
    //   : '0 hours';
    
    // const avgGyroDuration = gyroDurations.length > 0
    //   ? formatDuration(gyroDurations.reduce((a, b) => a + b, 0) / gyroDurations.length)
    //   : '0 hours';
    
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
    .map((type, index) =>
      type === 'PPG'
        ? parseFloat(summaryData.duration[index] || 0) // Default to 0 if value is null/undefined
        : 0
    )
    .reduce((a, b) => a + b, 0);

    const totalECGDuration = summaryData.datatype
      .map((type, index) =>
        type === 'ECG'
          ? parseFloat(summaryData.duration[index] || 0) // Default to 0 if value is null/undefined
          : 0
      )
      .reduce((a, b) => a + b, 0);

    const totalGyroDuration = summaryData.datatype
      .map((type, index) =>
          type === 'Gyro'
            ? parseFloat(summaryData.duration[index] || 0) // Default to 0 if value is null/undefined
            : 0
      )
      .reduce((a, b) => a + b, 0);

    const totalUltrasoundSession = summaryData.datatype
      .map((type, index) =>
        type === 'Ultrasound'
          ? parseFloat(summaryData.session[index] || 0) // Default to 0 if value is null/undefined
          : 0
      )
      .reduce((a, b) => a + b, 0);

    const totalMRISession = summaryData.datatype
      .map((type, index) =>
        type === 'MRI'
          ? parseFloat(summaryData.session[index] || 0) // Default to 0 if value is null/undefined
          : 0
      )
      .reduce((a, b) => a + b, 0);
  
    const totalImageSession = summaryData.datatype
        .map((type, index) =>
          type === 'Image'
            ? parseFloat(summaryData.session[index] || 0) // Default to 0 if value is null/undefined
            : 0
        )
        .reduce((a, b) => a + b, 0);

    // Calculating total patients for each datatype
    const totalPPGPatients = summaryData.datatype
    .map((type, index) =>
      type === 'PPG' ? parseInt(summaryData.patient[index] || 0, 10) : 0
    )
    .reduce((a, b) => a + b, 0);

    const totalECGPatients = summaryData.datatype
    .map((type, index) =>
      type === 'ECG' ? parseInt(summaryData.patient[index] || 0, 10) : 0
    )
    .reduce((a, b) => a + b, 0);

    const totalGyroPatients = summaryData.datatype
    .map((type, index) =>
      type === 'Gyro' ? parseInt(summaryData.patient[index] || 0, 10) : 0
    )
    .reduce((a, b) => a + b, 0);

    // Calculating average durations per patient
    const avgPPGDurationPerPatient = totalPPGPatients > 0
    ? formatDuration(totalPPGDuration / totalPPGPatients)+'/patient'
    : '0 hours';

    const avgECGDurationPerPatient = totalECGPatients > 0
    ? formatDuration(totalECGDuration / totalECGPatients)+'/patient'
    : '0 hours';

    const avgGyroDurationPerPatient = totalGyroPatients > 0
    ? formatDuration(totalGyroDuration / totalGyroPatients)+'/patient'
    : '0 hours';

    // Creating card data
    const cards = [
      { title: 'PPG Duration', value: formatDuration(totalPPGDuration), color: { 50: '#c8e6c9', 700: '#388e3c', 800: '#1b5e20' } },
      { title: 'ECG Duration', value: formatDuration(totalECGDuration), color: { 50: '#bbdefb', 700: '#1976d2', 800: '#0d47a1' } },
      { title: 'Gyro Duration', value: formatDuration(totalGyroDuration), color: { 50: '#f8bbd0', 700: '#d81b60', 800: '#880e4f' } },
      { title: 'PPG Duration per Patient', value: avgPPGDurationPerPatient, color: { 50: '#ede7f6', 700: '#673ab7', 800: '#311b92' } },
      { title: 'ECG Duration per Patient', value: avgECGDurationPerPatient, color: { 50: '#fff8e1', 700: '#f57c00', 800: '#e65100' } },
      { title: 'Gyro Duration per Patient', value: avgGyroDurationPerPatient, color: { 50: '#e1f5fe', 700: '#0288d1', 800: '#01579b' } },
      { title: 'Ultrasound Session', value: totalUltrasoundSession, color: { 50: '#ffecb3', 700: '#ffa726', 800: '#ff6f00' } }, 
      { title: 'MRI Session', value: totalMRISession, color: { 50: '#dcedc8', 700: '#689f38', 800: '#33691e' } }, 
      { title: 'Image Document', value: totalImageSession, color: { 50: '#e0f7fa', 700: '#00acc1', 800: '#006064' } }, 
    ];
  

    return (
      <Grid container spacing={2}>
        {cards.map((card, idx) => (
          <Grid item xs={4} md={4} key={idx}>
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