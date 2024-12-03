import React from 'react';
import { Grid, Card, CardContent, Typography } from '@mui/material';

const SummaryCards = ({ data }) => (
  <Grid container spacing={2}>
    {data.map(({ title, value }, idx) => (
      <Grid item xs={12} sm={6} md={3} key={idx}>
        <Card>
          <CardContent>
            <Typography variant="h6">{title}</Typography>
            <Typography variant="h4">{value}</Typography>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

export default SummaryCards;
