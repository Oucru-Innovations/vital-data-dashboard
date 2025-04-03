import React, { useEffect, useState } from 'react';
import { getSummaryDataByDataType } from '../../services/apiService';
import { renderSummaryCards } from '../../components/cards/SummaryDataTypePage/SummaryCards';
import SummaryTable from '../../components/tables/SummaryDataTypePage/SummaryTable';
import { renderGroupedBarChart } from '../../components/charts/SummaryDataTypePage/GroupedBarChart';
import TransitionPlot from '../../components/charts/SummaryDataTypePage/TransitionPlot';
import { Box, Grid, Typography, CircularProgress, Divider, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Footer from '../../components/toolbars/Footer';

const SummaryDataTypePage = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const defaultParams = [
    { key: 'studies', value: '', equals: true, enabled: false },
    { key: 'datatypes', value: '', equals: true, enabled: false },
    { key: 'conditions', value: '', enabled: false },
    { key: 'devices', value: '', enabled: false },
    { key: 'study', value: '', enabled: false },
    { key: 'others', value: "s.name<>'01NVe'", equals: true, enabled: false },
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
      const cleanedString = rawString
        .replace(/\r|\n/g, '')
        .replace(/,\s*,/g, ',')
        .replace(/,\s*\]/g, ']')
        .replace(/,\s*\}/g, '}');
      return JSON.parse(cleanedString);
    } catch (error) {
      console.error('Error cleaning/parsing JSON:', error);
      return null;
    }
  };

  const fetchSummaryData = async (queryParams) => {
    try {
      const response = await getSummaryDataByDataType(queryParams);
      const data = typeof response === 'string' ? cleanAndParseJSON(response) : response;

      setSummaryData({
        datatype: data.datatype?.map((d) => d?.trim() || '') || [],
        study: data.study?.map((s) => s?.trim() || '') || [],
        patient: data.patient?.map((p) => p?.trim() || '0') || [],
        duration: data.duration?.map((d) => d?.trim() || '0') || [],
        session: data.session?.map((s) => s?.trim() || '0') || [],
        averageDuration: data.duration?.map((dur, index) => {
          const sessionCount = parseFloat(data.session[index]) || 1;
          const durationValue = parseFloat(dur) || 0;
          return sessionCount > 0 ? (durationValue / sessionCount).toFixed(2) : 'N/A';
        }) || [],
      });
    } catch (error) {
      console.error('Error fetching summary data:', error);
      setSummaryData({ datatype: [], study: [], patient: [], duration: [], session: [], averageDuration: [] });
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
        Summary by Data Type
      </Typography>
      <Divider sx={{ marginBottom: '24px' }} />
      {loading ? (
        <CircularProgress />
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {renderSummaryCards(summaryData)}
          </Grid>
          <Grid item xs={12} md={6}>
            <TransitionPlot summaryData={summaryData} summaryDataValues={summaryData.patient} titleText="Patient Distribution" />
          </Grid>
          <Grid item xs={12} md={6}>
            <TransitionPlot summaryData={summaryData} summaryDataValues={summaryData.session} titleText="Session Distribution" />
          </Grid>
          <Grid item xs={12} md={6}>
            {renderGroupedBarChart(summaryData, summaryData.duration, 'Duration Distribution by Data Types and Studies')}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderGroupedBarChart(summaryData, summaryData.averageDuration, 'Average Duration Distribution by Data Types and Studies')}
          </Grid>
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="summary-table-content"
                id="summary-table-header"
                sx={{
                  backgroundColor: '#e1f5fe',
                  borderBottom: '2px solid #0288d1',
                  fontWeight: 'bold',
                }}
              >
                <Typography>Summary Table</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <SummaryTable summaryData={summaryData} />
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      )}
      <Footer />
    </Box>
  );
};

export default SummaryDataTypePage;
