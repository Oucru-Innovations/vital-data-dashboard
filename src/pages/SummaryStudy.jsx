import React, { useEffect, useState } from 'react';
import { getSummaryDataByStudy } from '../services/apiService';
import { renderSummaryCards } from '../components/cards/SummaryStudyPage/SummaryCards';
import SummaryTable from '../components/tables/SummaryStudyPage/SummaryTable';
import TransitionPlot from '../components/charts/SummaryStudyPage/TransitionPlot';
import { Box, Grid, Typography, CircularProgress, Divider } from '@mui/material';
import Footer from '../components/toolbars/Footer';

const SummaryStudyPage = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const defaultParams = [
    // { key: 'studies', value: '01NVa_Dengue,06NV,05EI,39EI', equals: true, enabled: false },
    // { key: 'datatypes', value: 'PPG,Gyro,ECG', equals: true, enabled: false },
    // { key: 'conditions', value: 'Covid-19,Mpox', enabled: false },
    // { key: 'conditions', value: 'Gyro,SmartCare,Shimmer', enabled: false },
    { key: 'study', value: '01NVa_Dengue', enabled: false },
    {key: 'others', value: "s.name<>'01NVe'", equals: true, enabled: true}
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
      // Step 1: Remove \r and \n
      let cleanedString = rawString.replace(/\r|\n/g, '');
  
      // Step 2: Add a missing comma between objects or arrays
      cleanedString = cleanedString.replace(/}(\s*)"/g, '},$1"').replace(/](\s*)"/g, '],$1"');
  
      // Step 3: Remove trailing commas before closing brackets
      cleanedString = cleanedString.replace(/,\s*([}\]])/g, '$1');
  
      // Step 4: Parse the cleaned JSON string
      return JSON.parse(cleanedString);
    } catch (error) {
      console.error('Error cleaning/parsing JSON:', error);
      return null; // Return null if parsing fails
    }
  };
  

  const fetchSummaryData = async (queryParams) => {
    try {
      const response = await getSummaryDataByStudy(queryParams);
      let data = typeof response === 'string' ? cleanAndParseJSON(response) : response;
  
      // Sanitize and validate the data
      data = {
        study: data.study.filter((d) => (d && d.trim() ? d.trim() : "")),
        patient: data.patient.filter((p) => (p && p.trim() ? p.trim() : "0")),
        title: data.title.filter((t) => (t && t.trim() ? t.trim() : "")),
        description: data.description.filter((d) => (d && d.trim() ? d.trim() : "")),
        site: data.site.map((siteArray) =>
          siteArray
            .filter((s) => ((s && s.trim() ?  s.trim() : "")))
            .join(', ') // Combine site entries into a single string (e.g., "HTD, NHTD")
        ),
        session: data.session.filter((s) => (s && s.trim() ? s.trim() : "0")),
      };
  
      // Set state with sanitized data
      setSummaryData(
        data || { study: [], patient: [], title: [], description: [], site: [], session: [] }
      );
    } catch (error) {
      console.error('Error fetching summary data:', error);
      setSummaryData({ study: [], patient: [], title: [], description: [], site: [], session: [] });
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
        Summary by Study
      </Typography>
      <Divider sx={{ marginBottom: '24px' }} />
      {loading ? (
        <CircularProgress />
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={12}>
            {/* {renderSummaryTable(summaryData)} */}
            <SummaryTable summaryData={summaryData} />
          </Grid>
          <Grid item xs={12} md={12}>
            {renderSummaryCards(summaryData)}
          </Grid>
          <Grid item xs={12} md={6}>
            {/* {renderSunburstChart(summaryData, summaryData.patient, 'Patient Distribution by Studys')} */}
            <TransitionPlot summaryData={summaryData} summaryDataValues={summaryData.patient} titleText="Patient Distribution" />
          </Grid>
          {/* <Grid item xs={12} md={6}>
            {renderGroupedBarChart(summaryData, 'Duration Distribution by Studys')}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderStackedAreaChart(summaryData, 'Session Distribution by Studys')}
          </Grid> */}
          <Grid item xs={12} md={6}>
            <TransitionPlot summaryData={summaryData} summaryDataValues={summaryData.session} titleText="Session Distribution" />
          </Grid>
        </Grid>
      )}
      <Footer />
    </Box>
  );
};

export default SummaryStudyPage;
