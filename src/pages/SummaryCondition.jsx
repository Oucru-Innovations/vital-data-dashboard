import React, { useEffect, useState } from 'react';
import { getSummaryDataByCondition } from '../services/apiService';
import { renderSummaryCards } from '../components/cards/SummaryConditionPage/SummaryCards';
import SummaryTable from '../components/tables/SummaryConditionPage/SummaryTable';
import TransitionPlot from '../components/charts/SummaryConditionPage/TransitionPlot';
import { Box, Grid, Typography, CircularProgress, Divider, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Footer from '../components/toolbars/Footer';

const SummaryConditionPage = () => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const defaultParams = [
    { key: 'conditions', value: 'Covid-19,Mpox', enabled: false },
    { key: 'others', value: "s.name<>'01NVe'", equals: true, enabled: true }
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
      const response = await getSummaryDataByCondition(queryParams);
      const data = typeof response === 'string' ? cleanAndParseJSON(response) : response;

      setSummaryData({
        condition: data.condition?.filter((d) => d?.trim()) || [],
        patient: data.patient?.filter((p) => p?.trim()) || [],
        session: data.session?.filter((s) => s?.trim()) || [],
      });
    } catch (error) {
      console.error('Error fetching summary data:', error);
      setSummaryData({ condition: [], patient: [], session: [] });
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
          <Grid item xs={12}>
            {renderSummaryCards(summaryData)}
          </Grid>
          <Grid item xs={12} md={6}>
            <TransitionPlot
              summaryData={summaryData}
              summaryDataValues={summaryData.patient}
              titleText="Patient Distribution"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TransitionPlot
              summaryData={summaryData}
              summaryDataValues={summaryData.session}
              titleText="Session Distribution"
            />
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

export default SummaryConditionPage;
