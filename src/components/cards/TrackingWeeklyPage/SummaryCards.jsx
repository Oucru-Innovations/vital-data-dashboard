import React from 'react';
import { Grid, Card, CardContent, Typography } from '@mui/material';

export const renderSummaryCards = (recruitmentData) => (
  <Grid container spacing={3}>
    <Grid item xs={12} sm={6} md={3}>
      <Card sx={{ 
        bgcolor: '#bbdefb', 
        boxShadow: 3,
        '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.3s ease-in-out' }
      }}>
        <CardContent>
          <Typography color="primary.dark" gutterBottom>
            Total Enrollment Target
          </Typography>
          <Typography variant="h4" color="primary.dark">
            {recruitmentData.totalTargets}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <Card sx={{ 
        bgcolor: '#c8e6c9', 
        boxShadow: 3,
        '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.3s ease-in-out' }
      }}>
        <CardContent>
          <Typography color="success.dark" gutterBottom>
            Current Enrolled
          </Typography>
          <Typography variant="h4" color="success.dark">
            {recruitmentData.currentEnrolled}
          </Typography>
          <Typography variant="body2" color="success.dark">
            {recruitmentData.recruitmentRate.toFixed(1)}% of target
          </Typography>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <Card sx={{ 
        bgcolor: '#fff3e0', 
        boxShadow: 3,
        '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.3s ease-in-out' }
      }}>
        <CardContent>
          <Typography color="warning.dark" gutterBottom>
            Active Patients
          </Typography>
          <Typography variant="h4" color="warning.dark">
            {recruitmentData.activePatients}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <Card sx={{ 
        bgcolor: '#e8eaf6', 
        boxShadow: 3,
        '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.3s ease-in-out' }
      }}>
        <CardContent>
          <Typography color="info.dark" gutterBottom>
            Retention Rate
          </Typography>
          <Typography variant="h4" color="info.dark">
            {recruitmentData.retentionRate.toFixed(1)}%
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);
