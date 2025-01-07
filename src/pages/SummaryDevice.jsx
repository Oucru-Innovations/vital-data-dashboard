import React, { useEffect, useState } from 'react';
import { getSummaryDataByDevice } from '../services/apiService';
import { renderSummaryCards } from '../components/cards/SummaryDevicePage/SummaryCards';
import { renderSummaryTable } from '../components/tables/SummaryDevicePage/SummaryTable';
import { renderGroupedBarChart } from '../components/charts/SummaryDevicePage/GroupedBarChart';
import { renderBarChart } from '../components/charts/SummaryDevicePage/BarChart';
import { renderSunburstChart } from '../components/charts/SummaryDevicePage/SunburstChart';
import { renderTreeMapChart } from '../components/charts/SummaryDevicePage/TreeMapChart';
import { renderStackedAreaChart } from '../components/charts/SummaryDevicePage/StackAreaChart';
import TransitionPlot from '../components/charts/SummaryDevicePage/TransitionPlot';
import { Box, Grid, Typography, CircularProgress, Divider } from '@mui/material';
import Footer from '../components/toolbars/Footer';

const SummaryDevicePage = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const defaultParams = [
    // { key: 'studies', value: '01NVa_Dengue,06NV,05EI,39EI', equals: true, enabled: true },
    // { key: 'datatypes', value: 'PPG,Gyro,ECG', equals: true, enabled: true },
    { key: 'devices', value: 'Covid-19,Mpox', enabled: false },
    // { key: 'devices', value: 'Gyro,SmartCare,Shimmer', enabled: false },
    // { key: 'study', value: '01NVa_Dengue', enabled: false },
    // { key: 'others', value: "datatype='PPG'", equals: true, enabled: false },
  ];

  const constructParams = (params) => {
    return params
      .filter((param) => param.enabled)
      .reduce((query, param) => {
        query[param.key] = param.value;
        return query;
      }, {});
  };

  const cleanAndParseJSON = (rawString) => {
    try {
      let cleanedString = rawString.replace(/\r|\n/g, '').replace(/\\/g, '').replace(/,\s*,/g, ',').replace(/,\s*\]/g, ']').replace(/,\s*\}/g, '}');
      return JSON.parse(cleanedString);
    } catch (error) {
      console.error('Error cleaning/parsing JSON:', error);
      return null;
    }
  };

  const fetchSummaryData = async (queryParams) => {
    try {
      const response = await getSummaryDataByDevice(queryParams);
      let data = typeof response === 'string' ? cleanAndParseJSON(response) : response;
      data = {
        device: data.device.filter((d) => d && d.trim()),
        patient: data.patient.filter((p) => p && p.trim()),
        duration: data.duration.filter((d) => d && d.trim()),
        session: data.session.filter((s) => s && s.trim()),
      };
      // Add the new column averageDuration
      data.durationPerSession = data.duration.map((dur, index) => {
        const sessionCount = parseFloat(data.session[index]) || 1;
        const durationValue = parseFloat(dur) || 0;
        return sessionCount > 0 ? (durationValue / sessionCount).toFixed(2) : 'N/A'; // Handle division by zero
      });
      setSummaryData(data || { device: [], patient: [], duration: [], session: [], durationPerSession: [] });
    } catch (error) {
      console.error('Error fetching summary data:', error);
      setSummaryData({ device: [], patient: [], duration: [], session: [], durationPerSession: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const query = constructParams(defaultParams);
    fetchSummaryData(query);
  }, []);

  return (
    <Box sx={{ padding: '16px' }}>
      <Typography variant="h4" align="center" sx={{ fontWeight: 'bold', marginBottom: '16px' }}>
        Summary by Device
      </Typography>
      <Divider sx={{ marginBottom: '24px' }} />
      {loading ? (
        <CircularProgress />
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {renderSummaryTable(summaryData)}
          </Grid>
          <Grid item xs={6} md={12}>
            {renderSummaryCards(summaryData)}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderSunburstChart(summaryData, summaryData.patient, 'Patient Distribution by Devices')}
          </Grid>
          <Grid item xs={12} md={6}>
            <TransitionPlot summaryData={summaryData} summaryDataValues={summaryData.session} titleText="Session Distribution" />
          </Grid>
          <Grid item xs={12} md={6}>
            {renderBarChart(summaryData, summaryData.duration, 'Duration Distribution by Devices')}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderBarChart(summaryData, summaryData.durationPerSession, 'Duration Per Session Distribution by Devices')}
          </Grid>
          {/* <Grid item xs={12} md={6}>
            {renderStackedAreaChart(summaryData, 'Session Distribution by Devices')}
          </Grid> */}
          
        </Grid>
      )}
      <Footer />
    </Box>
  );
};

export default SummaryDevicePage;
