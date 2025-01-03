import React, { useEffect, useState } from 'react';
import { getSummaryDataByCondition } from '../services/apiService';
import { renderSummaryCards } from '../components/cards/SummaryConditionPage/SummaryCards';
import { renderSummaryTable } from '../components/tables/SummaryConditionPage/SummaryTable';
import { renderGroupedBarChart } from '../components/charts/SummaryConditionPage/GroupedBarChart';
import { renderSunburstChart } from '../components/charts/SummaryConditionPage/SunburstChart';
import { renderTreeMapChart } from '../components/charts/SummaryConditionPage/TreeMapChart';
import { renderStackedAreaChart } from '../components/charts/SummaryConditionPage/StackAreaChart';
import TransitionPlot from '../components/charts/SummaryConditionPage/TransitionPlot';
import { Box, Grid, Typography, CircularProgress, Divider } from '@mui/material';
import Footer from '../components/toolbars/Footer';

const SummaryDataTypePage = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const defaultParams = [
    // { key: 'studies', value: '01NVa_Dengue,06NV,05EI,39EI', equals: true, enabled: true },
    // { key: 'datatypes', value: 'PPG,Gyro,ECG', equals: true, enabled: true },
    { key: 'conditions', value: 'Covid-19,Mpox', enabled: false },
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
      const response = await getSummaryDataByCondition(queryParams);
      let data = typeof response === 'string' ? cleanAndParseJSON(response) : response;
      data = {
        condition: data.condition.filter((d) => d && d.trim()),
        patient: data.patient.filter((p) => p && p.trim()),
        duration: data.duration.filter((d) => d && d.trim()),
        session: data.session.filter((s) => s && s.trim()),
      };
      setSummaryData(data || { condition: [], patient: [], duration: [], session: [] });
    } catch (error) {
      console.error('Error fetching summary data:', error);
      setSummaryData({ condition: [], patient: [], duration: [], session: [] });
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
        Summary by Condition
      </Typography>
      <Divider sx={{ marginBottom: '24px' }} />
      {loading ? (
        <CircularProgress />
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            {renderSummaryTable(summaryData)}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderSummaryCards(summaryData)}
          </Grid>
          <Grid item xs={12} md={6}>
            {/* {renderSunburstChart(summaryData, summaryData.patient, 'Patient Distribution by Conditions')} */}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderGroupedBarChart(summaryData, summaryData.duration, 'Duration Distribution by Conditions')}
          </Grid>
          <Grid item xs={12} md={6}>
            {/* {renderStackedAreaChart(summaryData, summaryData.session, 'Session Distribution by Conditions')} */}
          </Grid>
          <Grid item xs={12} md={6}>
            {/* <TransitionPlot summaryData={summaryData} summaryDataValues={summaryData.session} titleText="Session Distribution" /> */}
          </Grid>
        </Grid>
      )}
      <Footer />
    </Box>
  );
};

export default SummaryDataTypePage;
