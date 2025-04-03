import React, { useEffect, useState } from 'react';
import { getSummaryDataByDevice, getUniquePatients } from '../../services/apiService';
import { renderSummaryCards } from '../../components/cards/SummaryDevicePage/SummaryCards';
import SummaryTable from '../../components/tables/SummaryDevicePage/SummaryTable';
import { renderBarChart } from '../../components/charts/SummaryDevicePage/BarChart';
import TransitionPlot from '../../components/charts/SummaryDevicePage/TransitionPlot';
import { Box, Grid, Typography, CircularProgress, Divider, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Footer from '../../components/toolbars/Footer';

const SummaryDevicePage = () => {
  const [summaryData, setSummaryData] = useState({ device: [], patient: [], duration: [], session: [], durationPerSession: [] });
  const [uniquePatientData, setUniquePatientData] = useState({ study: [], patient: [] });
  const [loading, setLoading] = useState(true);

  const defaultParams = [
    { key: 'devices', value: 'Covid-19,Mpox', enabled: false },
    { key: 'others', value: "s.name<>'01NVe'", equals: true, enabled: true },
  ];

  const constructParams = (params) =>
    params
      .filter((param) => param.enabled)
      .reduce((query, param) => {
        query[param.key] = param.value;
        return query;
      }, {});

  const cleanAndParseJSON = (rawString) => {
    try {
      const cleanedString = rawString
        .replace(/\r|\n/g, '')
        .replace(/\\/g, '')
        .replace(/,\s*,/g, ',')
        .replace(/,\s*\]/g, ']')
        .replace(/,\s*\}/g, '}');
      return JSON.parse(cleanedString);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return null;
    }
  };

  const processSummaryData = (data) => ({
    device: data.device.map((d) => d?.trim() || ''),
    patient: data.patient.map((p) => p?.trim() || '0'),
    duration: data.duration.map((d) => d?.trim() || '0'),
    session: data.session.map((s) => s?.trim() || '0'),
    durationPerSession: data.duration.map((dur, index) => {
      const sessionCount = parseFloat(data.session[index]) || 1;
      const durationValue = parseFloat(dur) || 0;
      return sessionCount > 0 ? (durationValue / sessionCount).toFixed(2) : 'N/A';
    }),
  });

  const fetchData = async () => {
    setLoading(true);
    const query = constructParams(defaultParams);

    try {
      const [summaryResponse, uniquePatientsResponse] = await Promise.all([
        getSummaryDataByDevice(query),
        getUniquePatients(query),
      ]);

      const summaryRawData = typeof summaryResponse === 'string' ? cleanAndParseJSON(summaryResponse) : summaryResponse;
      const uniquePatientsRawData = typeof uniquePatientsResponse === 'string' ? cleanAndParseJSON(uniquePatientsResponse) : uniquePatientsResponse;

      setSummaryData(processSummaryData(summaryRawData || { device: [], patient: [], duration: [], session: [] }));
      setUniquePatientData({
        study: uniquePatientsRawData.study?.map((d) => d?.trim() || '') || [],
        patient: uniquePatientsRawData.patient?.map((p) => p?.trim() || '0') || [],
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
          
          <Grid item xs={6} md={12}>
            {renderSummaryCards(summaryData, uniquePatientData)}
          </Grid>
          <Grid item xs={12} md={6}>
            <TransitionPlot summaryData={summaryData} summaryDataValues={summaryData.patient} titleText="Patient Distribution by Devices" />
          </Grid>
          <Grid item xs={12} md={6}>
            <TransitionPlot summaryData={summaryData} summaryDataValues={summaryData.session} titleText="Devices Session Distribution" />
          </Grid>
          <Grid item xs={12} md={6}>
            {renderBarChart(summaryData, summaryData.duration, 'Duration Distribution by Devices')}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderBarChart(summaryData, summaryData.durationPerSession, 'Duration Per Session Distribution by Devices')}
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

export default SummaryDevicePage;
