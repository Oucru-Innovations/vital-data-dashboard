import React, { useEffect, useState } from 'react';
import { getSummaryDataByDataType } from '../services/apiService';
import { renderSummaryCards } from '../components/cards/SummaryDataTypePage/SummaryCards';
import { renderSummaryTable } from '../components/tables/SummaryDataTypePage/SummaryTable';
import { renderGroupedBarChart } from '../components/charts/SummaryDataTypePage/GroupedBarChart';
import { renderSunburstChart } from '../components/charts/SummaryDataTypePage/SunburstChart';
import { renderTreeMapChart } from '../components/charts/SummaryDataTypePage/TreeMapChart';
import { renderStackedAreaChart } from '../components/charts/SummaryDataTypePage/StackAreaChart';
import { renderRadarChart } from '../components/charts/SummaryDataTypePage/RadarChart';
import { renderChordDiagram } from '../components/charts/SummaryDataTypePage/ChordDiagram';
import { renderTransitionPlot } from '../components/charts/SummaryDataTypePage/TransitionPlot';
import ReactECharts from 'echarts-for-react';
import { Box, Grid, Paper, Typography, CircularProgress, CardContent } from '@mui/material';
import Footer from '../components/toolbars/Footer';

const SummaryDataTypePage = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const defaultParams = [
    { key: "studies", value: "01NVa_Dengue,06NV,05EI,39EI", equals: true, enabled: true },
    { key: "datatypes", value: "PPG,Gyro,ECG", equals: true, enabled: true },
    { key: "conditions", value: "Covid-19,Mpox", enabled: false },
    { key: "devices", value: "Gyro,SmartCare,Shimmer", enabled: false },
    { key: "study", value: "01NVa_Dengue", enabled: false },
    { key: "others", value: "datatype='PPG'", equals: true, enabled: false },
  ];
  const constructParams = (params) => {
    return params
      .filter((param) => param.enabled) // Include only enabled parameters
      .reduce((query, param) => {
        query[param.key] = param.value; // Construct query object
        return query;
      }, {});
  };

  const cleanAndParseJSON = (rawString) => {
    try {
      // Step 1: Remove \r and \n
      let cleanedString = rawString.replace(/\r|\n/g, '');

      // Step 2: Remove backslashes
      cleanedString = cleanedString.replace(/\\/g, '');

      // Step 3: Remove invalid commas
      cleanedString = cleanedString
        .replace(/,\s*,/g, ',') // Remove consecutive commas
        .replace(/,\s*\]/g, ']') // Remove trailing commas inside arrays
        .replace(/,\s*\}/g, '}'); // Remove trailing commas inside objects

      // Step 4: Parse the cleaned JSON string
      return JSON.parse(cleanedString);
    } catch (error) {
      console.error('Error cleaning/parsing JSON:', error);
      return null; // Return null if parsing fails
    }
  };

  const fetchSummaryData = async (queryParams) => {
    try {
      const response = await getSummaryDataByDataType(queryParams);
      let data = typeof response === 'string' ? cleanAndParseJSON(response) : response;

      // Clean the data: Remove invalid entries
      data = {
        datatype: data.datatype.filter((d) => d && d.trim()),
        study: data.study.filter((s) => s && s.trim()),
        patient: data.patient.filter((p) => p && p.trim()),
        duration: data.duration.filter((d) => d && d.trim()),
        session: data.session.filter((s) => s && s.trim()),
      };

      setSummaryData(data || {
        datatype: [],
        study: [],
        patient: [],
        duration: [],
        session: [],
      });
    } catch (error) {
      console.error('Error fetching summary data:', error);
      setSummaryData({
        datatype: [],
        study: [],
        patient: [],
        duration: [],
        session: [],
      });
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
            {renderSunburstChart(summaryData, summaryData.patient)}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderGroupedBarChart(summaryData)}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderSunburstChart(summaryData, summaryData.session)}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderStackedAreaChart(summaryData)}
          </Grid>
        </Grid>
      )}
      <Footer />
    </Box>
  );
};

export default SummaryDataTypePage;
